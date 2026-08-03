// Keyframe-based state interpolation for scroll-driven figures.
// Ported from the sphere-eversion notebook.

function cubicInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 0.5 * Math.pow(2 * t - 2, 3) + 1;
}
export function linear(t) { return t; }

function lerp(a, b, t) { return (1 - t) * a + t * b; }

function interpolate(v0, v1, t) {
  if (typeof v0 === 'number') return lerp(v0, v1, t);
  if (Array.isArray(v0)) return v0.map((v, i) => lerp(v, v1[i], t));
  return v0;
}

/**
 * @param {Object} stateVars  name -> array of { t, value, ease? } keyframes
 * @returns sequencer with setPosition(t) / getState()
 */
export function createSequencer(stateVars) {
  const names = Object.keys(stateVars);
  const state = {};
  let position = 0;

  function computeState(t) {
    for (const name of names) {
      const steps = stateVars[name];
      let from = steps[0], to = steps[0];
      for (let j = 0; j < steps.length; j++) {
        to = steps[j];
        if (t < to.t) break;
        from = to;
      }
      if (from === to || t <= from.t) state[name] = from.value;
      else if (t >= to.t) state[name] = to.value;
      else {
        const ease = to.ease || cubicInOut;
        const p = (t - from.t) / (to.t - from.t);
        state[name] = interpolate(from.value, to.value, ease(p));
      }
    }
  }

  computeState(0);
  return {
    setPosition(t) { position = t; computeState(t); return this; },
    getPosition() { return position; },
    getState() { return state; }
  };
}
