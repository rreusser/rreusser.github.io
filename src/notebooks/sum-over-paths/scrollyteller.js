// A generic scrollyteller: one sticky visual pinned while a column of caption
// frames scrolls past, with scroll progress driving a keyframe sequencer that
// parameterizes the visual. Repurposed from the sphere-eversion notebook.
//
// Pure DOM only (no Observable runtime globals): the caller displays the
// returned container, calls start() once it is laid out, and registers destroy()
// with the cell's invalidation.

import { createSequencer } from './sequencer.js';

export function createScrollyteller(opts) {
  const {
    frames,             // [{ html, left, right, top, bottom }]
    sequencerVars,      // keyframe spec, positions in [0, frames.length - 1]
    render,             // (ctx, state, w, h) => void   (w, h in CSS px)
    smoothing = 0.14,
    dpr = Math.min(2, window.devicePixelRatio || 1)
  } = opts;
  const frameCount = frames.length;

  const container = document.createElement('div');
  container.className = 'scrollyteller';
  const background = document.createElement('div');
  background.className = 'scrollyteller__background';
  const fixed = document.createElement('div');
  fixed.className = 'scrollyteller__fixed-content';
  const foreground = document.createElement('div');
  foreground.className = 'scrollyteller__foreground';

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:block;';
  fixed.appendChild(canvas);
  background.appendChild(fixed);
  container.appendChild(background);

  for (const f of frames) {
    const frame = document.createElement('div');
    frame.className = 'scrollyteller__frame';
    if (f && f.html) {
      const cap = document.createElement('div');
      cap.className = 'scrollyteller__caption';
      if (f.left) cap.style.left = f.left;
      if (f.right) cap.style.right = f.right;
      if (f.top) cap.style.top = f.top;
      if (f.bottom) cap.style.bottom = f.bottom;
      cap.innerHTML = f.html;
      frame.appendChild(cap);
    }
    foreground.appendChild(frame);
  }
  container.appendChild(foreground);

  const ctx = canvas.getContext('2d');
  const sequencer = createSequencer(sequencerVars);
  let smoothed = 0, raf = null, running = false;

  function sizeCanvas() {
    const w = fixed.offsetWidth || 1, h = fixed.offsetHeight || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function scrollProgress() {
    const rect = container.getBoundingClientRect();
    const sh = container.offsetHeight - window.innerHeight;
    if (sh <= 0) return 0;
    return Math.max(0, Math.min(1, -rect.top / sh));
  }

  function updateSticky() {
    const rect = container.getBoundingClientRect();
    const topAbove = rect.top <= 0;
    const bottomBelow = rect.bottom >= window.innerHeight;
    background.classList.toggle('is-fixed', topAbove && bottomBelow);
    background.classList.toggle('is-bottom', topAbove && !bottomBelow);
    return rect.top < window.innerHeight && rect.bottom > 0;
  }

  function tick() {
    if (!running) return;
    if (updateSticky()) {
      const target = scrollProgress();
      smoothed += (target - smoothed) * smoothing;
      if (Math.abs(target - smoothed) < 1e-4) smoothed = target;
      sequencer.setPosition(smoothed * (frameCount - 1));
      const w = canvas.width / dpr, h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);
      render(ctx, sequencer.getState(), w, h);
    }
    raf = requestAnimationFrame(tick);
  }

  function onResize() { sizeCanvas(); }

  return {
    container,
    canvas,
    start() {
      if (running) return;
      running = true;
      sizeCanvas();
      window.addEventListener('resize', onResize);
      raf = requestAnimationFrame(tick);
    },
    destroy() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    }
  };
}
