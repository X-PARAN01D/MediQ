/* Toast notifications — window.Toast
 * Usage: Toast.success('Saved'), Toast.error('Failed'), Toast.info('...'), Toast.warning('...')
 * Plain <script> global, no dependencies.
 */
(function () {
  'use strict';

  var ICONS = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  var BORDER = {
    success: 'border-l-green-500',
    error: 'border-l-red-500',
    warning: 'border-l-amber-500',
    info: 'border-l-blue-500'
  };
  var ICON_COLOR = {
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-amber-600',
    info: 'text-blue-600'
  };

  function root() {
    var el = document.getElementById('toast-root');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast-root';
      // bottom-right on desktop, bottom-center full-width-ish on mobile
      el.className = 'fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-[100] flex flex-col gap-2 items-center sm:items-stretch pointer-events-none';
      document.body.appendChild(el);
    }
    return el;
  }

  function show(message, type, ms) {
    type = ICONS[type] ? type : 'info';
    if (ms == null) ms = 3500;

    var el = document.createElement('div');
    el.className = 'toast-item pointer-events-auto w-full bg-white rounded-lg shadow-lg border-l-4 border border-slate-100 px-4 py-3 flex items-start gap-3 cursor-pointer ' + BORDER[type];
    // slide-in from the right via inline style + CSS transition
    el.style.cssText = 'transform: translateX(120%); opacity: 0; transition: transform .25s ease, opacity .25s ease;';
    el.setAttribute('role', 'status');
    el.innerHTML =
      '<span class="text-lg leading-none mt-0.5 ' + ICON_COLOR[type] + '" aria-hidden="true">' + ICONS[type] + '</span>' +
      '<div class="text-sm text-slate-800 flex-1">' + message + '</div>';

    var dismissed = false;
    function dismiss() {
      if (dismissed) return;
      dismissed = true;
      el.style.transform = 'translateX(120%)';
      el.style.opacity = '0';
      setTimeout(function () { el.remove(); }, 260);
    }

    el.addEventListener('click', dismiss);
    root().appendChild(el);

    // trigger the transition on the next frames
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.style.transform = 'translateX(0)';
        el.style.opacity = '1';
      });
    });

    setTimeout(dismiss, ms);
    return dismiss;
  }

  window.Toast = {
    show: show,
    success: function (msg, ms) { return show(msg, 'success', ms); },
    error: function (msg, ms) { return show(msg, 'error', ms); },
    info: function (msg, ms) { return show(msg, 'info', ms); },
    warning: function (msg, ms) { return show(msg, 'warning', ms); }
  };
})();
