/* Cards — window.Cards
 *   Cards.stat({ label, value, sub, icon, tone })   // dashboard KPI card
 *   Cards.panel({ title, subtitle, actionsHTML, bodyHTML }) // white content panel
 * Plain <script> global, no dependencies. Values are NOT escaped — views escape data.
 */
(function () {
  'use strict';

  var TONES = {
    teal:  'bg-teal-100 text-teal-700',
    amber: 'bg-amber-100 text-amber-700',
    red:   'bg-red-100 text-red-700',
    green: 'bg-green-100 text-green-700',
    blue:  'bg-blue-100 text-blue-700',
    slate: 'bg-slate-100 text-slate-700'
  };

  function stat(o) {
    o = o || {};
    var tone = TONES[o.tone] || TONES.teal;
    var value = (o.value == null || o.value === '') ? '—' : o.value;
    return '<div class="card p-4 flex items-start gap-3">' +
      '<div class="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ' + tone + '" aria-hidden="true">' + (o.icon || '') + '</div>' +
      '<div class="min-w-0">' +
        '<div class="text-2xl font-bold text-slate-800 leading-tight">' + value + '</div>' +
        '<div class="text-sm font-medium text-slate-600">' + (o.label || '') + '</div>' +
        (o.sub ? '<div class="text-xs text-slate-400 mt-0.5">' + o.sub + '</div>' : '') +
      '</div>' +
    '</div>';
  }

  function panel(o) {
    o = o || {};
    return '<div class="card">' +
      '<div class="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100">' +
        '<div class="min-w-0">' +
          '<h3 class="font-semibold text-slate-800">' + (o.title || '') + '</h3>' +
          (o.subtitle ? '<p class="text-sm text-slate-500 mt-0.5">' + o.subtitle + '</p>' : '') +
        '</div>' +
        (o.actionsHTML ? '<div class="flex items-center gap-2 shrink-0">' + o.actionsHTML + '</div>' : '') +
      '</div>' +
      '<div class="p-5">' + (o.bodyHTML || '') + '</div>' +
    '</div>';
  }

  window.Cards = {
    stat: stat,
    panel: panel
  };
})();
