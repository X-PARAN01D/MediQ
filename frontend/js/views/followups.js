/* Arogya Seva Maharashtra — Follow-ups view (plain script, no modules) */
I18n.addStrings({
  en: {
    followups: 'Follow-ups',
    add_followup: 'Add follow-up',
    mark_done: 'Mark done',
    reschedule: 'Reschedule',
    overdue: 'Overdue',
    upcoming: 'Upcoming',
    done: 'Done',
    due_date: 'Due date',
    risk: 'Risk',
    new_due_date: 'New due date',
    followup_saved: 'Follow-up added',
    followup_updated: 'Follow-up updated',
    no_followups: 'No follow-ups here.',
    followup_reason: 'Reason for follow-up'
  },
  hi: {
    followups: 'फॉलो-अप',
    add_followup: 'फॉलो-अप जोड़ें',
    mark_done: 'पूर्ण चिह्नित करें',
    reschedule: 'पुनर्निर्धारित करें',
    overdue: 'अतिदेय',
    upcoming: 'आगामी',
    done: 'पूर्ण',
    due_date: 'नियत तिथि',
    risk: 'जोखिम',
    new_due_date: 'नई नियत तिथि',
    followup_saved: 'फॉलो-अप जोड़ा गया',
    followup_updated: 'फॉलो-अप अपडेट हुआ',
    no_followups: 'यहाँ कोई फॉलो-अप नहीं है।',
    followup_reason: 'फॉलो-अप का कारण'
  },
  mr: {
    followups: 'पाठपुरावा',
    add_followup: 'पाठपुरावा जोडा',
    mark_done: 'पूर्ण म्हणून चिन्हांकित करा',
    reschedule: 'पुन्हा वेळ ठरवा',
    overdue: 'मुदत संपलेली',
    upcoming: 'आगामी',
    done: 'पूर्ण',
    due_date: 'मुदत तारीख',
    risk: 'जोखीम',
    new_due_date: 'नवीन मुदत तारीख',
    followup_saved: 'पाठपुरावा जोडला',
    followup_updated: 'पाठपुरावा अद्यतनित केला',
    no_followups: 'येथे कोणतेही पाठपुरावे नाहीत.',
    followup_reason: 'पाठपुराव्याचे कारण'
  }
});

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

Views.followups = async function (el) {
  document.title = I18n.t('followups') + ' · ' + I18n.t('app_name');
  el.innerHTML = Skeleton.page();

  if (!Auth.can('asha_worker', 'doctor')) {
    el.innerHTML =
      '<div class="max-w-xl mx-auto mt-10">' +
      Cards.panel({
        title: I18n.t('followups'),
        bodyHTML: '<p class="text-sm text-slate-600">⚠️ ' + esc(I18n.t('followups')) + ' — ' + esc(I18n.t('asha_worker') || 'asha_worker') + ' / ' + esc(I18n.t('doctor') || 'doctor') + '</p>'
      }) + '</div>';
    return;
  }

  function badge(text, tone) {
    var tones = {
      red: 'bg-red-100 text-red-700',
      amber: 'bg-amber-100 text-amber-800',
      green: 'bg-green-100 text-green-700',
      blue: 'bg-blue-100 text-blue-700',
      slate: 'bg-slate-100 text-slate-600'
    };
    return '<span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold ' + (tones[tone] || tones.slate) + '">' + esc(text) + '</span>';
  }
  function riskBadge(r) {
    var t = r === 'high' ? 'red' : (r === 'medium' ? 'amber' : 'green');
    return badge(I18n.t(r || 'low'), t);
  }

  function openAddModal() {
    var today = new Date().toISOString().slice(0, 10);
    var body =
      '<form id="fu-form" class="space-y-3">' +
      Forms.field({ label: I18n.t('patient_name'), name: 'patientName', type: 'text', required: true }) +
      Forms.field({ label: I18n.t('followup_reason'), name: 'reason', type: 'textarea', rows: 3, required: true }) +
      Forms.field({ label: I18n.t('due_date'), name: 'dueDate', type: 'date', value: today, required: true }) +
      Forms.field({
        label: I18n.t('risk'), name: 'risk', type: 'select', required: true,
        options: [
          { value: 'high', label: I18n.t('high') },
          { value: 'medium', label: I18n.t('medium') },
          { value: 'low', label: I18n.t('low') }
        ]
      }) +
      '</form>';
    Modal.open({
      title: I18n.t('add_followup'),
      bodyHTML: body,
      actions: [
        { label: I18n.t('cancel'), kind: 'secondary', onClick: function () { Modal.close(); } },
        {
          label: I18n.t('submit'), kind: 'primary', onClick: async function () {
            var form = document.getElementById('fu-form');
            if (!Forms.validate(form)) { Toast.error(I18n.t('required_field')); return; }
            var vals = Forms.values(form);
            try {
              var res = await Api.post('/followups', vals);
              if (res && res.queued) Toast.info(I18n.t('offline_queued'));
              else Toast.success(I18n.t('followup_saved'));
              Modal.close();
              Views.followups(el);
            } catch (e) { Toast.error(I18n.t('operation_failed')); }
          }
        }
      ]
    });
  }

  function openRescheduleModal(row) {
    var body =
      '<form id="rs-form" class="space-y-3">' +
      Forms.field({ label: I18n.t('new_due_date'), name: 'dueDate', type: 'date', value: row.dueDate || '', required: true }) +
      '</form>';
    Modal.open({
      title: I18n.t('reschedule') + ' — ' + row.patientName,
      bodyHTML: body,
      actions: [
        { label: I18n.t('cancel'), kind: 'secondary', onClick: function () { Modal.close(); } },
        {
          label: I18n.t('save'), kind: 'primary', onClick: async function () {
            var form = document.getElementById('rs-form');
            if (!Forms.validate(form)) { Toast.error(I18n.t('required_field')); return; }
            var vals = Forms.values(form);
            try {
              var res = await Api.put('/followups/' + encodeURIComponent(row.id), { dueDate: vals.dueDate });
              if (res && res.queued) Toast.info(I18n.t('offline_queued'));
              else Toast.success(I18n.t('followup_updated'));
              Modal.close();
              Views.followups(el);
            } catch (e) { Toast.error(I18n.t('operation_failed')); }
          }
        }
      ]
    });
  }

  async function markDone(row) {
    try {
      var res = await Api.put('/followups/' + encodeURIComponent(row.id), { status: 'done' });
      if (res && res.queued) Toast.info(I18n.t('offline_queued'));
      else Toast.success(I18n.t('followup_updated'));
      Views.followups(el);
    } catch (e) { Toast.error(I18n.t('operation_failed')); }
  }

  function rowHtml(r, showActions) {
    return '<div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">' +
      '<div class="flex-1 min-w-0">' +
        '<div class="flex items-center gap-2 flex-wrap">' +
          '<span class="font-medium text-sm text-slate-800">' + esc(r.patientName) + '</span>' +
          riskBadge(r.risk) +
        '</div>' +
        '<div class="text-sm text-slate-600 mt-0.5">' + esc(r.reason) + '</div>' +
        '<div class="text-xs text-slate-500 mt-1">📅 ' + esc(I18n.t('due_date')) + ': ' + esc(r.dueDate) + '</div>' +
      '</div>' +
      (showActions
        ? '<div class="flex gap-2 shrink-0">' +
            '<button data-done="' + esc(r.id) + '" class="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium">✓ ' + esc(I18n.t('mark_done')) + '</button>' +
            '<button data-rs="' + esc(r.id) + '" class="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">🗓 ' + esc(I18n.t('reschedule')) + '</button>' +
          '</div>'
        : '<div class="shrink-0">' + badge(I18n.t('done'), 'green') + '</div>') +
    '</div>';
  }

  function sectionHtml(title, tone, items, showActions, byId) {
    var bar = tone === 'red' ? 'border-red-500 text-red-700' : (tone === 'amber' ? 'border-amber-500 text-amber-700' : 'border-green-500 text-green-700');
    return '<div>' +
      '<h3 class="text-sm font-semibold uppercase tracking-wide border-l-4 pl-2 mb-3 ' + bar + '">' + esc(title) + ' (' + items.length + ')</h3>' +
      (items.length
        ? '<div class="space-y-2">' + items.map(function (r) { return rowHtml(r, showActions); }).join('') + '</div>'
        : '<p class="text-sm text-slate-400 italic">' + esc(I18n.t('no_followups')) + '</p>') +
    '</div>';
  }

  function render(rows) {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var byId = {};
    rows.forEach(function (r) { byId[r.id] = r; });

    var overdue = [], upcoming = [], done = [];
    rows.forEach(function (r) {
      if (r.status === 'done') { done.push(r); return; }
      var d = r.dueDate ? new Date(r.dueDate) : null;
      if (d) d.setHours(0, 0, 0, 0);
      if (d && d < today) overdue.push(r); else upcoming.push(r);
    });
    var sortByDate = function (a, b) { return String(a.dueDate).localeCompare(String(b.dueDate)); };
    overdue.sort(sortByDate); upcoming.sort(sortByDate); done.sort(sortByDate);

    el.innerHTML =
      '<div class="max-w-4xl mx-auto space-y-6">' +
        '<div class="flex items-center justify-between">' +
          '<h2 class="text-xl font-semibold text-slate-800">' + esc(I18n.t('followups')) + '</h2>' +
          '<button id="fu-add" class="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium">＋ ' + esc(I18n.t('add_followup')) + '</button>' +
        '</div>' +
        sectionHtml(I18n.t('overdue'), 'red', overdue, true) +
        sectionHtml(I18n.t('upcoming'), 'amber', upcoming, true) +
        sectionHtml(I18n.t('done'), 'green', done, false) +
      '</div>';

    el.querySelector('#fu-add').addEventListener('click', openAddModal);
    el.querySelectorAll('[data-done]').forEach(function (btn) {
      btn.addEventListener('click', function () { markDone(byId[btn.getAttribute('data-done')]); });
    });
    el.querySelectorAll('[data-rs]').forEach(function (btn) {
      btn.addEventListener('click', function () { openRescheduleModal(byId[btn.getAttribute('data-rs')]); });
    });
  }

  function showError() {
    el.innerHTML =
      '<div class="max-w-xl mx-auto mt-10">' +
      Cards.panel({
        title: I18n.t('error_load'),
        bodyHTML:
          '<p class="text-sm text-slate-600">' + esc(I18n.t('try_again')) + '</p>' +
          '<button id="fu-retry" class="mt-4 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium">' + esc(I18n.t('retry')) + '</button>'
      }) + '</div>';
    el.querySelector('#fu-retry').addEventListener('click', function () { Views.followups(el); });
  }

  try {
    var res = await Api.get('/followups');
    if (res && res.queued) Toast.info(I18n.t('offline_queued'));
    var rows = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
    render(rows);
  } catch (e) {
    showError();
  }
};
