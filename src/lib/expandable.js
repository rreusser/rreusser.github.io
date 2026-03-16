/**
 * Creates an expandable wrapper for content that can pop out to cover more of the page.
 *
 * ## Sizing contract
 *
 * `expandable()` owns the size of its box. It always sets an explicit `width` and
 * `height` on `contentWrapper` so that content can use `width: 100%; height: 100%`
 * (or `position: absolute; inset: 0`) to fill it reliably without JS.
 *
 * For content that needs explicit pixel dimensions (WebGL canvases, element stacks),
 * provide an `onResize(el, w, h, expanded)` callback. It is called:
 *   - Once on first layout (via ResizeObserver on the unstyled container div)
 *   - On every window resize in collapsed state
 *   - On expand and collapse
 *
 * The single rule for notebook authors: **do not set width/height on your content
 * element**. Let expandable size the wrapper; use CSS `100%` or `onResize`.
 *
 * @param {HTMLElement} content - The content element to wrap
 * @param {Object} options
 * @param {number} options.width - Nominal width (used for aspect ratio)
 * @param {number} options.height - Nominal height (used for aspect ratio)
 * @param {number[]} [options.toggleOffset=[8,8]] - Offset [right, top] for the button bar
 * @param {number|number[]} [options.margin=0] - Margin from viewport edge when expanded
 * @param {number|number[]} [options.padding=0] - Padding inside expanded container
 * @param {Function} [options.onResize] - Called with (content, width, height, expanded)
 * @param {string|HTMLElement|Array} [options.controls] - Controls to show in expanded panel
 * @param {Object} [options.state] - External state object with `expanded` boolean
 * @param {boolean} [options.wide=false] - Bleed figure beyond article column width
 * @param {number} [options.maxWidth=1200] - Max width for wide layout
 * @param {number} [options.aspectRatio] - Override aspect ratio for wide layout
 * @param {Array} [options.buttons] - Extra buttons: { icon, title, onClick }
 * @param {string} [options.id] - Hash fragment identifier (e.g. 'my-figure' → #my-figure). Auto-generated as fig-1, fig-2, etc. if omitted.
 * @returns {HTMLElement} The expandable container element
 */
const svgIcon = (d, {viewBox = '0 0 16 16', strokeWidth = 1.5} = {}) =>
  `<svg width="16" height="16" viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

const ICON_EXPAND = svgIcon(
  '<polyline points="10 2 14 2 14 6"/><polyline points="6 14 2 14 2 10"/><line x1="14" y1="2" x2="9" y2="7"/><line x1="2" y1="14" x2="7" y2="9"/>'
);

const ICON_CLOSE = svgIcon(
  '<line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/>'
);

export const ICON_CAMERA = svgIcon(
  '<rect x="2" y="4" width="12" height="9" rx="1"/><circle cx="8" cy="8.5" r="2.5"/><path d="M5.5 4 L6.5 2 L9.5 2 L10.5 4"/>'
);

export const ICON_ORBIT = svgIcon(
  '<ellipse cx="8" cy="8" rx="6" ry="6"/><ellipse cx="8" cy="8" rx="6" ry="2.5"/><ellipse cx="8" cy="8" rx="2.5" ry="6" transform="rotate(90 8 8)"/>'
, {strokeWidth: 1.25});

export const ICON_ARCBALL = svgIcon(
  '<circle cx="8" cy="8" r="6"/><path d="M4 5.5 Q8 8.5 12 5.5"/><path d="M4 10.5 Q8 7.5 12 10.5"/><path d="M5.5 4 Q8.5 8 5.5 12"/><path d="M10.5 4 Q7.5 8 10.5 12"/>'
, {strokeWidth: 1.25});

let _expandableCounter = 0;

export function expandable(content, {
  width, height,
  toggleOffset = [8, 8],
  margin = 0,
  padding = 0,
  onResize,
  controls,
  state,
  wide = false,
  maxWidth = 1200,
  aspectRatio,
  buttons = [],
  id
}) {
  const hashId = id || `fig-${++_expandableCounter}`;
  const hashFragment = `#${hashId}`;

  // Check if this expandable should start expanded based on the URL hash
  const hashExpanded = window.location.hash === hashFragment;
  let expanded = hashExpanded || state?.expanded || false;
  let currentWidth = 0;
  let currentHeight = 0;
  let controlsPanelExpanded = false;
  let controlsPanelPosition = { x: 16, y: 16 };
  let floatingPanel = null;
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };

  const controlsArray = controls
    ? (Array.isArray(controls) ? controls : [controls])
    : [];
  const controlsState = [];
  let controlsObserver = null;

  // ============================================================
  // DOM structure
  //
  // container: unstyled block div. The browser sizes it to the article column
  //   width naturally. We ONLY read from it — never write width/height to it.
  //
  // contentWrapper: explicitly sized box. We always write width + height to it.
  //   Content fills it with width/height: 100%, or position: absolute; inset: 0.
  // ============================================================

  const container = document.createElement('div');
  container.className = 'expandable-container';
  container.id = hashId;

  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'expandable-content';

  const overlay = document.createElement('div');
  overlay.className = 'expandable-overlay';
  overlay.addEventListener('click', () => collapse());

  // ============================================================
  // Collapsed sizing
  //
  // applyCollapsedSize() is the single function that sizes the collapsed box.
  // It reads container.offsetWidth (true available width), computes dimensions,
  // writes to contentWrapper, and calls onResize. Nothing else sets collapsed size.
  // ============================================================

  function applyCollapsedSize() {
    if (expanded) return;

    const colWidth = container.offsetWidth;
    if (!colWidth) return;  // not in DOM yet

    let w, h, marginLeft = 0;

    if (wide) {
      w = Math.min(maxWidth, window.innerWidth - 40);
      const refWidth = document.querySelector('.observablehq--cell')?.offsetWidth || colWidth;
      marginLeft = (refWidth - w) / 2;
    } else {
      w = Math.min(width, colWidth);
    }
    // For wide layout: use aspectRatio if given, otherwise use height directly
    // (fixed height regardless of figure width — appropriate for wide cinematic figures).
    // For normal layout: scale height proportionally with width.
    h = aspectRatio ? Math.round(w / aspectRatio) : (wide ? height : Math.round(height * w / width));

    contentWrapper.style.width = `${w}px`;
    contentWrapper.style.height = `${h}px`;
    contentWrapper.style.marginLeft = marginLeft ? `${marginLeft}px` : '';

    if (w !== currentWidth || h !== currentHeight) {
      currentWidth = w;
      currentHeight = h;
      if (onResize) onResize(content, w, h, false);
    }

    // Set container height to the full scroll height of contentWrapper, which
    // includes any figcaption or other content that overflows the canvas area.
    // This must happen after onResize so the canvas is correctly sized first.
    container.style.height = `${contentWrapper.scrollHeight}px`;
  }

  // contentWrapper is position:absolute so it doesn't affect container's layout size.
  // This means container shrinks freely with the viewport, and the ResizeObserver
  // fires correctly without any feedback loop from our own width/height writes.
  contentWrapper.style.position = 'absolute';
  container.style.position = 'relative';

  const resizeObserver = new ResizeObserver(() => {
    if (!expanded) applyCollapsedSize();
  });
  resizeObserver.observe(container);

  // ============================================================
  // Button bar
  // ============================================================

  const buttonBar = document.createElement('div');
  buttonBar.className = 'expandable-button-bar';
  buttonBar.style.top = `${-toggleOffset[1]}px`;
  buttonBar.style.right = `${-toggleOffset[0]}px`;

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'expandable-toggle';
  toggleBtn.innerHTML = ICON_EXPAND;
  toggleBtn.title = 'Expand';

  const customButtons = buttons.map((btn) => {
    const button = document.createElement('button');
    button.className = 'expandable-toggle expandable-custom-button';
    button.innerHTML = btn.icon;
    button.title = btn.title;
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      btn.onClick(content, expanded, button);
    });
    return button;
  });
  customButtons.forEach(btn => buttonBar.appendChild(btn));
  buttonBar.appendChild(toggleBtn);

  // ============================================================
  // Controls panel
  // ============================================================

  if (controlsArray.length > 0) {
    floatingPanel = document.createElement('div');
    floatingPanel.className = 'expandable-controls-panel';
    floatingPanel.style.display = 'none';

    const panelHeader = document.createElement('div');
    panelHeader.className = 'expandable-controls-header';
    const panelTitle = document.createElement('span');
    panelTitle.textContent = 'Controls';
    const panelToggle = document.createElement('button');
    panelToggle.className = 'expandable-controls-toggle';
    panelToggle.innerHTML = '▼';
    panelToggle.title = 'Collapse controls';
    panelToggle.addEventListener('click', (e) => { e.stopPropagation(); toggleControlsPanel(); });
    panelHeader.appendChild(panelTitle);
    panelHeader.appendChild(panelToggle);

    const panelContent = document.createElement('div');
    panelContent.className = 'expandable-controls-content';

    floatingPanel.appendChild(panelHeader);
    floatingPanel.appendChild(panelContent);

    panelHeader.addEventListener('mousedown', (e) => {
      if (e.target === panelToggle) return;
      isDragging = true;
      dragStart.x = e.clientX - controlsPanelPosition.x;
      dragStart.y = e.clientY - controlsPanelPosition.y;
      panelHeader.style.cursor = 'grabbing';
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      controlsPanelPosition.x = e.clientX - dragStart.x;
      controlsPanelPosition.y = e.clientY - dragStart.y;
      clampPanelPosition();
      updatePanelPosition();
    });
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        const header = floatingPanel?.querySelector('.expandable-controls-header');
        if (header) header.style.cursor = 'move';
      }
    });
    panelHeader.addEventListener('touchstart', (e) => {
      if (e.target === panelToggle) return;
      isDragging = true;
      const touch = e.touches[0];
      dragStart.x = touch.clientX - controlsPanelPosition.x;
      dragStart.y = touch.clientY - controlsPanelPosition.y;
      e.preventDefault();
    }, { passive: false });
    document.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      controlsPanelPosition.x = touch.clientX - dragStart.x;
      controlsPanelPosition.y = touch.clientY - dragStart.y;
      clampPanelPosition();
      updatePanelPosition();
    }, { passive: true });
    document.addEventListener('touchend', () => { isDragging = false; });
  }

  function clampPanelPosition() {
    if (!floatingPanel) return;
    const rect = floatingPanel.getBoundingClientRect();
    controlsPanelPosition.x = Math.max(0, Math.min(controlsPanelPosition.x, window.innerWidth - rect.width));
    controlsPanelPosition.y = Math.max(0, Math.min(controlsPanelPosition.y, window.innerHeight - rect.height));
  }

  function updatePanelPosition() {
    if (floatingPanel && expanded) {
      floatingPanel.style.left = `${controlsPanelPosition.x}px`;
      floatingPanel.style.top = `${controlsPanelPosition.y}px`;
    }
  }

  function toggleControlsPanel() {
    controlsPanelExpanded = !controlsPanelExpanded;
    if (!floatingPanel) return;
    const pc = floatingPanel.querySelector('.expandable-controls-content');
    const pt = floatingPanel.querySelector('.expandable-controls-toggle');
    if (controlsPanelExpanded) {
      if (pc) pc.style.display = 'flex';
      if (pt) { pt.innerHTML = '▼'; pt.title = 'Collapse controls'; }
    } else {
      if (pc) pc.style.display = 'none';
      if (pt) { pt.innerHTML = '▶'; pt.title = 'Expand controls'; }
    }
  }

  function restoreControls() {
    for (let i = controlsState.length - 1; i >= 0; i--) {
      const s = controlsState[i];
      if (!s) continue;
      if (s.placeholder?.parentNode) s.placeholder.parentNode.removeChild(s.placeholder);
      if (s.selector) {
        const existing = document.querySelector(s.selector);
        if (existing && existing !== s.element) {
          if (s.element.parentNode) s.element.parentNode.removeChild(s.element);
          continue;
        }
      }
      if (s.element && s.originalParent) {
        if (s.originalNextSibling) s.originalParent.insertBefore(s.element, s.originalNextSibling);
        else s.originalParent.appendChild(s.element);
      }
    }
    controlsState.length = 0;
  }

  function startControlsObserver() {
    if (controlsObserver) return;
    controlsObserver = new MutationObserver(() => {
      if (!expanded || !floatingPanel) return;
      const panelContent = floatingPanel.querySelector('.expandable-controls-content');
      if (!panelContent) return;
      for (const s of controlsState) {
        if (!s.selector) continue;
        const newEl = document.querySelector(s.selector);
        if (newEl && newEl !== s.element && !panelContent.contains(newEl)) {
          const old = s.element;
          s.element = newEl;
          s.originalParent = newEl.parentNode;
          s.originalNextSibling = newEl.nextSibling;
          const newPH = document.createElement('div');
          newPH.className = 'expandable-controls-placeholder';
          newPH.style.display = 'none';
          newEl.parentNode.insertBefore(newPH, newEl);
          if (s.placeholder?.parentNode) s.placeholder.parentNode.removeChild(s.placeholder);
          s.placeholder = newPH;
          if (old.parentNode === panelContent) { panelContent.insertBefore(newEl, old); panelContent.removeChild(old); }
          else panelContent.appendChild(newEl);
        }
      }
    });
    controlsObserver.observe(document.body, { childList: true, subtree: true });
  }

  function stopControlsObserver() {
    if (controlsObserver) { controlsObserver.disconnect(); controlsObserver = null; }
  }

  // ============================================================
  // Expand / collapse
  // ============================================================

  function updateExpandedPosition() {
    if (!expanded) return;
    const [hMargin, vMargin] = Array.isArray(margin) ? margin : [margin, margin];
    const [hPadding, vPadding] = Array.isArray(padding) ? padding : [padding, padding];
    const expandedWidth = window.innerWidth - hMargin * 2 - hPadding * 2;
    const expandedHeight = window.innerHeight - vMargin * 2 - vPadding * 2;
    const outerWidth = expandedWidth + hPadding * 2;
    const outerHeight = expandedHeight + vPadding * 2;

    contentWrapper.style.position = 'fixed';
    contentWrapper.style.display = 'block';
    contentWrapper.style.width = `${outerWidth}px`;
    contentWrapper.style.height = `${outerHeight}px`;
    contentWrapper.style.marginLeft = '0';
    contentWrapper.style.overflow = 'hidden';
    contentWrapper.style.zIndex = '9999';

    const isFullBleed = hMargin === 0 && vMargin === 0;
    contentWrapper.style.top = isFullBleed ? '0' : `${vMargin}px`;
    contentWrapper.style.left = isFullBleed ? '0' : `${hMargin}px`;
    contentWrapper.style.transform = 'none';
    contentWrapper.style.borderRadius = isFullBleed ? '0' : '8px';
    contentWrapper.style.boxShadow = isFullBleed ? 'none' : '0 8px 32px rgba(0,0,0,0.3)';
    contentWrapper.classList.add('expanded');
    contentWrapper.style.padding = `${vPadding}px ${hPadding}px`;

    const figure = contentWrapper.querySelector('figure');
    if (figure) figure.style.margin = '0';

    if (expandedWidth !== currentWidth || expandedHeight !== currentHeight) {
      currentWidth = expandedWidth;
      currentHeight = expandedHeight;
      if (onResize) onResize(content, expandedWidth, expandedHeight, true);
    }
  }

  function expand() {
    expanded = true;
    if (state) state.expanded = true;
    history.replaceState(null, '', hashFragment);
    container.classList.add('expandable-expanded');
    toggleBtn.innerHTML = ICON_CLOSE;
    toggleBtn.title = 'Collapse';
    buttonBar.style.top = '8px';
    buttonBar.style.right = '8px';

    if (!overlay.parentNode) document.body.appendChild(overlay);
    overlay.style.opacity = '1';
    overlay.style.pointerEvents = 'auto';

    container.style.height = `${container.offsetHeight}px`;

    if (controlsArray.length > 0 && floatingPanel) {
      const panelContent = floatingPanel.querySelector('.expandable-controls-content');
      if (panelContent) {
        for (const ctrl of controlsArray) {
          const el = typeof ctrl === 'string' ? document.querySelector(ctrl) : ctrl;
          if (!el || !el.parentNode) continue;
          const placeholder = document.createElement('div');
          placeholder.className = 'expandable-controls-placeholder';
          placeholder.style.height = `${el.offsetHeight}px`;
          placeholder.style.display = 'block';
          controlsState.push({ element: el, selector: typeof ctrl === 'string' ? ctrl : null, originalParent: el.parentNode, originalNextSibling: el.nextSibling, placeholder });
          el.parentNode.insertBefore(placeholder, el);
          panelContent.appendChild(el);
        }
      }
      if (controlsState.length > 0) {
        if (!floatingPanel.parentNode) document.body.appendChild(floatingPanel);
        floatingPanel.classList.add('expandable-expanded');
        floatingPanel.style.display = '';
        floatingPanel.style.left = `${controlsPanelPosition.x}px`;
        floatingPanel.style.top = `${controlsPanelPosition.y}px`;
        const isMobile = window.innerWidth < 640;
        controlsPanelExpanded = !isMobile;
        const pc = floatingPanel.querySelector('.expandable-controls-content');
        const pt = floatingPanel.querySelector('.expandable-controls-toggle');
        if (controlsPanelExpanded) {
          if (pc) pc.style.display = 'flex';
          if (pt) { pt.innerHTML = '▼'; pt.title = 'Collapse controls'; }
        } else {
          if (pc) pc.style.display = 'none';
          if (pt) { pt.innerHTML = '▶'; pt.title = 'Expand controls'; }
        }
      }
    }

    updateExpandedPosition();
    startControlsObserver();
  }

  function collapse() {
    expanded = false;
    if (state) state.expanded = false;
    if (window.location.hash === hashFragment) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    container.classList.remove('expandable-expanded');
    toggleBtn.innerHTML = ICON_EXPAND;
    toggleBtn.title = 'Expand';
    buttonBar.style.top = `${-toggleOffset[1]}px`;
    buttonBar.style.right = `${-toggleOffset[0]}px`;

    if (overlay.parentNode) overlay.remove();
    stopControlsObserver();
    if (floatingPanel) {
      floatingPanel.classList.remove('expandable-expanded');
      floatingPanel.style.display = 'none';
      restoreControls();
    }

    container.style.height = '';

    // Reset all inline styles set during expand, then reapply collapsed size.
    // Keep position:absolute — that's the collapsed default, not an expanded override.
    contentWrapper.style.position = 'absolute';
    contentWrapper.style.display = '';
    contentWrapper.style.top = '';
    contentWrapper.style.left = '';
    contentWrapper.style.transform = '';
    contentWrapper.style.overflow = '';
    contentWrapper.style.boxShadow = '';
    contentWrapper.style.padding = '';
    contentWrapper.style.borderRadius = '';
    contentWrapper.style.zIndex = '';
    contentWrapper.classList.remove('expanded');

    // Reset tracked dims so applyCollapsedSize always fires onResize after collapse
    currentWidth = 0;
    currentHeight = 0;
    applyCollapsedSize();

    window.dispatchEvent(new Event('resize'));
  }

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    expanded ? collapse() : expand();
  });

  const handleResize = () => {
    if (expanded) updateExpandedPosition();
    else if (wide) applyCollapsedSize();
  };
  window.addEventListener('resize', handleResize);

  const handleKeydown = (e) => { if (e.key === 'Escape' && expanded) collapse(); };
  document.addEventListener('keydown', handleKeydown);

  // ============================================================
  // Assembly
  // ============================================================

  if (typeof content === 'function') content = content();
  if (typeof content === 'string') {
    const temp = document.createElement('div');
    temp.innerHTML = content;
    content = temp.firstElementChild || temp;
  }

  contentWrapper.appendChild(content);
  contentWrapper.appendChild(buttonBar);
  container.appendChild(contentWrapper);

  const domObserver = new MutationObserver(() => {
    if (!document.contains(container)) {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('keydown', handleKeydown);
      resizeObserver.disconnect();
      stopControlsObserver();
      if (overlay.parentNode) overlay.remove();
      restoreControls();
      if (floatingPanel?.parentNode) floatingPanel.remove();
      if (window.location.hash === hashFragment) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      domObserver.disconnect();
    }
  });
  domObserver.observe(document.body, { childList: true, subtree: true });

  Object.defineProperty(container, 'expandedDimensions', {
    get: () => ({ width: currentWidth, height: currentHeight, expanded })
  });

  if (expanded) requestAnimationFrame(() => expand());

  return container;
}
