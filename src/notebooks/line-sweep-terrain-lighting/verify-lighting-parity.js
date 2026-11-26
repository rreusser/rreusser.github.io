// Gate 13 of LIGHTING-DESIGN.md: the WGSL irradiance model agrees with
// the JS reference to within 1/255.
//
// This one needs a device, so unlike the other gates it does not run
// under node. It runs in the page, against the figure's OWN shader text:
// `irradianceL` in tile-viewer.js is a function rather than inline in
// fs_main precisely so a compute pass can call it, and this appends a
// compute entry point to the real SHADER string rather than to a copy.
// A transcription would only prove the transcription right.
//
// From the debug MCP, or a console on the notebook page:
//
//   const { verifyLightingParity } =
//     await import("/notebooks/line-sweep-terrain-lighting/verify-lighting-parity.js");
//   await verifyLightingParity();
//
// Last run: 45360 samples, max 3.4e-7 (0.00009/255), mean 4.7e-8,
// 0 samples over 1/255, 0 WebGPU errors. The altitude list reaches to
// -12 deg so the night side, where the twilight factor is at its floor
// and the direct term is gone, is covered too.

const BASE = "/notebooks/line-sweep-terrain-lighting";

export async function verifyLightingParity({ verbose = true } = {}) {
  const [{ SHADER }, ref] = await Promise.all([
    import(`${BASE}/tile-viewer.js`),
    import(`${BASE}/lib/terrain-lighting.js`),
  ]);

  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  const errs = [];
  device.addEventListener("uncapturederror", (e) => errs.push(String(e.error)));

  // Deliberately off every default, so a uniform slot packed into the
  // wrong index shows up instead of sitting at a value that hides it.
  const P = {
    ...ref.DEFAULTS,
    skyFrac: 0.26, beta: 0.38, leak: 0.33, eta: 0.62,
    highlightStops: 0.8, shadowStops: 2.9, nightSky: 0.18,
    kneeMin: 0.75, sunRadiusDeg: 3.5,
    contrastPost: 1.25, pivot: 0.5, contrast: 1.15,
    shadowStrength: 0.9, aoStrength: 0.85, brightness: 0.3,
    // The shader sees a byte-packed normal, so it subtracts this bias
    // before reading the plane baseline. See relOpenness.
    slopeEps: 0.008,
  };
  const falloff = "exp";
  const floorRaw = Math.exp(-1);

  // Inputs as a flat buffer, 10 floats per sample, so both sides read
  // identical bits rather than each deriving them.
  const alts = [-12, -6, -2, -0.3, 0, 0.2, 0.5, 1, 2, 5, 10, 25, 50, 80];
  const slopes = [0, 5, 12, 20, 30, 40, 50, 65, 80];
  const azs = [0, 45, 90, 135, 180, 270];
  const storedAos = [1, 0.85, 0.6, 0.35, 0.1353];
  const shadows = [0, 0.35, 0.75, 1];
  const albedos = [0.2, 0.5, 0.93];

  const rows = [];
  for (const alt of alts) for (const slope of slopes) for (const az of azs)
  for (const storedAo of storedAos) for (const shadow of shadows)
  for (const albedoL of albedos) {
    const N = ref.normalOf(slope, az);
    rows.push({ N, sun: ref.sunDirOf(alt), storedAo, shadow, albedoL,
                slopeMag: Math.hypot(N[0], N[1]), slope, az, alt });
  }
  const n = rows.length;
  const inF = new Float32Array(n * 10);
  rows.forEach((r, i) => {
    const b = i * 10;
    inF[b] = r.N[0]; inF[b + 1] = r.N[1]; inF[b + 2] = r.N[2];
    inF[b + 3] = r.slopeMag; inF[b + 4] = r.storedAo; inF[b + 5] = r.shadow;
    inF[b + 6] = r.sun[0]; inF[b + 7] = r.sun[1]; inF[b + 8] = r.sun[2];
    inF[b + 9] = r.albedoL;
  });

  // The same 44-float layout tile-viewer packs into globalBuffer.
  const g = new Float32Array(44);
  g[10] = P.aoStrength; g[11] = P.shadowStrength;
  g[20] = floorRaw; g[21] = falloff === "exp" ? 1 : 0;
  g[28] = Math.pow(2, -P.brightness); g[29] = 1; g[30] = 1;
  g[32] = P.skyFrac; g[33] = P.beta; g[34] = P.leak; g[35] = P.eta;
  g[36] = P.highlightStops; g[37] = P.nightSky; g[38] = P.kneeMin;
  g[39] = P.sunRadiusDeg;
  g[40] = P.shadowStops; g[41] = P.contrastPost; g[42] = P.pivot;
  g[43] = P.contrast;

  const mk = (data, usage) => {
    const b = device.createBuffer({
      size: data.byteLength, usage: usage | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(b, 0, data);
    return b;
  };
  const uBuf = mk(g, GPUBufferUsage.UNIFORM);
  const iBuf = mk(inF, GPUBufferUsage.STORAGE);
  const oBuf = device.createBuffer({
    size: n * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });
  const rBuf = device.createBuffer({
    size: n * 4, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });

  // Bindings 8 and 9 are free in group 0, and layout "auto" includes
  // only what this entry point actually touches, so the figure's own
  // textures and storage buffers need not be supplied.
  const code = SHADER + `
@group(0) @binding(8) var<storage, read> dbgIn: array<f32>;
@group(0) @binding(9) var<storage, read_write> dbgOut: array<f32>;
@compute @workgroup_size(64)
fn dbg_main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i * 10u + 9u >= arrayLength(&dbgIn)) { return; }
  let b = i * 10u;
  dbgOut[i] = irradianceL(
    vec2<f32>(dbgIn[b], dbgIn[b + 1u]), dbgIn[b + 2u], dbgIn[b + 3u],
    dbgIn[b + 4u], dbgIn[b + 5u],
    vec3<f32>(dbgIn[b + 6u], dbgIn[b + 7u], dbgIn[b + 8u]), dbgIn[b + 9u]);
}`;

  const mod = device.createShaderModule({ code });
  const info = await mod.getCompilationInfo();
  const compileErrors = info.messages
    .filter((m) => m.type === "error")
    .map((m) => `line ${m.lineNum}: ${m.message}`);
  if (compileErrors.length) return { pass: false, compileErrors };

  const pipe = device.createComputePipeline({
    layout: "auto", compute: { module: mod, entryPoint: "dbg_main" },
  });
  const bg = device.createBindGroup({
    layout: pipe.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uBuf } },
      { binding: 8, resource: { buffer: iBuf } },
      { binding: 9, resource: { buffer: oBuf } },
    ],
  });
  const enc = device.createCommandEncoder();
  const pass = enc.beginComputePass();
  pass.setPipeline(pipe);
  pass.setBindGroup(0, bg);
  pass.dispatchWorkgroups(Math.ceil(n / 64));
  pass.end();
  enc.copyBufferToBuffer(oBuf, 0, rBuf, 0, n * 4);
  device.queue.submit([enc.finish()]);
  await rBuf.mapAsync(GPUMapMode.READ);
  const gpu = new Float32Array(rBuf.getMappedRange().slice(0));
  rBuf.unmap();

  let maxAbs = 0, sumAbs = 0, over = 0, worst = null;
  for (let i = 0; i < n; i++) {
    const r = rows[i];
    const want = ref.composite({
      N: r.N, sunDir: r.sun, shadow: r.shadow,
      openness: ref.opennessOf(r.storedAo, falloff), falloff,
      albedoL: r.albedoL, p: P,
    }).L;
    const d = Math.abs(gpu[i] - want);
    sumAbs += d;
    if (d > 1 / 255) over++;
    if (d > maxAbs) { maxAbs = d; worst = { ...r, gpu: gpu[i], want }; }
  }

  const out = {
    pass: over === 0 && errs.length === 0,
    samples: n,
    maxAbsDiff: maxAbs,
    maxAbsDiffIn255ths: maxAbs * 255,
    meanAbsDiff: sumAbs / n,
    samplesOver_1_255: over,
    webgpuErrors: errs,
    worst: worst && {
      alt: worst.alt, slope: worst.slope, az: worst.az,
      storedAo: worst.storedAo, shadow: worst.shadow, albedoL: worst.albedoL,
      gpu: worst.gpu, want: worst.want,
    },
  };
  if (verbose) console.log("[lighting parity]", out);
  return out;
}
