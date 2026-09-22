/* Modal dialogs — window.Modal
 * Usage:
 *   Modal.open({ title, bodyHTML, actions: [{label, kind, onClick(close)}], wide })
 *   Modal.close()
 *   Modal.confirm({ title, message, confirmLabel }).then(ok => ...)
 * Plain <script> global, no dependencies. Values are NOT escaped — views escape data.
 */
(function () {
  'use strict';

  var KIND_CLS = { primary: 'btn-primary', danger: 'btn-danger', ghost: 'btn-ghost' };
  var currentActions = [];
  var persistent = false;
  var escHandler = null;

  function root() {
    var el = document.getElementById('modal-root');
    if (!el) {
      el = document.createElement('div');
      el.id = 'modal-root';
      document.body.appendChild(el);
    }
    return el;
  }

  function btnClass(kind) {
    return 'btn btn-sm ' + (KIND_CLS[kind] || 'btn-ghost');
  }

  function close() {
    var el = document.getElementById('modal-root');
    if (el) el.innerHTML = '';
    if (escHandler) {
      document.removeEventListener('keydown', escHandler);
      escHandler = null;
    }
    currentActions = [];
    persistent = false;
  }

  function open(opts) {
    opts = opts || {};
    var title = opts.title || '';
    var bodyHTML = opts.bodyHTML || '';
    var actions = opts.actions || [];
    var wide = !!opts.wide;
    var dismissable = opts.dismissable !== false;

    close();
    persistent = !dismissable;
    currentActions = actions;

    var el = root();
    var boxClass = 'modal-box' + (wide ? ' modal-wide' : '');

    var html =
      '<div class="modal-overlay">' +
        '<div class="' + boxClass + '" role="dialog" aria-modal="true">' +
          '<div class="flex items-start justify-between gap-4 pb-3 border-b border-slate-200">' +
            '<h2 class="text-lg font-semibold text-slate-800">' + title + '</h2>' +
            (dismissable
              ? '<button type="button" class="btn btn-ghost btn-sm" data-modal-x aria-label="Close dialog">✕</button>'
              : '') +
          '</div>' +
          '<div class="py-4">' + bodyHTML + '</div>' +
          (actions.length
            ? '<div class="flex justify-end gap-2 pt-3 border-t border-slate-200">' +
              actions.map(function (a, i) {
                return '<button type="button" class="' + btnClass(a.kind) + '" data-modal-act="' + i + '">' + a.label + '</button>';
              }).join('') +
              '</div>'
            : '') +
        '</div>' +
      '</div>';

    el.innerHTML = html;

    // overlay click closes (unless persistent, e.g. confirm dialogs)
    el.querySelector('.modal-overlay').addEventListener('mousedown', function (e) {
      if (!persistent && e.target === this) close();
    });

    var x = el.querySelector('[data-modal-x]');
    if (x) x.addEventListener('click', close);

    var btns = el.querySelectorAll('[data-modal-act]');
    Array.prototype.forEach.call(btns, function (b) {
      b.addEventListener('click', function () {
        var a = currentActions[parseInt(b.getAttribute('data-modal-act'), 10)];
        if (a && typeof a.onClick === 'function') a.onClick(close);
      });
    });

    escHandler = function (e) {
      if (e.key === 'Escape' && !persistent) close();
    };
    document.addEventListener('keydown', escHandler);

    // focus first focusable input for accessibility
    var first = el.querySelector('input, select, textarea');
    if (first) {
      try { first.focus(); } catch (err) { /* ignore */ }
    }
  }

  function confirm(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var done = false;
      function settle(value) {
        if (done) return;
        done = true;
        close();
        resolve(value);
      }
      open({
        title: opts.title || 'Confirm',
        bodyHTML: '<p class="text-sm text-slate-600">' + (opts.message || 'Are you sure?') + '</p>',
        dismissable: false,
        actions: [
          { label: opts.cancelLabel || 'Cancel', kind: 'ghost', onClick: function () { settle(false); } },
          { label: opts.confirmLabel || 'Confirm', kind: opts.danger ? 'danger' : 'primary', onClick: function () { settle(true); } }
        ]
      });
    });
  }

  window.Modal = {
    open: open,
    close: close,
    confirm: confirm
  };
})();
