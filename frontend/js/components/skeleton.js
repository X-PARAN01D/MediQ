/* Skeleton loading placeholders — window.Skeleton
 * Returns HTML strings using .sk / .sk-line / .sk-circle shimmer classes
 * (defined in css/styles.css) plus Tailwind layout classes.
 */
(function () {
  'use strict';

  function lines(n) {
    n = (n == null) ? 3 : n;
    var out = '<div class="flex flex-col gap-2">';
    for (var i = 0; i < n; i++) {
      var w = (i === n - 1) ? '60%' : '100%';
      out += '<div class="sk sk-line" style="width:' + w + '"></div>';
    }
    return out + '</div>';
  }

  function card() {
    return '<div class="card p-5">' +
      '<div class="sk sk-line" style="width:40%"></div>' +
      '<div class="mt-4">' + lines(3) + '</div>' +
      '<div class="mt-4"><div class="sk" style="width:96px;height:36px;border-radius:8px"></div></div>' +
    '</div>';
  }

  function stats(n) {
    n = (n == null) ? 4 : n;
    var cells = '';
    for (var i = 0; i < n; i++) {
      cells += '<div class="card p-4 flex items-center gap-3">' +
        '<div class="sk sk-circle shrink-0" style="width:44px;height:44px"></div>' +
        '<div class="flex-1 min-w-0">' + lines(2) + '</div>' +
      '</div>';
    }
    return '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">' + cells + '</div>';
  }

  function table(rows) {
    rows = (rows == null) ? 5 : rows;
    var cols = 4, c, r;
    var head = '<tr>';
    for (c = 0; c < cols; c++) head += '<th class="px-4 py-3"><div class="sk sk-line"></div></th>';
    head += '</tr>';
    var body = '';
    for (r = 0; r < rows; r++) {
      body += '<tr>';
      for (c = 0; c < cols; c++) body += '<td class="px-4 py-3"><div class="sk sk-line"></div></td>';
      body += '</tr>';
    }
    return '<div class="table-wrap"><table class="tbl"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>';
  }

  function page() {
    return '<div class="flex flex-col gap-6">' + stats(4) + card() + '</div>';
  }

  window.Skeleton = {
    page: page,
    card: card,
    table: table,
    stats: stats,
    lines: lines
  };
})();
