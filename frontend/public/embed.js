/**
 * Autive Embed Script
 *
 * Usage:
 * <script
 *   src="https://your-autive-url/embed.js"
 *   data-agent="AGENT_ID_OR_SLUG"
 *   data-position="expanded|widget"
 *   data-theme="light|dark"
 *   async
 * ></script>
 *
 * data-agent: Your Agent ID (UUID) or Slug (accepts either)
 * data-position: "expanded" (fills parent container) or "widget" (floating button)
 * data-theme: "light" or "dark"
 */
(function() {
  'use strict';

  // Get the script element that loaded this script
  var currentScript = document.currentScript;
  if (!currentScript) {
    console.error('Autive Embed: Could not find script element');
    return;
  }

  // Read configuration from data attributes
  // data-agent accepts either an Agent ID (UUID) or a Slug
  var agentIdentifier = currentScript.getAttribute('data-agent');
  var position = currentScript.getAttribute('data-position') || 'expanded';
  var theme = currentScript.getAttribute('data-theme') || 'light';

  if (!agentIdentifier) {
    console.error('Autive Embed: data-agent attribute is required (Agent ID or Slug)');
    return;
  }

  // Determine base URL from script src
  var scriptSrc = currentScript.src;
  var baseUrl = scriptSrc.replace('/embed.js', '');

  // Chat URL - works with both Agent ID and Slug
  var chatUrl = baseUrl + '/chat/' + agentIdentifier + '?embed=true&theme=' + theme;

  // Theme colors
  var colors = {
    light: {
      primary: '#18181b',
      background: '#ffffff',
      border: '#e4e4e7',
      shadow: 'rgba(0, 0, 0, 0.1)'
    },
    dark: {
      primary: '#fafafa',
      background: '#18181b',
      border: '#27272a',
      shadow: 'rgba(0, 0, 0, 0.3)'
    }
  };

  var themeColors = colors[theme] || colors.light;

  // Create styles
  var styleId = 'autive-embed-styles';
  if (!document.getElementById(styleId)) {
    var style = document.createElement('style');
    style.id = styleId;
    style.textContent = '\n      .autive-embed-container {\n        width: 100%;\n        height: 100%;\n        position: relative;\n      }\n      .autive-embed-iframe {\n        width: 100%;\n        height: 100%;\n        border: none;\n        border-radius: 8px;\n      }\n      .autive-widget-button {\n        position: fixed;\n        bottom: 20px;\n        right: 20px;\n        width: 56px;\n        height: 56px;\n        border-radius: 28px;\n        border: none;\n        cursor: pointer;\n        display: flex;\n        align-items: center;\n        justify-content: center;\n        box-shadow: 0 4px 12px ' + themeColors.shadow + ';\n        transition: transform 0.2s ease, box-shadow 0.2s ease;\n        z-index: 999998;\n        background-color: ' + themeColors.primary + ';\n      }\n      .autive-widget-button:hover {\n        transform: scale(1.05);\n        box-shadow: 0 6px 16px ' + themeColors.shadow + ';\n      }\n      .autive-widget-button svg {\n        width: 24px;\n        height: 24px;\n        fill: ' + themeColors.background + ';\n      }\n      .autive-widget-popup {\n        position: fixed;\n        bottom: 90px;\n        right: 20px;\n        width: 400px;\n        height: 600px;\n        max-width: calc(100vw - 40px);\n        max-height: calc(100vh - 120px);\n        border-radius: 16px;\n        overflow: hidden;\n        box-shadow: 0 8px 32px ' + themeColors.shadow + ';\n        z-index: 999999;\n        display: none;\n        flex-direction: column;\n        background-color: ' + themeColors.background + ';\n        border: 1px solid ' + themeColors.border + ';\n      }\n      .autive-widget-popup.autive-widget-open {\n        display: flex;\n      }\n      .autive-widget-header {\n        display: flex;\n        align-items: center;\n        justify-content: flex-end;\n        padding: 12px 16px;\n        border-bottom: 1px solid ' + themeColors.border + ';\n        background-color: ' + themeColors.background + ';\n      }\n      .autive-widget-close {\n        width: 32px;\n        height: 32px;\n        border-radius: 8px;\n        border: none;\n        cursor: pointer;\n        display: flex;\n        align-items: center;\n        justify-content: center;\n        transition: background-color 0.2s ease;\n        background-color: transparent;\n      }\n      .autive-widget-close:hover {\n        background-color: ' + themeColors.border + ';\n      }\n      .autive-widget-close svg {\n        width: 20px;\n        height: 20px;\n        stroke: ' + themeColors.primary + ';\n      }\n      .autive-widget-content {\n        flex: 1;\n        overflow: hidden;\n      }\n      .autive-widget-content iframe {\n        width: 100%;\n        height: 100%;\n        border: none;\n      }\n      @media (max-width: 480px) {\n        .autive-widget-popup {\n          bottom: 0;\n          right: 0;\n          width: 100vw;\n          height: 100vh;\n          max-width: 100vw;\n          max-height: 100vh;\n          border-radius: 0;\n        }\n        .autive-widget-button {\n          bottom: 16px;\n          right: 16px;\n        }\n      }\n    ';
    document.head.appendChild(style);
  }

  // Chat icon SVG
  var chatIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/></svg>';

  // Close icon SVG
  var closeIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

  // Initialize based on position mode
  if (position === 'expanded') {
    initExpandedMode();
  } else if (position === 'widget') {
    initWidgetMode();
  }

  function initExpandedMode() {
    // Create container
    var container = document.createElement('div');
    container.className = 'autive-embed-container';

    // Create iframe
    var iframe = document.createElement('iframe');
    iframe.className = 'autive-embed-iframe';
    iframe.src = chatUrl;
    iframe.allow = 'clipboard-write';

    container.appendChild(iframe);

    // Insert after the script tag or replace a target element
    var targetId = currentScript.getAttribute('data-target');
    if (targetId) {
      var target = document.getElementById(targetId);
      if (target) {
        target.appendChild(container);
        return;
      }
    }

    // Insert after script tag's parent if it's a div, otherwise after script
    if (currentScript.parentElement && currentScript.parentElement.tagName === 'DIV') {
      currentScript.parentElement.appendChild(container);
    } else {
      currentScript.parentElement.insertBefore(container, currentScript.nextSibling);
    }
  }

  function initWidgetMode() {
    // Create widget button
    var button = document.createElement('button');
    button.className = 'autive-widget-button';
    button.innerHTML = chatIconSvg;
    button.setAttribute('aria-label', 'Open chat');

    // Create popup
    var popup = document.createElement('div');
    popup.className = 'autive-widget-popup';

    // Create header with close button
    var header = document.createElement('div');
    header.className = 'autive-widget-header';

    var closeButton = document.createElement('button');
    closeButton.className = 'autive-widget-close';
    closeButton.innerHTML = closeIconSvg;
    closeButton.setAttribute('aria-label', 'Close chat');

    header.appendChild(closeButton);

    // Create content area with iframe
    var content = document.createElement('div');
    content.className = 'autive-widget-content';

    var iframe = document.createElement('iframe');
    iframe.src = chatUrl;
    iframe.allow = 'clipboard-write';

    content.appendChild(iframe);

    popup.appendChild(header);
    popup.appendChild(content);

    // Add to document
    document.body.appendChild(button);
    document.body.appendChild(popup);

    // Toggle popup on button click
    button.addEventListener('click', function() {
      popup.classList.toggle('autive-widget-open');
      if (popup.classList.contains('autive-widget-open')) {
        button.innerHTML = closeIconSvg;
        button.querySelector('svg').style.stroke = themeColors.background;
        button.querySelector('svg').style.fill = 'none';
      } else {
        button.innerHTML = chatIconSvg;
      }
    });

    // Close popup on close button click
    closeButton.addEventListener('click', function() {
      popup.classList.remove('autive-widget-open');
      button.innerHTML = chatIconSvg;
    });

    // Close on escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && popup.classList.contains('autive-widget-open')) {
        popup.classList.remove('autive-widget-open');
        button.innerHTML = chatIconSvg;
      }
    });
  }
})();
