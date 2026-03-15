/**
 * Creates an expandable wrapper for content that can pop out to cover more of the page.
 *
 * @param {HTMLElement|string} content - The content element to wrap
 * @param {Object} options - Configuration options
 * @param {number} options.width - Default width when collapsed
 * @param {number} options.height - Default height when collapsed
 * @param {number[]} [options.toggleOffset=[8,8]] - Offset [right, top] for the toggle button
 * @param {number|number[]} [options.margin=0] - Margin from viewport edge when expanded. Single number or [horizontal, vertical].
 * @param {number|number[]} [options.padding=0] - Padding inside the expanded container. Single number or [horizontal, vertical].
 * @param {Function} [options.onResize] - Optional callback when dimensions change: (content, width, height, expanded) => void
 * @param {string|HTMLElement|Array<string|HTMLElement>} [options.controls] - Controls to float over expanded content.
 *   Can be a CSS selector string, an HTMLElement, or an array of either.
 * @param {Object} [options.state] - Optional external state object to persist expanded state across re-renders.
 *   Should have an `expanded` property (boolean).
 * @param {boolean} [options.wide=false] - When true, figure expands beyond article bounds with negative margins.
 * @param {number} [options.maxWidth] - Maximum width when using wide layout (default: 1200).
 * @param {number} [options.aspectRatio] - Aspect ratio (width/height) to maintain when using wide layout.
 * @param {Array<Object>} [options.buttons] - Custom buttons to add next to expand button.
 *   Each button: { icon: string, title: string, onClick: (content, expanded) => void }
 * @returns {HTMLElement} The expandable container
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

export function expandable(content, { width, height, toggleOffset = [8, 8], margin = 0, padding = 0, onResize, controls, state, wide = false, maxWidth = 1200, aspectRatio, buttons = [] }) {
  // Use external state if provided, otherwise local state
  let expanded = state?.expanded ?? false;
  let currentWidth = width;
  let currentHeight = height;
  let controlsPanelExpanded = false;
  let controlsPanelPosition = { x: 16, y: 16 };
  let floatingPanel = null;
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };

  // Normalize controls to array
  const controlsArray = controls
    ? (Array.isArray(controls) ? controls : [controls])
    : [];

  // Track original locations of controls for restoration (one entry per control)
  const controlsState = [];

  // MutationObserver to detect when Observable recreates elements while expanded
  let controlsObserver = null;

  // Outer container maintains document flow
  const container = document.createElement('div');
  container.className = 'expandable-container';

  // Content wrapper - positions the content
  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'expandable-content';

  // Overlay backdrop for expanded state
  const overlay = document.createElement('div');
  overlay.className = 'expandable-overlay';
  overlay.addEventListener('click', () => collapse());

  // Create floating panel for controls (created once, reused)
  if (controlsArray.length > 0) {
    floatingPanel = document.createElement('div');
    floatingPanel.className = 'expandable-controls-panel';
    floatingPanel.style.display = 'none';

    // Draggable header
    const panelHeader = document.createElement('div');
    panelHeader.className = 'expandable-controls-header';

    const panelTitle = document.createElement('span');
    panelTitle.textContent = 'Controls';

    const panelToggle = document.createElement('button');
    panelToggle.className = 'expandable-controls-toggle';
    panelToggle.innerHTML = '▼';
    panelToggle.title = 'Collapse controls';
    panelToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleControlsPanel();
    });

    panelHeader.appendChild(panelTitle);
    panelHeader.appendChild(panelToggle);

    // Content area
    const panelContent = document.createElement('div');
    panelContent.className = 'expandable-controls-content';

    floatingPanel.appendChild(panelHeader);
    floatingPanel.appendChild(panelContent);

    // Drag functionality
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

    // Touch support
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

    document.addEventListener('touchend', () => {
      isDragging = false;
    });
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
    const content = floatingPanel.querySelector('.expandable-controls-content');
    const toggle = floatingPanel.querySelector('.expandable-controls-toggle');
    if (controlsPanelExpanded) {
      if (content) content.style.display = 'flex';
      if (toggle) {
        toggle.innerHTML = '▼';
        toggle.title = 'Collapse controls';
      }
    } else {
      if (content) content.style.display = 'none';
      if (toggle) {
        toggle.innerHTML = '▶';
        toggle.title = 'Expand controls';
      }
    }
  }

  // Restore all controls to their original locations
  function restoreControls() {
    // Restore in reverse order to maintain correct sibling relationships
    for (let i = controlsState.length - 1; i >= 0; i--) {
      const state = controlsState[i];
      if (!state) continue;

      // Remove placeholder if it exists
      if (state.placeholder && state.placeholder.parentNode) {
        state.placeholder.parentNode.removeChild(state.placeholder);
      }

      // Check if Observable recreated this element while we had it in the panel
      // If a new element with the same selector exists, don't restore the stale one
      if (state.selector) {
        const existingElement = document.querySelector(state.selector);
        if (existingElement && existingElement !== state.element) {
          // Observable created a new element - just remove our stale one from panel
          if (state.element.parentNode) {
            state.element.parentNode.removeChild(state.element);
          }
          continue;
        }
      }

      // Move control back to original location
      if (state.element && state.originalParent) {
        if (state.originalNextSibling) {
          state.originalParent.insertBefore(state.element, state.originalNextSibling);
        } else {
          state.originalParent.appendChild(state.element);
        }
      }
    }
    controlsState.length = 0;
  }

  // Start observing for element recreation (Observable reactivity)
  function startControlsObserver() {
    if (controlsObserver) return;

    controlsObserver = new MutationObserver((mutations) => {
      if (!expanded || !floatingPanel) return;

      const panelContent = floatingPanel.querySelector('.expandable-controls-content');
      if (!panelContent) return;

      // Check each selector-based control for recreation
      for (const state of controlsState) {
        if (!state.selector) continue;

        // Look for a new element matching the selector that isn't our current one
        const newElement = document.querySelector(state.selector);
        if (newElement && newElement !== state.element && !panelContent.contains(newElement)) {
          // Observable recreated this element - swap it into the panel
          const oldElement = state.element;

          // Update state to track new element
          state.element = newElement;
          state.originalParent = newElement.parentNode;
          state.originalNextSibling = newElement.nextSibling;

          // Create new placeholder for the new element's location
          const newPlaceholder = document.createElement('div');
          newPlaceholder.className = 'expandable-controls-placeholder';
          newPlaceholder.style.display = 'none';
          newElement.parentNode.insertBefore(newPlaceholder, newElement);

          // Remove old placeholder
          if (state.placeholder && state.placeholder.parentNode) {
            state.placeholder.parentNode.removeChild(state.placeholder);
          }
          state.placeholder = newPlaceholder;

          // Move new element to panel where old one was
          if (oldElement.parentNode === panelContent) {
            panelContent.insertBefore(newElement, oldElement);
            panelContent.removeChild(oldElement);
          } else {
            panelContent.appendChild(newElement);
          }
        }
      }
    });

    controlsObserver.observe(document.body, { childList: true, subtree: true });
  }

  function stopControlsObserver() {
    if (controlsObserver) {
      controlsObserver.disconnect();
      controlsObserver = null;
    }
  }

  // Button container for grouped styling
  const buttonBar = document.createElement('div');
  buttonBar.className = 'expandable-button-bar';
  buttonBar.style.top = `${-toggleOffset[1]}px`;
  buttonBar.style.right = `${-toggleOffset[0]}px`;

  // Toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'expandable-toggle';
  toggleBtn.innerHTML = ICON_EXPAND;
  toggleBtn.title = 'Expand';

  // Custom buttons
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

  // Add all buttons to the bar (custom buttons first, then toggle)
  customButtons.forEach(btn => buttonBar.appendChild(btn));
  buttonBar.appendChild(toggleBtn);

  // Handle function content (call it to get the element)
  if (typeof content === 'function') {
    content = content();
  }
  // Handle string content
  if (typeof content === 'string') {
    const temp = document.createElement('div');
    temp.innerHTML = content;
    content = temp.firstElementChild || temp;
  }

  contentWrapper.appendChild(content);
  contentWrapper.appendChild(buttonBar);
  container.appendChild(contentWrapper);

  // Wide/breakout layout: expand figure beyond article bounds
  function updateWideLayout() {
    if (!wide || expanded) return;

    const viewportWidth = window.innerWidth;
    const figureWidth = Math.min(maxWidth, viewportWidth - 40);
    const figureHeight = aspectRatio ? Math.round(figureWidth / aspectRatio) : height;

    // Use first cell as stable reference for article width
    const refWidth = document.querySelector('.observablehq--cell')?.offsetWidth || 640;
    const marginLeft = (refWidth - figureWidth) / 2;

    contentWrapper.style.width = `${figureWidth}px`;
    contentWrapper.style.height = `${figureHeight}px`;
    contentWrapper.style.marginLeft = `${marginLeft}px`;

    // Update current dimensions and notify
    if (figureWidth !== currentWidth || figureHeight !== currentHeight) {
      currentWidth = figureWidth;
      currentHeight = figureHeight;
      if (onResize) {
        onResize(content, figureWidth, figureHeight, false);
      }
    }
  }

  // Call onResize immediately to initialize content at the correct size
  if (wide) {
    // For wide layout, defer to updateWideLayout
    requestAnimationFrame(updateWideLayout);
  } else if (onResize) {
    onResize(content, width, height, false);
  }

  // Measure actual content height after it's in the DOM
  let collapsedHeight = null;
  function measureCollapsedHeight() {
    if (!expanded && container.isConnected) {
      collapsedHeight = container.offsetHeight;
    }
  }

  // Use requestAnimationFrame to measure after render
  requestAnimationFrame(() => {
    measureCollapsedHeight();
  });

  function setDimensions(newWidth, newHeight) {
    currentWidth = newWidth;
    currentHeight = newHeight;
    if (onResize) {
      onResize(content, newWidth, newHeight, expanded);
    }
  }

  function collapse() {
    expanded = false;
    if (state) state.expanded = false;
    container.classList.remove('expandable-expanded');
    toggleBtn.innerHTML = ICON_EXPAND;
    toggleBtn.title = 'Expand';
    buttonBar.style.top = `${-toggleOffset[1]}px`;
    buttonBar.style.right = `${-toggleOffset[0]}px`;

    // Remove overlay from DOM entirely (iOS Safari caches overscroll appearance)
    if (overlay.parentNode) {
      overlay.remove();
    }

    // Stop watching for element recreation
    stopControlsObserver();

    // Hide floating panel and restore controls
    if (floatingPanel) {
      floatingPanel.classList.remove('expandable-expanded');
      floatingPanel.style.display = 'none';
      restoreControls();
    }

    // Reset container height
    container.style.height = '';

    // Reset content wrapper positioning
    contentWrapper.style.position = 'relative';
    contentWrapper.style.display = 'inline-block';
    contentWrapper.style.top = '';
    contentWrapper.style.left = '';
    contentWrapper.style.transform = '';
    contentWrapper.style.width = `${width}px`;
    contentWrapper.style.height = `${height}px`;
    contentWrapper.style.marginLeft = '';
    contentWrapper.style.overflow = '';
    contentWrapper.style.boxShadow = '';
    contentWrapper.classList.remove('expanded');
    contentWrapper.style.padding = '';
    contentWrapper.style.borderRadius = '';
    contentWrapper.style.zIndex = '1';

    // For wide layout, reapply breakout styles; otherwise use default dimensions
    if (wide) {
      requestAnimationFrame(updateWideLayout);
    } else {
      setDimensions(width, height);
    }

    // Dispatch resize event so notebook layout handlers can update
    window.dispatchEvent(new Event('resize'));

    // Re-measure collapsed height after resize settles
    requestAnimationFrame(() => {
      measureCollapsedHeight();
    });
  }

  function updateExpandedPosition() {
    if (!expanded) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Normalize margin and padding to [horizontal, vertical]
    const [hMargin, vMargin] = Array.isArray(margin) ? margin : [margin, margin];
    const [hPadding, vPadding] = Array.isArray(padding) ? padding : [padding, padding];

    const expandedWidth = viewportWidth - hMargin * 2 - hPadding * 2;
    const expandedHeight = viewportHeight - vMargin * 2 - vPadding * 2;

    const outerWidth = expandedWidth + hPadding * 2;
    const outerHeight = expandedHeight + vPadding * 2;

    // Position content wrapper (reset wide layout margins)
    contentWrapper.style.position = 'fixed';
    contentWrapper.style.display = 'block';
    contentWrapper.style.width = `${outerWidth}px`;
    contentWrapper.style.height = `${outerHeight}px`;
    contentWrapper.style.overflow = 'hidden';
    contentWrapper.style.zIndex = '9999';
    contentWrapper.style.marginLeft = '0';

    const isFullBleed = hMargin === 0 && vMargin === 0;
    if (isFullBleed) {
      // Full-bleed: pin to edges, no rounded corners
      contentWrapper.style.top = '0';
      contentWrapper.style.left = '0';
      contentWrapper.style.transform = 'none';
      contentWrapper.style.borderRadius = '0';
      contentWrapper.style.boxShadow = 'none';
    } else {
      // Centered with margins
      contentWrapper.style.top = `${vMargin}px`;
      contentWrapper.style.left = `${hMargin}px`;
      contentWrapper.style.transform = 'none';
      contentWrapper.style.borderRadius = '8px';
      contentWrapper.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
    }
    contentWrapper.classList.add('expanded');
    contentWrapper.style.padding = `${vPadding}px ${hPadding}px`;

    // Zero figure margins for proper centering in expanded mode
    const figure = contentWrapper.querySelector('figure');
    if (figure) {
      figure.style.margin = '0';
    }

    // Trigger resize callback to size content
    setDimensions(expandedWidth, expandedHeight);
  }

  function expand() {
    expanded = true;
    if (state) state.expanded = true;
    container.classList.add('expandable-expanded');
    toggleBtn.innerHTML = ICON_CLOSE;
    toggleBtn.title = 'Collapse';
    buttonBar.style.top = '8px';
    buttonBar.style.right = '8px';

    // Show overlay
    if (!overlay.parentNode) {
      document.body.appendChild(overlay);
    }
    overlay.style.opacity = '1';
    overlay.style.pointerEvents = 'auto';

    // Lock container height to preserve document flow
    // Use measured height or fall back to calculating
    if (collapsedHeight) {
      container.style.height = `${collapsedHeight}px`;
    } else {
      container.style.height = `${container.offsetHeight}px`;
    }

    // Show floating controls panel
    if (controlsArray.length > 0 && floatingPanel) {
      const panelContent = floatingPanel.querySelector('.expandable-controls-content');
      if (panelContent) {
        // Process each control
        for (const ctrl of controlsArray) {
          // Resolve control to element
          const el = typeof ctrl === 'string'
            ? document.querySelector(ctrl)
            : ctrl;

          if (!el || !el.parentNode) continue;

          // Create placeholder for this control
          const placeholder = document.createElement('div');
          placeholder.className = 'expandable-controls-placeholder';
          placeholder.style.height = `${el.offsetHeight}px`;
          placeholder.style.display = 'block';

          // Store state for restoration (include selector for duplicate detection)
          controlsState.push({
            element: el,
            selector: typeof ctrl === 'string' ? ctrl : null,
            originalParent: el.parentNode,
            originalNextSibling: el.nextSibling,
            placeholder
          });

          // Insert placeholder and move control to panel
          el.parentNode.insertBefore(placeholder, el);
          panelContent.appendChild(el);
        }
      }

      // Add panel to body and show (only if we moved at least one control)
      if (controlsState.length > 0) {
        if (!floatingPanel.parentNode) {
          document.body.appendChild(floatingPanel);
        }
        floatingPanel.classList.add('expandable-expanded');
        floatingPanel.style.display = '';
        floatingPanel.style.left = `${controlsPanelPosition.x}px`;
        floatingPanel.style.top = `${controlsPanelPosition.y}px`;

        // Set initial expand/collapse state
        const isMobile = window.innerWidth < 640;
        controlsPanelExpanded = !isMobile;
        const content = floatingPanel.querySelector('.expandable-controls-content');
        const toggle = floatingPanel.querySelector('.expandable-controls-toggle');
        if (controlsPanelExpanded) {
          if (content) content.style.display = 'flex';
          if (toggle) {
            toggle.innerHTML = '▼';
            toggle.title = 'Collapse controls';
          }
        } else {
          if (content) content.style.display = 'none';
          if (toggle) {
            toggle.innerHTML = '▶';
            toggle.title = 'Expand controls';
          }
        }
      }
    }

    updateExpandedPosition();

    // Start watching for element recreation (Observable reactivity)
    startControlsObserver();
  }

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (expanded) {
      collapse();
    } else {
      expand();
    }
  });

  // Handle window resize
  const handleResize = () => {
    if (expanded) {
      updateExpandedPosition();
    } else if (wide) {
      updateWideLayout();
    }
  };
  window.addEventListener('resize', handleResize);

  // Close on Escape key
  const handleKeydown = (e) => {
    if (e.key === 'Escape' && expanded) {
      collapse();
    }
  };
  document.addEventListener('keydown', handleKeydown);

  // Cleanup when removed from DOM
  const observer = new MutationObserver(() => {
    if (!document.contains(container)) {
      document.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('resize', handleResize);
      stopControlsObserver();
      if (overlay.parentNode) overlay.remove();
      // Restore controls before removing panel
      restoreControls();
      if (floatingPanel && floatingPanel.parentNode) floatingPanel.remove();
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Expose current dimensions
  Object.defineProperty(container, 'expandedDimensions', {
    get: () => ({ width: currentWidth, height: currentHeight, expanded })
  });

  // If external state says we should be expanded, expand after DOM is ready
  if (state?.expanded) {
    requestAnimationFrame(() => {
      expand();
    });
  }

  return container;
}
