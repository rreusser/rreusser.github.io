// Sequencer - Keyframe-based animation state interpolation
// Ported from the original Idyll sphere-eversion implementation

// Default easing function (cubic in-out)
function cubicInOut(t) {
  return t < 0.5
    ? 4.0 * t * t * t
    : 0.5 * Math.pow(2.0 * t - 2.0, 3.0) + 1.0;
}

// Linear easing
export function linear(t) {
  return t;
}

// Vector interpolation helpers
function lerp(a, b, t) {
  return (1.0 - t) * a + t * b;
}

function vec3Lerp(out, a, b, t) {
  out[0] = lerp(a[0], b[0], t);
  out[1] = lerp(a[1], b[1], t);
  out[2] = lerp(a[2], b[2], t);
  return out;
}

function vec4Lerp(out, a, b, t) {
  out[0] = lerp(a[0], b[0], t);
  out[1] = lerp(a[1], b[1], t);
  out[2] = lerp(a[2], b[2], t);
  out[3] = lerp(a[3], b[3], t);
  return out;
}

// Generic interpolation based on value type
function interpolate(value0, value1, t) {
  if (typeof value0 === 'number') {
    return lerp(value0, value1, t);
  }
  if (Array.isArray(value0)) {
    switch (value0.length) {
      case 2:
        return [lerp(value0[0], value1[0], t), lerp(value0[1], value1[1], t)];
      case 3:
        return vec3Lerp([], value0, value1, t);
      case 4:
        return vec4Lerp([], value0, value1, t);
      default:
        return value0.map((v, i) => lerp(v, value1[i], t));
    }
  }
  return value0;
}

/**
 * Create a sequencer that manages keyframe-based animation state
 * @param {Object} stateVars - Object mapping variable names to keyframe arrays
 *        Each keyframe is { t: number, value: any, ease?: function }
 * @param {Function} onStateChange - Optional callback when state changes
 * @returns {Object} Sequencer instance
 */
export function createSequencer(stateVars, onStateChange) {
  const stateVarNames = Object.keys(stateVars);
  const state = {};
  const changed = {};
  let currentPosition = 0;

  // Compute state at time t
  function computeState(t) {
    let hasChanges = false;

    for (let i = 0; i < stateVarNames.length; i++) {
      const stateVarName = stateVarNames[i];
      const stateVar = stateVars[stateVarName];
      const steps = Array.isArray(stateVar) ? stateVar : stateVar.steps;
      const customInterpolate = stateVar.interpolate || interpolate;

      changed[stateVarName] = false;

      // Find bounding keyframes
      let stepFrom = steps[0];
      let stepTo = steps[0];

      for (let j = 0; j < steps.length; j++) {
        stepTo = steps[j];
        if (t < stepTo.t) break;
        stepFrom = stepTo;
      }

      // Compute interpolated value
      let newValue;
      if (stepFrom === stepTo || t <= stepFrom.t) {
        newValue = stepFrom.value;
      } else if (t >= stepTo.t) {
        newValue = stepTo.value;
      } else {
        const ease = stepTo.ease || cubicInOut;
        const progress = (t - stepFrom.t) / (stepTo.t - stepFrom.t);
        newValue = customInterpolate(
          stepFrom.value,
          stepTo.value,
          ease(progress)
        );
      }

      // Check for changes
      if (!valuesEqual(newValue, state[stateVarName])) {
        changed[stateVarName] = true;
        hasChanges = true;
        state[stateVarName] = newValue;
      }
    }

    return hasChanges;
  }

  // Compare values for equality
  function valuesEqual(a, b) {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
      }
      return true;
    }
    return false;
  }

  // Initialize state at position 0
  computeState(0);

  return {
    /**
     * Set the current position and update state
     * @param {number} t - The position/time value
     */
    setPosition(t) {
      currentPosition = t;
      const hasChanges = computeState(t);
      if (hasChanges && onStateChange) {
        onStateChange(state, changed);
      }
      return this;
    },

    /**
     * Get the current position
     */
    getPosition() {
      return currentPosition;
    },

    /**
     * Get the current state object
     */
    getState() {
      return state;
    },

    /**
     * Check which variables changed in the last update
     */
    getChanged() {
      return changed;
    },

    /**
     * Add or update a keyframe for a variable
     * @param {string} name - Variable name
     * @param {number} t - Time position
     * @param {any} value - Value at this keyframe
     * @param {Object} options - Optional { ease: function }
     */
    addKeyframe(name, t, value, options = {}) {
      if (!stateVars[name]) {
        stateVars[name] = [];
        stateVarNames.push(name);
      }
      const steps = Array.isArray(stateVars[name])
        ? stateVars[name]
        : stateVars[name].steps;

      // Insert in sorted order
      const keyframe = { t, value, ...options };
      let inserted = false;
      for (let i = 0; i < steps.length; i++) {
        if (steps[i].t === t) {
          steps[i] = keyframe;
          inserted = true;
          break;
        } else if (steps[i].t > t) {
          steps.splice(i, 0, keyframe);
          inserted = true;
          break;
        }
      }
      if (!inserted) {
        steps.push(keyframe);
      }

      // Recompute current state
      computeState(currentPosition);
      return this;
    },
  };
}
