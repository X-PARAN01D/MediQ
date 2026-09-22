/* Empty state — window.EmptyState
 * Returns centered HTML: big icon, title, message, optional action button.
 * Views bind the [data-empty-btn] button themselves.
 */
(function () {
  'use strict';

  function render(opts) {
    opts = opts || {};
    var icon = opts.icon || '📋';
    var title = opts.title || '';
    var message = opts.message || '';
    var btn = opts.actionLabel
      ? '<button type="button" class="btn btn-primary btn-sm" data-empty-btn>' + opts.actionLabel + '</button>'
      : '';
    return '<div class="empty-state">' +
      '<div class="text-5xl mb-3" aria-hidden="true">' + icon + '</div>' +
      (title ? '<h3 class="text-lg font-semibold text-slate-800 mb-1">' + title + '</h3>' : '') +
      (message ? '<p class="text-sm text-slate-500 mb-4 max-w-md mx-auto">' + message + '</p>' : '') +
      btn +
    '</div>';
  }

  window.EmptyState = {
    render: render
  };
})();
