// Gate: a wait that only a painted frame can advance must spend its
// timeout budget in attended time, not wall-clock time.
//
// This is the bug behind "the recording stalled and then said the map
// never settled". Both of the figure's export waits poll inside
// requestAnimationFrame, which stops being delivered the moment the
// page is hidden or its window is fully covered. A multi-minute
// export is exactly when the user goes and does something else, so
// the frames stop, the wall clock does not, and the first poll after
// they come back reports a 60-second timeout against a map that is
// merely a few hundred milliseconds behind.
//
// Each case below states what the loop that shipped before
// (`legacyWait`, transcribed from tile-viewer's own awaitSettled) does
// with it, so the gate shows the difference rather than asserting the
// new code agrees with itself.
//
//   node verify-poll-until.mjs

import { pollUntil } from "./lib/poll-until.js";

// ---- the loop this replaces, transcribed ---------------------------
// tile-viewer.js awaitSettled(), with the clock and the frame source
// injected so it can be driven here. Note the order: settled is
// checked before the deadline, so an already-settled wait survives a
// hidden window. It is the wait that still has work to do when the
// frames come back that fails.
function legacyWait(test, { timeoutMs = 60000, raf, now }) {
  const t0 = now();
  return new Promise((resolve, reject) => {
    const poll = () => {
      if (test()) {
        resolve();
        return;
      }
      if (now() - t0 > timeoutMs) {
        reject(new Error("awaitSettled: timed out"));
        return;
      }
      raf(poll);
    };
    raf(poll);
  });
}

// ---- a clock and a frame source we control -------------------------
function harness() {
  let t = 0;
  let queue = [];
  const intervals = [];
  function advance(dt, { frames = true } = {}) {
    const target = t + dt;
    // Timers keep firing in a hidden page even though frames do not,
    // so they run on their own schedule rather than with the frames.
    for (;;) {
      let soonest = null;
      for (const iv of intervals) {
        if (iv.dead || iv.next > target) continue;
        if (!soonest || iv.next < soonest.next) soonest = iv;
      }
      if (!soonest) break;
      t = soonest.next;
      soonest.next += soonest.ms;
      soonest.fn();
    }
    t = target;
    if (!frames) return;
    const due = queue;
    queue = [];
    for (const fn of due) fn();
  }
  return {
    raf: (fn) => queue.push(fn),
    now: () => t,
    setInterval: (fn, ms) => {
      intervals.push({ fn, ms, next: t + ms });
      return intervals.length - 1;
    },
    clearInterval: (id) => {
      if (intervals[id]) intervals[id].dead = true;
    },
    advance,
    at: () => t,
  };
}

// Run a wait to completion against a schedule of time steps.
async function drive(promise, h, steps) {
  let state = "pending";
  let value = null;
  promise.then(
    (v) => {
      state = "settled";
      value = v;
    },
    (e) => {
      state = "failed";
      value = e;
    },
  );
  // Let the first raf() registration happen.
  await flush();
  for (const step of steps) {
    h.advance(step.dt, step);
    await flush();
    if (state !== "pending") break;
  }
  return { state, value, at: h.at() };
}
const flush = async () => {
  for (let i = 0; i < 4; i++) await Promise.resolve();
};
// A window being painted: `ms` of 16ms frames.
const painting = (ms) =>
  Array.from({ length: Math.ceil(ms / 16) }, () => ({ dt: 16 }));
// A window hidden for `ms`: one long step with no frames delivered.
const hidden = (ms) => [{ dt: ms, frames: false }];

// ---- cases ---------------------------------------------------------
const results = [];
function check(name, expect, got, detail) {
  const ok = expect === got;
  results.push({ name, ok, expect, got, detail });
}

// 1. The user starts an export and switches away. 90 seconds later
//    they come back, and the map needs 320ms more to finish the frame
//    it was on. LEGACY: fails on the first frame after the pause,
//    because 90s of wall clock is past its 60s deadline. NEW:
//    resolves, having spent 320ms of its budget.
{
  let ready = false;
  const h = harness();
  const schedule = [...hidden(90_000), ...painting(500)];
  // The map finishes 320ms after the frames resume.
  let framesSeen = 0;
  const test = () => {
    if (h.at() > 90_000) framesSeen++;
    if (framesSeen * 16 >= 320) ready = true;
    return ready;
  };
  const legacy = await drive(
    legacyWait(test, { timeoutMs: 60_000, raf: h.raf, now: h.now }),
    h,
    schedule,
  );
  check("1a legacy fails after a hidden window", "failed", legacy.state,
        legacy.value?.message);

  const h2 = harness();
  let seen2 = 0;
  const test2 = () => {
    if (h2.at() > 90_000) seen2++;
    return seen2 * 16 >= 320;
  };
  const next = await drive(
    pollUntil(test2, {
      timeoutMs: 60_000,
      label: "awaitSettled",
      raf: h2.raf,
      now: h2.now,
      setInterval: h2.setInterval,
      clearInterval: h2.clearInterval,
    }),
    h2,
    [...hidden(90_000), ...painting(2000)],
  );
  check("1b the new wait survives it", "settled", next.state,
        next.value?.message);
}

// 2. The timeout still has to work. A map that genuinely never
//    settles, with frames arriving the whole time, must fail — this is
//    the case the budget exists for, and the fix must not eat it.
{
  const h = harness();
  const out = await drive(
    pollUntil(() => false, {
      timeoutMs: 5_000,
      label: "awaitSettled",
      reason: () => "3 stale tiles, 2 CPU workers busy",
      raf: h.raf,
      now: h.now,
      setInterval: h.setInterval,
      clearInterval: h.clearInterval,
    }),
    h,
    painting(20_000),
  );
  check("2a a real stall still fails", "failed", out.state, out.value?.message);
  check(
    "2b and the failure says what it was waiting for",
    true,
    /3 stale tiles, 2 CPU workers busy/.test(out.value?.message ?? ""),
    out.value?.message,
  );
  // It must fail at about its deadline, not after the whole schedule.
  check("2c at about the deadline", true, out.at <= 5_200, `t=${out.at}`);
}

// 3. Interleaved: hidden, painting, hidden again, never settling.
//    Only the painted stretches count, so a 5s budget survives two
//    long pauses and still fails on the painted time.
{
  const h = harness();
  const out = await drive(
    pollUntil(() => false, {
      timeoutMs: 5_000,
      raf: h.raf,
      now: h.now,
      setInterval: h.setInterval,
      clearInterval: h.clearInterval,
    }),
    h,
    [
      ...hidden(120_000),
      ...painting(2_000),
      ...hidden(300_000),
      ...painting(10_000),
    ],
  );
  check("3a still fails on attended time", "failed", out.state);
  check(
    "3b after the pauses, not during them",
    true,
    out.at > 420_000,
    `t=${out.at}`,
  );
}

// 4. An already-true condition resolves on the first frame rather
//    than waiting one out.
{
  const h = harness();
  const out = await drive(
    pollUntil(() => true, {
      raf: h.raf,
      now: h.now,
      setInterval: h.setInterval,
      clearInterval: h.clearInterval,
    }),
    h,
    painting(100),
  );
  check("4 an already-settled wait is immediate", "settled", out.state);
  check("4b on the first frame", true, out.at <= 16, `t=${out.at}`);
}

// 5. The pause is reported once, and the resumption once, so a
//    recording can say it is paused instead of looking wedged.
{
  const h = harness();
  const events = [];
  const out = await drive(
    pollUntil(() => h.at() > 200_000, {
      timeoutMs: 5_000,
      onStall: () => events.push("stall"),
      onResume: (dt) => events.push(`resume ${Math.round(dt / 1000)}s`),
      raf: h.raf,
      now: h.now,
      setInterval: h.setInterval,
      clearInterval: h.clearInterval,
    }),
    h,
    [...hidden(150_000), ...painting(500), ...hidden(100_000), ...painting(500)],
  );
  check("5a resolves", "settled", out.state);
  check(
    "5b one stall and one resume per pause",
    "stall,resume 150s,stall,resume 100s",
    events.join(","),
    JSON.stringify(events),
  );
}

// ---- report --------------------------------------------------------
let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(
    `${r.ok ? "PASS" : "FAIL"}  ${r.name}` +
      (r.ok ? "" : `\n        expected ${JSON.stringify(r.expect)}, got ${JSON.stringify(r.got)}`) +
      (r.detail ? `\n        ${r.detail}` : ""),
  );
}
console.log(`\n${results.length - failed}/${results.length} checks pass`);
process.exit(failed ? 1 : 0);
