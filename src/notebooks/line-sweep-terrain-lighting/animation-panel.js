// The figure's mp4 export: a day-cycle recording of one local solar
// day, defaulting to solar noon round to solar noon.
//
// Everything lives behind a <details> so the five controls it needs
// don't crowd the shading sliders it sits next to. The recording is
// WYSIWYG — frames come off the live canvas at whatever size it
// currently is, so the way to choose a resolution is to expand the
// figure and size the window, watching the viewer's size chip. The
// panel pins that chip open while it is.
//
// Time comes from `timeOverride`, an object the notebook's per-frame
// lighting tick reads in preference to the calendar. That bypasses the
// time slider's one-minute quantisation and its single-calendar-day
// clamp, which matters because a solar day straddles two dates almost
// everywhere. The tick echoes `requested` back into `applied` once it
// has pushed the new instant into the viewer, which is how
// prepareFrame knows its instant is live before it starts waiting for
// the bake to settle.
//
// Deps are injected rather than imported: `Inputs` and `html` are
// notebook builtins and SunCalc is an npm package, which lib files in
// this repo don't import directly.

import { solarDayBounds, solarDaySpan } from "./solar-day.js";
import {
  recordMp4,
  downloadMp4,
  formatDuration,
} from "./lib/mp4-recorder.js";

// Hour angle advances 360° per solar day, so this converts "solar
// minutes per frame" into the per-frame sun motion that decides
// whether long shadow edges step or glide.
const DEG_PER_SOLAR_MIN = 360 / 1440;

function hemi(v, pos, neg) {
  return `${Math.abs(v).toFixed(3)}${v >= 0 ? pos : neg}`;
}

export function createAnimationPanel({
  Inputs,
  html,
  SunCalc,
  getViewer,
  getSunMode,
  requestTimeMode,
  getAnchorUtcMs,
}) {
  // The notebook's lighting tick reads this every frame.
  const timeOverride = { utcMs: null, requested: 0, applied: 0 };

  const durationEl = Inputs.range([4, 60], {
    label: "duration (s)",
    value: 24,
    step: 1,
  });
  const fpsEl = Inputs.radio([24, 30, 60], { label: "fps", value: 30 });
  const qpEl = Inputs.range([10, 34], {
    label: "qp (lower = better)",
    value: 22,
    step: 1,
  });
  // Noon to noon by default. All three are driven off the solar day
  // containing the calendar's instant, so the date picker still means
  // what it says whichever one is chosen.
  const spanEl = Inputs.radio(
    new Map([
      ["dawn to dusk", "dawn"],
      ["midnight to midnight", "midnight"],
      ["noon to noon", "noon"],
    ]),
    { label: "span", value: "noon" },
  );

  const readout = html`<div
    style="font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;
           opacity:0.72; margin:2px 0 6px 0;"
  ></div>`;
  const status = html`<div
    style="font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;
           opacity:0.72; margin:4px 0 0 0; min-height:1.5em;"
  ></div>`;
  const button = html`<button
    type="button"
    style="font:inherit; padding:3px 10px; cursor:pointer;"
  >
    Record mp4
  </button>`;

  const details = html`<details class="tile-viewer-animation"
    style="margin-top:6px; border-top:1px solid rgba(128,128,128,0.3);
           padding-top:6px;"
  >
    <summary style="cursor:pointer; user-select:none;">animation</summary>
  </details>`;
  const body = html`<div style="padding-top:4px;"></div>`;
  // Grouped by control type rather than by topic: both sliders, then
  // both radio groups, so the panel reads as two blocks instead of
  // alternating track and button rows down the whole panel.
  body.appendChild(durationEl);
  body.appendChild(qpEl);
  body.appendChild(fpsEl);
  body.appendChild(spanEl);
  body.appendChild(readout);
  body.appendChild(button);
  body.appendChild(status);
  details.appendChild(body);

  const setStatus = (msg) => {
    status.textContent = msg || "";
  };

  // ---- span resolution -------------------------------------------------
  // Returns the instants the recording walks, plus whether the last
  // frame sits on the end instant.
  //
  // A whole solar day is half-open, midnight or noon alike: the
  // closing frame is the same lighting as the opening one, so
  // including it would duplicate a frame and put a stutter in the
  // loop. Dawn to dusk is closed, because it is not a loop and
  // stopping exactly at dusk is the point.
  //
  // Dawn and dusk here are the civil-twilight events, the sun at -6
  // degrees, not sunrise and sunset. That is deliberate: the
  // composite's twilight ramp is smoothstep(-0.105, 0.035, sin(alt)),
  // which reaches zero at exactly -6, so civil dawn and dusk are the
  // precise instants the terrain arrives at and leaves the night
  // floor. Sunrise to sunset would cut off the part of the cycle
  // where the terminator is actually sweeping.
  function resolveSpan() {
    const viewer = getViewer();
    if (!viewer) return null;
    const [lat, lng] = viewer.getCenter();
    const anchor = getAnchorUtcMs();
    if (!Number.isFinite(anchor)) return null;
    const mode = spanEl.value;

    if (mode === "dawn") {
      const day = solarDayBounds(anchor, lng);
      const times = SunCalc.getTimes(new Date(day.noon), lat, lng);
      const t0 = times.dawn?.getTime();
      const t1 = times.dusk?.getTime();
      if (Number.isFinite(t0) && Number.isFinite(t1) && t1 > t0) {
        return { t0, t1, inclusive: true, day, lat, lng };
      }
      // Inside the polar circles there may be no civil dawn or dusk on
      // this date at all. Fall back rather than refusing.
      const span = solarDaySpan(anchor, lng, "noon");
      return {
        t0: span.t0,
        t1: span.t1,
        inclusive: false,
        day: span.day,
        lat,
        lng,
        note: "no civil dawn or dusk at this date and latitude; recording noon to noon",
      };
    }

    const span = solarDaySpan(anchor, lng, mode);
    return {
      t0: span.t0,
      t1: span.t1,
      inclusive: false,
      day: span.day,
      lat,
      lng,
    };
  }

  function frameCountOf() {
    return Math.max(2, Math.round(Number(durationEl.value) * Number(fpsEl.value)));
  }

  function updateReadout() {
    const frames = frameCountOf();
    const span = resolveSpan();
    const spanMin = span ? (span.t1 - span.t0) / 60000 : 1440;
    const steps = span && span.inclusive ? frames - 1 : frames;
    const perFrame = spanMin / Math.max(1, steps);
    const viewer = getViewer();
    const size = viewer ? viewer.getFrameSize() : null;
    readout.textContent =
      `${frames} frames · ${perFrame.toFixed(1)} solar min/frame · ` +
      `${(perFrame * DEG_PER_SOLAR_MIN).toFixed(2)}°/frame` +
      (size ? ` · ${size[0]} × ${size[1]}` : "");
  }

  for (const el of [durationEl, fpsEl, qpEl, spanEl]) {
    el.addEventListener("input", updateReadout);
  }
  // The readout carries the live frame size, so keep it current while
  // the panel is open and the window is being resized.
  let readoutTimer = 0;
  details.addEventListener("toggle", () => {
    getViewer()?.setSizeChipPinned(details.open);
    clearInterval(readoutTimer);
    if (details.open) {
      updateReadout();
      readoutTimer = setInterval(updateReadout, 250);
    }
  });
  updateReadout();

  // ---- the recording ---------------------------------------------------
  const run = { active: false, cancel: false };

  const waitForOverrideApplied = () =>
    new Promise((resolve) => {
      const poll = () => {
        if (timeOverride.applied >= timeOverride.requested) {
          resolve();
          return;
        }
        requestAnimationFrame(poll);
      };
      requestAnimationFrame(poll);
    });

  async function record() {
    const viewer = getViewer();
    if (!viewer) return;

    // The recording animates time, so the figure has to be in time
    // mode. Switch for the user if we can, and say so if we can't.
    if (getSunMode() !== "time" && !requestTimeMode()) {
      setStatus('switch sun mode to "from time" to record');
      return;
    }

    const span = resolveSpan();
    if (!span) {
      setStatus("viewer is not ready yet");
      return;
    }
    const frameCount = frameCountOf();
    const fps = Number(fpsEl.value);
    const qp = Number(qpEl.value);
    const steps = span.inclusive ? frameCount - 1 : frameCount;
    const step = (span.t1 - span.t0) / Math.max(1, steps);
    if (span.note) setStatus(span.note);

    run.active = true;
    run.cancel = false;
    button.textContent = "Cancel";
    for (const el of [durationEl, fpsEl, qpEl, spanEl]) {
      el.querySelectorAll?.("input, select").forEach((n) => {
        n.disabled = true;
      });
    }
    // Freeze the view: the solar day is anchored to the centre
    // longitude, and a pan mid-recording would both re-frame the shot
    // and invalidate that anchor. A resize would be worse still — the
    // encoder's geometry is fixed at the first frame — but that is the
    // window's business, so recordMp4 just refuses the frame.
    viewer.setInteractive(false);
    viewer.setSizeChipPinned(true);

    const t0 = performance.now();
    try {
      const result = await recordMp4({
        frameCount,
        fps,
        quantizationParameter: qp,
        filename: "solar-day.mp4",
        shouldCancel: () => run.cancel,
        prepareFrame: async (i) => {
          timeOverride.utcMs = span.t0 + i * step;
          timeOverride.requested++;
          // Two waits, and both are needed: the first lets the
          // notebook's lighting tick push this instant into the viewer
          // (so the bake it triggers is the one we then wait on), the
          // second lets tiles, bakes and the shadow re-bake finish.
          await waitForOverrideApplied();
          await viewer.awaitSettled();
        },
        captureFrame: () => viewer.captureFrame(),
        onProgress: ({ frame, frameCount: total, elapsedMs }) => {
          const left = (elapsedMs / frame) * (total - frame);
          setStatus(
            `frame ${frame}/${total} · ${formatDuration(elapsedMs)} elapsed · ` +
              `~${formatDuration(left)} left`,
          );
        },
      });

      if (!result) {
        setStatus("cancelled");
        return;
      }
      const date = new Date(span.day.noon).toISOString().slice(0, 10);
      const name =
        `solar-day-${date}-${hemi(span.lat, "N", "S")}-` +
        `${hemi(span.lng, "E", "W")}-${result.width}x${result.height}.mp4`;
      downloadMp4(result.bytes, name);
      setStatus(
        `${result.frameCount} frames · ${result.width}×${result.height} · ` +
          `${(result.bytes.length / 1048576).toFixed(1)} MB · ` +
          `${formatDuration(performance.now() - t0)} · ${name}`,
      );
    } catch (err) {
      console.error("[animation] recording failed", err);
      setStatus(`failed: ${err.message}`);
    } finally {
      run.active = false;
      timeOverride.utcMs = null;
      viewer.setInteractive(true);
      viewer.setSizeChipPinned(details.open);
      button.textContent = "Record mp4";
      for (const el of [durationEl, fpsEl, qpEl, spanEl]) {
        el.querySelectorAll?.("input, select").forEach((n) => {
          n.disabled = false;
        });
      }
    }
  }

  button.addEventListener("click", () => {
    if (run.active) {
      run.cancel = true;
      setStatus("cancelling…");
      return;
    }
    record();
  });

  // Cells re-run on edit, so hand back a teardown for the readout
  // interval and any recording still in flight.
  function dispose() {
    run.cancel = true;
    clearInterval(readoutTimer);
  }

  // The recorder's settings, exposed so the notebook can keep them in
  // the URL hash alongside the rest of its state.
  const inputs = { duration: durationEl, fps: fpsEl, qp: qpEl, span: spanEl };

  return { element: details, timeOverride, dispose, inputs };
}
