export default function createHullViz (html, width, showLight=false, softShadow=false) {
  // Animated 1-D horizon-tracking diagram. Generates a smooth random
  // elevation profile, then sweeps left-to-right tracking the upper
  // convex hull (running max of heights). The pink line shows the
  // current horizon; the red dot is the sweep cursor.
  const htW = width,
    htH = 200,
    pad = 10;
  const N = 129;
  const stepX = (htW - 2 * pad) / (N - 1);

  function makeProfile() {
    const h = new Float32Array(N);
    const nHarm = 8;
    const amps = [],
      phases = [],
      freqs = [];
    for (let k = 0; k < nHarm; k++) {
      amps.push((0.5 + 0.5 * Math.random()) / (k + 1));
      phases.push(Math.random() * Math.PI * 2);
      freqs.push((k + 1) * (1 + Math.random() * 0.3));
    }
    for (let i = 0; i < N; i++) {
      let v = 0;
      for (let k = 0; k < nHarm; k++)
        v +=
          amps[k] *
          Math.cos(((freqs[k] * i) / N) * Math.PI * 2 + phases[k]);
      h[i] = v;
    }
    let mn = Infinity,
      mx = -Infinity;
    for (let i = 0; i < N; i++) {
      if (h[i] < mn) mn = h[i];
      if (h[i] > mx) mx = h[i];
    }
    const range = mx - mn || 1;
    for (let i = 0; i < N; i++) {
      h[i] = ((htH - 40 - pad) * (h[i] - mn)) / range;
    }
    return h;
  }

  const svgNS = "http://www.w3.org/2000/svg";
  const dispW = Math.min(htW, width);
  const dispH = dispW * (htH / htW);
  const svg = html`<svg
    width=${dispW}
    height=${dispH}
    style="display:block; max-width:100%;"
    viewBox="0 0 ${htW} ${htH}"
  ></svg>`;

  // SVG <defs> — holds gradient definitions built per frame in soft-shadow mode.
  const defsEl = document.createElementNS(svgNS, "defs");
  svg.appendChild(defsEl);

  function pxI(i) {
    return pad + i * stepX;
  }
  function pyH(h) {
    return htH - pad - h;
  }

  function mkSvgEl(tag, attrs={}) {
    const el = document.createElementNS(svgNS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  }

  // Grid lines (rebuilt per profile so they stop at terrain height).
  const gridGroup = mkSvgEl("g");
  svg.appendChild(gridGroup);

  // Terrain polyline.
  const terrainPath = mkSvgEl("polyline", {
    fill: "none",
    stroke: "var(--theme-foreground)",
    "opacity": showLight ? 0.5 : 1,
    "stroke-width": 2.5,
    "stroke-linejoin": "round",
    "stroke-linecap": "round",
  });
  svg.appendChild(terrainPath);

  // Fill groups — illuminated below shadow so shadow overlaps correctly.
  const illumFillGroup = mkSvgEl("g");
  svg.appendChild(illumFillGroup);

  const shadowFillGroup = mkSvgEl("g");
  svg.appendChild(shadowFillGroup);

  // Thick terrain-surface strokes. In hard-shadow mode we use two
  // separate paths for lit/shadow segments. In soft-shadow mode we use
  // one polyline whose stroke is a horizontal linearGradient with a stop
  // per sample interpolated between the lit and shadow colors by the
  // sample's fraction-lit.
  const softStrokeGradId = softShadow ? `terrain-stroke-grad-${Math.random().toString(36).slice(2, 8)}` : null;
  let illumStroke = null, shadowStroke = null, softStroke = null, softStrokeGrad = null;
  if (softShadow) {
    softStrokeGrad = mkSvgEl("linearGradient", {
      id: softStrokeGradId,
      gradientUnits: "userSpaceOnUse",
      x1: pad, y1: 0, x2: htW - pad, y2: 0,
    });
    defsEl.appendChild(softStrokeGrad);
    softStroke = mkSvgEl("polyline", {
      fill: "none",
      stroke: `url(#${softStrokeGradId})`,
      "stroke-width": 7,
      "stroke-linejoin": "round",
      "stroke-linecap": "round",
    });
    svg.appendChild(softStroke);
  } else {
    shadowStroke = mkSvgEl("path", {
      fill: "none",
      stroke: "#348",
      "stroke-width": 7,
      "stroke-linejoin": "round",
      "stroke-linecap": "round",
    });
    svg.appendChild(shadowStroke);
    illumStroke = mkSvgEl("path", {
      fill: "none",
      stroke: "#cc8",
      "stroke-width": 7,
      "stroke-linejoin": "round",
      "stroke-linecap": "round",
    });
    svg.appendChild(illumStroke);
  }

  // Horizon line (pink).
  const horizonPath = mkSvgEl("polyline", {
    fill: "none",
    stroke: "rgba(240,140,160,0.7)",
    "stroke-width": 2.5,
    "stroke-linejoin": "round",
    "stroke-linecap": "round",
  });
  svg.appendChild(horizonPath);

  // Hull vertex dots (pink, drawn at each convex hull point).
  const hullDotsGroup = mkSvgEl("g", {});
  svg.appendChild(hullDotsGroup);

  // Sweep cursor dot.
  const cursorDot = mkSvgEl("circle", {
    r: 4,
    fill: "#e44",
    stroke: "var(--theme-background)",
    "stroke-width": 1.5,
  });
  svg.appendChild(cursorDot);

  const sunAngle = Math.PI / 6;
  const topY = 0; // top of figure for illuminated fill

  let profile = makeProfile();
  let step = 0;
  let hull = []; // upper convex hull: array of {i, h}
  // Each fill run is { type, samples: [{i, h}], blocker, entryX, entryY, exitX, exitY }
  // entry/exit are envelope points (possibly sub-sample) where the run begins/ends.
  // For illum runs: entry/exit lie on terrain; for shadow runs: on the blocker's outer sun ray.
  let fillRuns = [];
  let curRun = null;
  // Segment arrays for the thick terrain strokes (hard-shadow mode only).
  let illumSegs = [];
  let shadowSegs = [];
  // Per-sample horizon angle for soft-shadow fraction-lit computation.
  const horizonAngles = new Float32Array(N);

  // Fraction of sun disk visible at a sample given its horizon angle.
  // When sunRadius is 0 this degenerates to a step function at sunAngle.
  function fracLit (horizonAngle) {
    if (sunRadius <= 0) return horizonAngle < sunAngle ? 1 : 0;
    return Math.max(0, Math.min(1, (sunAngle + sunRadius - horizonAngle) / (2 * sunRadius)));
  }

  // Interpolate between the shadow color (#334488) and the lit color
  // (#ccbb88) by t∈[0,1]. Returns an "rgb(r,g,b)" string.
  function litColor (t) {
    const sR = 0x33, sG = 0x44, sB = 0x88;
    const lR = 0xcc, lG = 0xcc, lB = 0x88;
    const r = Math.round(sR + (lR - sR) * t);
    const g = Math.round(sG + (lG - sG) * t);
    const b = Math.round(sB + (lB - sB) * t);
    return `rgb(${r},${g},${b})`;
  }
  // Angular half-width of the sun disk. Zero gives hard shadows (the
  // outer/center/inner rays coincide); positive values produce a penumbra
  // band of width 2·sunRadius spanning sunAngle.
  const sunRadius = softShadow ? Math.PI / 20 : 0;
  const tanCenter = Math.tan(sunAngle);
  const tanOuter = Math.tan(sunAngle - sunRadius);
  // Classification uses the outer ray so a sample enters the "shadow"
  // run as soon as any part of the sun disk is occluded.
  const classifyAngle = sunAngle - sunRadius;

  // Top-left sun-direction indicator. Hard-shadow figures get a single
  // arrow along the centre ray; soft-shadow figures get a wedge spanning
  // the sun's full angular diameter (2·sunRadius) to cue the spread.
  if (showLight) {
    const originX = pad + 20;
    const originY = pad + 8;
    const dirDx = Math.cos(sunAngle);
    const dirDy = Math.sin(sunAngle);
    if (softShadow) {
      const r = 56;
      const a0 = sunAngle - sunRadius;
      const a1 = sunAngle + sunRadius;
      const xA = originX + r * Math.cos(a0);
      const yA = originY + r * Math.sin(a0);
      const xB = originX + r * Math.cos(a1);
      const yB = originY + r * Math.sin(a1);
      const d = `M ${originX} ${originY} L ${xA} ${yA} A ${r} ${r} 0 0 1 ${xB} ${yB} Z`;
      svg.appendChild(mkSvgEl("path", {
        d,
        fill: "#ffd866",
        "fill-opacity": "0.85",
        stroke: "#3a2600",
        "stroke-width": 1.5,
        "stroke-linejoin": "round",
      }));
    } else {
      const len = 50;
      const xHead = originX + dirDx * len;
      const yHead = originY + dirDy * len;
      const headSize = 10;
      const perpX = -dirDy, perpY = dirDx;
      const tipX = xHead + dirDx * headSize;
      const tipY = yHead + dirDy * headSize;
      const backX = xHead - dirDx * headSize * 0.2;
      const backY = yHead - dirDy * headSize * 0.2;
      const shaftHalf = 1.5;
      const headHalf = headSize * 0.7;
      const tailL = [originX + perpX * shaftHalf, originY + perpY * shaftHalf];
      const shaftL = [backX + perpX * shaftHalf, backY + perpY * shaftHalf];
      const wingL = [backX + perpX * headHalf, backY + perpY * headHalf];
      const wingR = [backX - perpX * headHalf, backY - perpY * headHalf];
      const shaftR = [backX - perpX * shaftHalf, backY - perpY * shaftHalf];
      const tailR = [originX - perpX * shaftHalf, originY - perpY * shaftHalf];
      const points = [tailL, shaftL, wingL, [tipX, tipY], wingR, shaftR, tailR]
        .map((p) => p[0] + "," + p[1])
        .join(" ");
      svg.appendChild(mkSvgEl("polygon", {
        points,
        fill: "#3a2600",
        stroke: "#3a2600",
        "stroke-width": 3,
        "stroke-linejoin": "round",
      }));
      svg.appendChild(mkSvgEl("polygon", {
        points,
        fill: "#ffd866",
        stroke: "none",
      }));
    }
  }

  // Ray Y (screen) at x, given blocker hull vertex and tangent of angle.
  function rayYAt (blocker, x, tanA) {
    return pyH(blocker.h) + (x - pxI(blocker.i)) * tanA;
  }

  // Intersection of blocker's ray (at tan tanA) with the terrain segment
  // between samples a and b (screen coords). Returns { x, y }.
  function rayTerrainIntersect (blocker, a, b, tanA) {
    const bx = pxI(blocker.i), by = pyH(blocker.h);
    const ax1 = pxI(a.i), ay1 = pyH(a.h);
    const ax2 = pxI(b.i), ay2 = pyH(b.h);
    const terrainSlope = (ay2 - ay1) / (ax2 - ax1);
    const denom = terrainSlope - tanA;
    if (Math.abs(denom) < 1e-9) return { x: ax2, y: ay2 };
    const x = (by - ay1 + ax1 * terrainSlope - bx * tanA) / denom;
    const y = by + (x - bx) * tanA;
    return { x, y };
  }

  function reset() {
    fillRuns = [];
    curRun = null;
    illumSegs = [];
    shadowSegs = [];
    profile = makeProfile();
    step = 0;
    hull = [];
    if (softShadow) {
      softStroke.setAttribute("points", "");
      while (softStrokeGrad.firstChild) softStrokeGrad.removeChild(softStrokeGrad.firstChild);
      // Also clear any penumbra gradients hanging around from last sweep.
      for (let k = defsEl.childNodes.length - 1; k >= 0; k--) {
        const node = defsEl.childNodes[k];
        if (node !== softStrokeGrad) defsEl.removeChild(node);
      }
      while (shadowFillGroup.firstChild) shadowFillGroup.removeChild(shadowFillGroup.firstChild);
      while (illumFillGroup.firstChild) illumFillGroup.removeChild(illumFillGroup.firstChild);
    }
    terrainPath.setAttribute(
      "points",
      Array.from(profile)
        .map((h, i) => `${pxI(i)},${pyH(h)}`)
        .join(" "),
    );
    while (gridGroup.firstChild) gridGroup.removeChild(gridGroup.firstChild);
    for (let i = 0; i < N; i+=4) {
      gridGroup.appendChild(
        mkSvgEl("line", {
          x1: pxI(i),
          y1: htH,
          x2: pxI(i),
          y2: pyH(profile[i]),
          stroke: "#999",
          "stroke-width": 0.75,
          "stroke-dasharray": "2 4",
        }),
      );
    }
  }

  function advance() {
    if (step >= N) {
      reset();
      return;
    }
    const h = profile[step];

    // Update the upper convex hull. Pop any vertex that falls on or
    // below the line from the second-to-last vertex to the new point.
    while (hull.length >= 2) {
      const a = hull[hull.length - 2];
      const b = hull[hull.length - 1];
      const cross = (b.i - a.i) * (h - a.h) - (step - a.i) * (b.h - a.h);
      if (cross >= 0) hull.pop();
      else break;
    }
    hull.push({ i: step, h });

    if (showLight) {
      // Horizon angle at this sample = angle of the last hull segment
      // (from the previous hull vertex to this point). Because the hull
      // is an upper convex hull, this equals the maximum upward angle
      // from this sample to any terrain point to its left — i.e., the
      // true horizon angle used for sun-disk occlusion.
      let horizonAngle;
      if (hull.length < 2) {
        horizonAngle = -Math.PI / 2; // no blocker — fully lit.
      } else {
        const h1 = hull[hull.length - 2];
        const h2 = hull[hull.length - 1];
        const hullDy = pyH(h2.h) - pyH(h1.h);
        const hullDx = pxI(h2.i) - pxI(h1.i);
        horizonAngle = Math.atan2(hullDy, hullDx);
      }
      horizonAngles[step] = horizonAngle;

      // In soft-shadow mode the run boundary is the outer edge of the
      // sun disk (classifyAngle = sunAngle − sunRadius), so a sample
      // joins the shadow run the moment any part of the sun is blocked.
      const isVisible = classifyAngle > horizonAngle;
      const type = isVisible ? "illum" : "shadow";
      const pt = { i: step, h: profile[step] };
      const px = pxI(pt.i), py = pyH(pt.h);

      if (!curRun) {
        curRun = {
          type,
          samples: [pt],
          blocker: type === "shadow" && hull.length >= 2 ? hull[hull.length - 2] : null,
          entryX: px, entryY: py,
          exitX: px, exitY: py,
        };
        if (type === "shadow" && curRun.blocker) {
          curRun.exitY = rayYAt(curRun.blocker, px, tanOuter);
        }
        fillRuns.push(curRun);
      } else if (curRun.type === type) {
        curRun.samples.push(pt);
        curRun.exitX = px;
        curRun.exitY = type === "shadow" && curRun.blocker
          ? rayYAt(curRun.blocker, px, tanOuter)
          : py;
      } else {
        // Transition: intersect the blocker's outer sun ray with the
        // terrain segment between prevSample and pt. Both the closing
        // run's exit and the new run's entry land on this intersection,
        // so the envelope is continuous at exactly the outer-ray angle.
        const prevSample = curRun.samples[curRun.samples.length - 1];
        const blocker = type === "shadow"
          ? (hull.length >= 2 ? hull[hull.length - 2] : null)
          : curRun.blocker;
        const ix = blocker
          ? rayTerrainIntersect(blocker, prevSample, pt, tanOuter)
          : { x: px, y: py };

        curRun.exitX = ix.x;
        curRun.exitY = ix.y;

        curRun = {
          type,
          samples: [pt],
          blocker: type === "shadow" ? blocker : null,
          entryX: ix.x, entryY: ix.y,
          exitX: px,
          exitY: type === "shadow" && blocker ? rayYAt(blocker, px, tanOuter) : py,
        };
        fillRuns.push(curRun);
      }

      // Terrain strokes.
      if (softShadow) {
        // Single polyline over processed samples, stroked with a
        // userSpace horizontal gradient whose stops interpolate between
        // the shadow and lit colors by per-sample fraction-lit.
        softStroke.setAttribute(
          "points",
          Array.from({ length: step + 1 }, (_, i) => `${pxI(i)},${pyH(profile[i])}`).join(" "),
        );
        while (softStrokeGrad.firstChild) softStrokeGrad.removeChild(softStrokeGrad.firstChild);
        const xLeft = pad, xRight = htW - pad;
        for (let i = 0; i <= step; i++) {
          const offset = (pxI(i) - xLeft) / (xRight - xLeft);
          softStrokeGrad.appendChild(mkSvgEl("stop", {
            offset: `${(offset * 100).toFixed(3)}%`,
            "stop-color": litColor(fracLit(horizonAngles[i])),
          }));
        }
      } else {
        // Two-path hard-shadow strokes (classified at sunAngle since
        // sunRadius=0, so classifyAngle === sunAngle).
        if (step > 0) {
          (isVisible ? illumSegs : shadowSegs).push([
            { i: step - 1, h: profile[step - 1] },
            { i: step, h: profile[step] },
          ]);
        }
        illumStroke.setAttribute("d", illumSegs.map(([a, b]) =>
          `M${pxI(a.i)},${pyH(a.h)}L${pxI(b.i)},${pyH(b.h)}`
        ).join(" "));
        shadowStroke.setAttribute("d", shadowSegs.map(([a, b]) =>
          `M${pxI(a.i)},${pyH(a.h)}L${pxI(b.i)},${pyH(b.h)}`
        ).join(" "));
      }

      // Rebuild fill regions (and, for soft mode, penumbra gradients).
      while (shadowFillGroup.firstChild) shadowFillGroup.removeChild(shadowFillGroup.firstChild);
      while (illumFillGroup.firstChild) illumFillGroup.removeChild(illumFillGroup.firstChild);
      if (softShadow) {
        // Remove previously-added penumbra gradients from <defs>
        // without touching the persistent terrain-stroke gradient.
        for (let k = defsEl.childNodes.length - 1; k >= 0; k--) {
          const node = defsEl.childNodes[k];
          if (node !== softStrokeGrad) defsEl.removeChild(node);
        }
      }

      // Light envelope: terrain over lit runs, outer sun ray over
      // shadow runs. Continuous by construction.
      const env = [];
      const pushEnv = (x, y) => {
        const last = env[env.length - 1];
        if (!last || last[0] !== x || last[1] !== y) env.push([x, y]);
      };
      for (const run of fillRuns) {
        pushEnv(run.entryX, run.entryY);
        if (run.type === "illum") {
          for (const p of run.samples) pushEnv(pxI(p.i), pyH(p.h));
        }
        pushEnv(run.exitX, run.exitY);
      }

      // Illuminated fill: single polygon from the top of the figure
      // down to the envelope. Over shadow runs the envelope slopes
      // along the outer ray at angle (sunAngle − sunRadius), so in hard
      // mode the cut lies on the sun ray and in soft mode it lies on
      // the lit-side edge of the penumbra — stacked over the shadow.
      if (env.length >= 2) {
        const xLeft = env[0][0], xRight = env[env.length - 1][0];
        let d = `M${xLeft},${topY}L${xRight},${topY}`;
        for (let k = env.length - 1; k >= 0; k--) {
          d += `L${env[k][0]},${env[k][1]}`;
        }
        d += "Z";
        const illumEl = mkSvgEl("path", {
          fill: "rgba(255,240,140,0.25)",
          stroke: "none",
        });
        illumEl.setAttribute("d", d);
        illumFillGroup.appendChild(illumEl);
      }

      // Shadow fills. In hard-shadow mode each run is a solid polygon
      // between the blocker's sun ray (top) and the terrain (bottom).
      // In soft-shadow mode we build a proper penumbra fan: the shadow
      // polygon is used as a clip-path, and inside we draw a fan of
      // triangular wedges emanating from the blocker — N wedges across
      // the sun disk [sunAngle−r, sunAngle+r] with opacity ramping
      // 0→maxOp, plus a wide umbra wedge past the inner ray at full
      // opacity. The fan naturally widens with distance from the
      // blocker, which a single linearGradient can't capture.
      let runIdx = 0;
      for (const run of fillRuns) {
        if (run.type !== "shadow") continue;
        let d = `M${run.entryX},${run.entryY}`;
        d += `L${run.exitX},${run.exitY}`;
        for (let k = run.samples.length - 1; k >= 0; k--) {
          const p = run.samples[k];
          d += `L${pxI(p.i)},${pyH(p.h)}`;
        }
        d += "Z";

        if (softShadow && run.blocker) {
          // Render the fan inside an SVG <pattern> referenced as the
          // shadow polygon's fill. Each wedge interpolates both color
          // *and* opacity between the illum fill (at the outer-ray
          // edge) and the solid shadow fill (at the inner-ray/umbra
          // edge) so the penumbra blends continuously into the lit
          // region above the outer ray rather than stepping from
          // yellow to a transparent polygon edge.
          const patternId = `penumbra-${softStrokeGradId}-${runIdx}`;
          const pattern = mkSvgEl("pattern", {
            id: patternId,
            patternUnits: "userSpaceOnUse",
            patternContentUnits: "userSpaceOnUse",
            x: 0, y: 0, width: htW, height: htH,
          });
          const bx = pxI(run.blocker.i), by = pyH(run.blocker.h);
          const reach = 2 * (htW + htH); // farther than the figure extents.
          // Endpoints of the color+opacity ramp, matched to the
          // illum-fill colour/opacity and the hard-mode shadow-fill
          // colour/opacity so the outer/umbra ends blend seamlessly.
          const litR = 255, litG = 240, litB = 140, litOp = 0.25;
          const shR = 50, shG = 68, shB = 128, shOp = 0.55;
          const N_FAN = 24;
          const wedgeAttrs = (t, aStart, aEnd) => {
            const r = Math.round(litR + (shR - litR) * t);
            const g = Math.round(litG + (shG - litG) * t);
            const b = Math.round(litB + (shB - litB) * t);
            const op = litOp + (shOp - litOp) * t;
            return {
              points: `${bx},${by} ${bx + reach * Math.cos(aStart)},${by + reach * Math.sin(aStart)} ${bx + reach * Math.cos(aEnd)},${by + reach * Math.sin(aEnd)}`,
              fill: `rgb(${r},${g},${b})`,
              "fill-opacity": op.toFixed(3),
            };
          };
          // Penumbra wedges: angles [sunAngle−r, sunAngle+r].
          for (let k = 0; k < N_FAN; k++) {
            const aStart = sunAngle - sunRadius + (k / N_FAN) * (2 * sunRadius);
            const aEnd = sunAngle - sunRadius + ((k + 1) / N_FAN) * (2 * sunRadius);
            const t = (k + 0.5) / N_FAN;
            pattern.appendChild(mkSvgEl("polygon", wedgeAttrs(t, aStart, aEnd)));
          }
          // Umbra wedge past the inner ray — full shadow colour.
          pattern.appendChild(mkSvgEl("polygon", wedgeAttrs(1, sunAngle + sunRadius, Math.PI)));
          defsEl.appendChild(pattern);
          const el = mkSvgEl("path", {
            d,
            fill: `url(#${patternId})`,
            stroke: "none",
          });
          shadowFillGroup.appendChild(el);
        } else {
          const el = mkSvgEl("path", {
            d,
            fill: "rgba(50,68,128,0.35)",
            stroke: "none",
          });
          shadowFillGroup.appendChild(el);
        }
        runIdx++;
      }
    }

    // Horizon polyline through hull vertices.
    horizonPath.setAttribute(
      "points",
      hull.map((v) => `${pxI(v.i)},${pyH(v.h)}`).join(" "),
    );

    // Hull vertex dots.
    while (hullDotsGroup.firstChild)
      hullDotsGroup.removeChild(hullDotsGroup.firstChild);
    for (const v of hull) {
      hullDotsGroup.appendChild(
        mkSvgEl("circle", {
          cx: pxI(v.i),
          cy: pyH(v.h),
          r: 3,
          fill: "#e44",
          stroke: "var(--theme-background)",
          "stroke-width": 1,
        }),
      );
    }

    cursorDot.setAttribute("cx", pxI(step));
    cursorDot.setAttribute("cy", pyH(h));
    step++;
  }

  reset();
  const interval = 120;
  const pauseAfter = 1500;

  let isVisible = true;
  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) isVisible = entry.isIntersecting;
    },
    { threshold: 0 },
  );
  visibilityObserver.observe(svg);

  function tick() {
    if (!isVisible) {
      setTimeout(tick, interval);
      return;
    }
    advance();
    if (step >= N) {
      setTimeout(() => {
        if (!isVisible) {
          setTimeout(tick, interval);
          return;
        }
        reset();
        advance();
        tick();
      }, pauseAfter);
    } else {
      setTimeout(tick, interval);
    }
  }
  tick();

return svg;
}
