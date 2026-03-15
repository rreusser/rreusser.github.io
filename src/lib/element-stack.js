/**
 * Creates an element stack that manages multiple layered elements.
 * Supports two-phase initialization: pass an existing container to reuse elements.
 *
 * @param {Object} options
 * @param {HTMLElement} [options.container] - Container element (created if not provided)
 * @param {number} [options.width=100] - Initial width
 * @param {number} [options.height=100] - Initial height
 * @param {Array<{id: string, element: Function}>} [options.layers=[]] - Layer definitions in render order
 */
export function createElementStack({
  container = document.createElement("div"),
  width = 100,
  height = 100,
  layers = []
} = {}) {
  container.style.position = "relative";
  // Default to filling the expandable wrapper; explicit pixel size is set via resize()
  container.style.width = "100%";
  container.style.height = "100%";

  // Store state on container for reuse across reactive updates
  container._width = width;
  container._height = height;
  container._layerOrder = layers.map(l => l.id);
  container._layerDefs = Object.fromEntries(layers.map(l => [l.id, l.element]));
  container._elements = container._elements || {};

  const _elements = container._elements;

  // Render a layer, reusing existing element if available
  function renderLayer(name, extraProps = {}) {
    const layerFn = container._layerDefs[name];
    if (!layerFn) return null;

    const current = _elements[name] || null;
    const newEl = layerFn({ current, width: container._width, height: container._height, ...extraProps });

    newEl.setAttribute("data-layer", name);
    if (!newEl.style.position) newEl.style.position = "absolute";
    if (!newEl.style.top) newEl.style.top = "0";
    if (!newEl.style.left) newEl.style.left = "0";

    if (current && current !== newEl) {
      current.replaceWith(newEl);
    } else if (!current) {
      container.appendChild(newEl);
    }

    _elements[name] = newEl;
    return newEl;
  }

  // Initial render of all layers in order
  for (const name of container._layerOrder) {
    renderLayer(name);
  }

  // Create or update stack instance on container
  if (!container._stack) {
    container._stack = {
      // The container element (for display)
      get element() { return container; },

      // Current dimensions
      get width() { return container._width; },
      get height() { return container._height; },

      // Access layer elements
      get elements() { return _elements; },

      // Re-render specific layers
      update(...names) {
        for (const name of names) {
          renderLayer(name);
        }
        container.dispatchEvent(new CustomEvent("update"));
        return container._stack;
      },

      // Resize all layers
      resize(newWidth, newHeight) {
        container._width = newWidth;
        container._height = newHeight;
        container.style.width = `${newWidth}px`;
        container.style.height = `${newHeight}px`;

        // Render all layers at new size in order
        for (const name of container._layerOrder) {
          renderLayer(name);
        }
        container.dispatchEvent(new CustomEvent("update"));
        return container._stack;
      },

      // Add event listener to container
      addEventListener: (...args) => container.addEventListener(...args),
      removeEventListener: (...args) => container.removeEventListener(...args),
      dispatchEvent: (...args) => container.dispatchEvent(...args),
    };
  } else {
    // Update existing stack's layer definitions and re-render
    container._layerOrder = layers.map(l => l.id);
    container._layerDefs = Object.fromEntries(layers.map(l => [l.id, l.element]));
    for (const name of container._layerOrder) {
      renderLayer(name);
    }
  }

  return container._stack;
}
