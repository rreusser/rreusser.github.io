// Wait for a condition that only a painted frame can advance.
//
// Two of the figure's waits are like this: "has the notebook's
// lighting tick picked up the instant I just set" and "has the map
// finished baking". Both are retired by code that runs inside
// requestAnimationFrame, so both have to be polled from inside it too
// — a promise is the wrong shape for state that nothing notifies on.
//
// The subtlety, and the reason this is a module rather than six lines
// inlined twice, is that a timeout on such a wait cannot be measured
// against the wall clock. requestAnimationFrame stops being delivered
// whenever the page is hidden or its window is fully covered, and on
// a long export the user will go and do something else. The wall
// clock keeps running while the frames do not, so a plain
// `now() - start > timeoutMs` turns "you switched windows for a
// minute" into "the map never settled", and reports it at the moment
// the user comes back and everything is in fact fine.
//
// So the budget is spent in attended time: a gap longer than
// `stallMs` between polls is not charged against it, on the grounds
// that nothing could have progressed during a gap that long anyway.
// A hidden window pauses the wait instead of failing it, and
// `onStall` / `onResume` fire around the pause so the caller can say
// as much rather than looking wedged.
//
// Everything the clock touches is injectable, which is how
// verify-poll-until.mjs drives a starved window under node.

export function pollUntil(
  test,
  {
    timeoutMs = 60000,
    stallMs = 1000,
    label = "pollUntil",
    reason = null,
    onStall = null,
    onResume = null,
    raf = (fn) => requestAnimationFrame(fn),
    now = () => performance.now(),
    setInterval: setIntervalFn = (fn, ms) => setInterval(fn, ms),
    clearInterval: clearIntervalFn = (id) => clearInterval(id),
  } = {},
) {
  return new Promise((resolve, reject) => {
    let spent = 0;
    let last = now();
    let stalled = false;
    let done = false;
    // The watchdog's only job is to notice the pause from the outside
    // and tell the caller about it. Timers still fire in a hidden
    // page (throttled, which is plenty), where frames do not.
    const watchdog = setIntervalFn(() => {
      if (done || stalled) return;
      if (now() - last > stallMs) {
        stalled = true;
        onStall?.();
      }
    }, stallMs);
    const finish = (fn, arg) => {
      done = true;
      clearIntervalFn(watchdog);
      fn(arg);
    };
    const poll = () => {
      if (done) return;
      const t = now();
      const dt = t - last;
      last = t;
      // Charge only the gaps short enough to have been real frames.
      if (dt <= stallMs) {
        spent += dt;
      } else if (stalled) {
        stalled = false;
        onResume?.(dt);
      }
      if (test()) {
        finish(resolve);
        return;
      }
      if (spent > timeoutMs) {
        const why = reason?.();
        finish(
          reject,
          new Error(
            `${label}: timed out after ${(spent / 1000).toFixed(1)}s` +
              (why ? ` waiting for ${why}` : ""),
          ),
        );
        return;
      }
      raf(poll);
    };
    raf(poll);
  });
}
