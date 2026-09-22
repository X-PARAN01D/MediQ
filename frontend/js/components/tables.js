/* Tables — window.Tables
 *   Tables.render({ columns, rows, emptyTitle, emptyMessage, actions }) -> HTML string
 *     columns: [{ key, label, render?(row, i) -> html }]
 *     actions: [{ id, label, kind: 'primary'|'danger'|'ghost' }] rendered per row
 *   Tables.bindActions(container, rows, { actionId: (row, btn, idx) => {} })
 * Plain <script> global. Values are NOT escaped — views escape data.
 */
(function () {
  'use strict';

  var KIND_CLS = { primary: 'btn-primary', danger: 'btn-danger', ghost: 'btn-ghost' };

  function render(opts) {
    opts = opts || {};
    var columns = opts.columns || [];
    var rows = opts.rows || [];
    var actions = opts.actions || [];

    if (!rows.length) {
      if (window.EmptyState && typeof window.EmptyState.render === 'function') {
        return window.EmptyState.render({
          title: opts.emptyTitle || 'No records',
          message: opts.emptyMessage || 'Nothing to show here yet.'
        });
      }
      return '<p class="text-sm text-slate-500 text-center py-8">' + (opts.emptyTitle || 'No records') + '</p>';
    }

    var thead = '<thead><tr>' +
      columns.map(function (c) {
        return '<th class="text-left">' + c.label + '</th>';
      }).join('') +
      (actions.length ? '<th class="text-right">Actions</th>' : '') +
      '</tr></thead>';

    var tbody = '<tbody>' + rows.map(function (row, i) {
      var tds = columns.map(function (c) {
        var v = (typeof c.render === 'function') ? c.render(row, i) : row[c.key];
        return '<td>' + (v == null ? '' : v) + '</td>';
      }).join('');
      if (actions.length) {
        tds += '<td class="text-right whitespace-nowrap"><div class="inline-flex gap-1">' +
          actions.map(function (a) {
            return '<button type="button" class="btn ' + (KIND_CLS[a.kind] || 'btn-ghost') + ' btn-sm"' +
              ' data-tbl-action="' + a.id + '" data-tbl-idx="' + i + '">' + a.label + '</button>';
          }).join('') +
          '</div></td>';
      }
      return '<tr>' + tds + '</tr>';
    }).join('') + '</tbody>';

    return '<div class="table-wrap"><table class="tbl">' + thead + tbody + '</table></div>';
  }

  function bindActions(container, rows, handlers) {
    if (!container) return;
    // store rows + handlers on the container so delegation always uses the latest
    container._tblRows = rows || [];
    container._tblHandlers = handlers || {};
    if (container._tblBound) return; // bind the delegated listener only once
    container._tblBound = true;
    container.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('[data-tbl-action]') : null;
      if (!btn || !container.contains(btn)) return;
      var id = btn.getAttribute('data-tbl-action');
      var idx = parseInt(btn.getAttribute('data-tbl-idx'), 10);
      var handler = container._tblHandlers[id];
      var row = container._tblRows[idx];
      if (typeof handler === 'function' && row !== undefined) {
        handler(row, btn, idx);
      }
    });
  }

  window.Tables = {
    render: render,
    bindActions: bindActions
  };
})();
