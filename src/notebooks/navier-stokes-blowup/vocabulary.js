/**
 * The shared visual language of the notebook.
 *
 * Every figure here is showing one object -- a vortex core -- described by three
 * numbers: how wide it is, how fast it turns, and how long it lasts. The first
 * walkthrough is a single core being stretched, the schematic is that core
 * abbreviated to a glyph, the cascade is a nest of them, the plots are those
 * three numbers tabulated, and the readout is the same three live. Until they
 * shared a vocabulary none of that was visible, and the colours were actively
 * denying it: amber meant speed in one figure, "this construction" in another,
 * and the blowup time in a third.
 *
 * So each of the three quantities gets one colour and keeps it everywhere, and
 * anything that is a comparison rather than a quantity is drawn in neutral grey
 * so it cannot be mistaken for a fourth.
 */
export const ROLE = {
  /** Width, radius, extent. The size of the thing. */
  size: '#21b0c4',
  /** Velocity, turnover, how hard it is going. */
  speed: '#e8a765',
  /** Duration, elapsed time, the clock running out. */
  time: '#a78bda',
  /** The foil in a comparison: what would happen instead, or what is being beaten. */
  foil: '#8b8b93'
};

/**
 * Tints for successive generations, cycling.
 *
 * All of them are the size colour -- a generation's outline is still saying
 * "this is how big it is" -- but adjacent ones differ enough to be told apart,
 * and a generation's parcels take the same tint as its outline so it is never a
 * question which fluid belongs to which ring. Three, so the cycle repeats every
 * third generation, which is far enough apart in scale that two of a colour are
 * never confusable and close enough that the repetition reads as the structure
 * repeating.
 */
export const LEVEL_TINTS = ['#3fc8dc', '#2a93b8', '#6fd8c6'];

/**
 * A generation, as a glyph: a rounded core of the given width and length.
 *
 * This is the shape the notebook abbreviates a vortex to, and it is deliberately
 * the silhouette of the tube in the first figure, so that when the render
 * dissolves and leaves the outline behind, the reader is looking at the same
 * object rather than a new one.
 */
export function capsulePath(cx, cy, w, h) {
  const r = Math.min(w, h) / 2;
  const x = cx - w / 2, y = cy - h / 2;
  return `M ${(x + r).toFixed(2)} ${y.toFixed(2)}
          h ${(w - 2 * r).toFixed(2)}
          a ${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${r.toFixed(2)} ${r.toFixed(2)}
          v ${(h - 2 * r).toFixed(2)}
          a ${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${(-r).toFixed(2)} ${r.toFixed(2)}
          h ${(-(w - 2 * r)).toFixed(2)}
          a ${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${(-r).toFixed(2)} ${(-r).toFixed(2)}
          v ${(-(h - 2 * r)).toFixed(2)}
          a ${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${r.toFixed(2)} ${(-r).toFixed(2)} Z`;
}

/** The three quantities, always named and ordered the same way. */
export const QUANTITIES = [
  { key: 'width', label: 'width', role: 'size' },
  { key: 'speed', label: 'speed', role: 'speed' },
  { key: 'lifetime', label: 'lifetime', role: 'time' }
];
