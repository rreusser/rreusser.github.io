// Small pill-style toggle that lives in the upper-right corner of a
// figure and drives the global terrain-source radio (exposed on
// window.__sourceInputEl). Returns an absolutely positioned element;
// attach it to any figure container that is `position: relative`.

const OPTIONS = ["terrain", "geometry"];

export function createSourceToggleBadge() {
  const el = document.createElement("div");
  el.style.cssText = [
    "position:absolute",
    "top:8px",
    "right:8px",
    "display:flex",
    "gap:1px",
    "font:11px/1 ui-sans-serif,system-ui,sans-serif",
    "background:rgba(255,255,255,0.82)",
    "border:1px solid rgba(0,0,0,0.18)",
    "border-radius:4px",
    "padding:1px",
    "box-shadow:0 1px 2px rgba(0,0,0,0.12)",
    "user-select:none",
    "z-index:10",
    "backdrop-filter:blur(2px)",
  ].join(";");

  const buttons = OPTIONS.map((value) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = value;
    b.dataset.value = value;
    b.style.cssText = [
      "border:0",
      "background:transparent",
      "color:#444",
      "padding:3px 7px",
      "cursor:pointer",
      "border-radius:3px",
      "font:inherit",
      "letter-spacing:0.01em",
    ].join(";");
    el.appendChild(b);
    return b;
  });

  const sourceEl = window.__sourceInputEl;
  if (!sourceEl) {
    console.warn("source-toggle: window.__sourceInputEl not registered");
    return el;
  }

  const sync = () => {
    const v = sourceEl.value;
    for (const b of buttons) {
      const active = b.dataset.value === v;
      b.style.background = active ? "#0366d6" : "transparent";
      b.style.color = active ? "#fff" : "#444";
      b.style.fontWeight = active ? "600" : "400";
    }
  };
  sync();

  for (const b of buttons) {
    b.addEventListener("click", () => {
      if (sourceEl.value === b.dataset.value) return;
      sourceEl.value = b.dataset.value;
      sourceEl.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
  sourceEl.addEventListener("input", sync);

  return el;
}
