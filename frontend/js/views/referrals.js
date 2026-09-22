/* Arogya Seva Maharashtra — Referrals view (plain script, no modules) */
I18n.addStrings({
  en: {
    referrals: 'Referrals',
    new_referral: 'New referral',
    from_facility: 'From facility',
    to_facility: 'To facility',
    reason: 'Reason',
    priority: 'Priority',
    referred_on: 'Referred on',
    accept: 'Accept',
    reject: 'Reject',
    complete: 'Complete',
    filter_by_status: 'Filter by status',
    reject_confirm_msg: 'Are you sure you want to reject this referral?',
    referral_saved: 'Referral created',
    status_updated: 'Referral status updated',
    no_referrals: 'No referrals found.',
    patient_name: 'Patient name',
    route: 'Route'
  },
  hi: {
    referrals: 'रेफ़रल',
    new_referral: 'नया रेफ़रल',
    from_facility: 'कहाँ से',
    to_facility: 'कहाँ भेजें',
    reason: 'कारण',
    priority: 'प्राथमिकता',
    referred_on: 'रेफ़र तिथि',
    accept: 'स्वीकार करें',
    reject: 'अस्वीकार करें',
    complete: 'पूर्ण करें',
    filter_by_status: 'स्थिति अनुसार छाँटें',
    reject_confirm_msg: 'क्या आप वाकई इस रेफ़रल को अस्वीकार करना चाहते हैं?',
    referral_saved: 'रेफ़रल बनाया गया',
    status_updated: 'रेफ़रल स्थिति अपडेट हुई',
    no_referrals: 'कोई रेफ़रल नहीं मिला।',
    patient_name: 'रोगी का नाम',
    route: 'मार्ग'
  },
  mr: {
    referrals: 'रेफरल',
    new_referral: 'नवीन रेफरल',
    from_facility: 'कुठून',
    to_facility: 'कुठे पाठवायचे',
    reason: 'कारण',
    priority: 'प्राधान्य',
    referred_on: 'रेफरल तारीख',
    accept: 'स्वीकारा',
    reject: 'नाकारा',
    complete: 'पूर्ण करा',
    filter_by_status: 'स्थितीनुसार गाळा',
    reject_confirm_msg: 'तुम्हाला खरोखर हा रेफरल नाकारायचा आहे का?',
    referral_saved: 'रेफरल तयार केला',
    status_updated: 'रेफरल स्थिती अद्यतनित केली',
    no_referrals: 'कोणतेही रेफरल आढळले नाहीत.',
    patient_name: 'रुग्णाचे नाव',
    route: 'मार्ग'
  }
});

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

Views.referrals = async function (el) {
  document.title = I18n.t('referrals') + ' · ' + I18n.t('app_name');
  el.innerHTML = Skeleton.page();

  var canRefer = Auth.can('asha_worker', 'doctor');
  var canDecide = Auth.can('doctor', 'specialist');

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
  function priorityBadge(p) {
    var t = p === 'high' ? 'red' : (p === 'medium' ? 'amber' : 'green');
    return badge(I18n.t(p || 'medium'), t);
  }
  function statusBadge(s) {
    var map = { pending: 'amber', accepted: 'blue', completed: 'green', rejected: 'red' };
    var labels = { pending: I18n.t('pending'), accepted: I18n.t('in_progress'), completed: I18n.t('completed'), rejected: I18n.t('cancelled') };
    return badge(labels[s] || s, map[s] || 'slate');
  }

  function facilityOptions() {
    return [
      { value: 'District Hospital', label: { en: 'District Hospital', hi: 'जिला अस्पताल', mr: 'जिल्हा रुग्णालय' } },
      { value: 'Rural Hospital', label: { en: 'Rural Hospital', hi: 'ग्रामीण अस्पताल', mr: 'ग्रामीण रुग्णालय' } },
      { value: 'PHC', label: { en: 'PHC', hi: 'प्राथमिक स्वास्थ्य केंद्र', mr: 'प्राथमिक आरोग्य केंद्र' } },
      { value: 'Specialist - Cardiology', label: { en: 'Specialist - Cardiology', hi: 'विशेषज्ञ - हृदय रोग', mr: 'तज्ज्ञ - हृदयरोग' } },
      { value: 'Specialist - Pediatrics', label: { en: 'Specialist - Pediatrics', hi: 'विशेषज्ञ - बाल रोग', mr: 'तज्ज्ञ - बालरोग' } },
      { value: 'Specialist - Orthopedics', label: { en: 'Specialist - Orthopedics', hi: 'विशेषज्ञ - हड्डी रोग', mr: 'तज्ज्ञ - अस्थिरोग' } }
    ];
  }

  function openNewModal() {
    var lang = 'en';
    try { lang = (I18n.lang && I18n.lang()) || 'en'; } catch (e) {}
    var facOpts = facilityOptions().map(function (f) {
      return { value: f.value, label: f.label[lang] || f.label.en };
    });
    var body =
      '<form id="ref-form" class="space-y-3">' +
      Forms.field({ label: I18n.t('patient_name'), name: 'patientName', type: 'text', required: true }) +
      Forms.field({ label: I18n.t('to_facility'), name: 'toFacility', type: 'select', options: facOpts, required: true }) +
      Forms.field({
        label: I18n.t('priority'), name: 'priority', type: 'select', required: true,
        options: [
          { value: 'high', label: I18n.t('high') },
          { value: 'medium', label: I18n.t('medium') },
          { value: 'low', label: I18n.t('low') }
        ]
      }) +
      Forms.field({ label: I18n.t('reason'), name: 'reason', type: 'textarea', rows: 3, required: true }) +
      '</form>';
    Modal.open({
      title: I18n.t('new_referral'),
      bodyHTML: body,
      actions: [
        { label: I18n.t('cancel'), kind: 'secondary', onClick: function () { Modal.close(); } },
        {
          label: I18n.t('submit'), kind: 'primary', onClick: async function () {
            var form = document.getElementById('ref-form');
            if (!Forms.validate(form)) { Toast.error(I18n.t('required_field')); return; }
            var vals = Forms.values(form);
            try {
              var res = await Api.post('/referrals', vals);
              if (res && res.queued) Toast.info(I18n.t('offline_queued'));
              else Toast.success(I18n.t('referral_saved'));
              Modal.close();
              Views.referrals(el);
            } catch (e) { Toast.error(I18n.t('operation_failed')); }
          }
        }
      ]
    });
  }

  async function setStatus(row, status, needConfirm) {
    if (needConfirm) {
      var ok = await Modal.confirm({ title: I18n.t('reject'), message: I18n.t('reject_confirm_msg'), confirmLabel: I18n.t('reject') });
      if (!ok) return;
    }
    try {
      var res = await Api.put('/referrals/' + encodeURIComponent(row.id), { status: status });
      if (res && res.queued) Toast.info(I18n.t('offline_queued'));
      else Toast.success(I18n.t('status_updated'));
      Views.referrals(el);
    } catch (e) { Toast.error(I18n.t('operation_failed')); }
  }

  function renderTable(container, rows) {
    if (!rows.length) {
      container.innerHTML = EmptyState.render({
        icon: '🔀', title: I18n.t('no_data'), message: I18n.t('no_referrals'),
        actionLabel: canRefer ? I18n.t('new_referral') : null
      });
      var eb = container.querySelector('[data-empty-btn]');
      if (eb) eb.addEventListener('click', openNewModal);
      return;
    }
    var actions = [];
    if (canDecide) {
      actions = [
        { id: 'accept', label: I18n.t('accept'), kind: 'primary' },
        { id: 'complete', label: I18n.t('complete'), kind: 'secondary' },
        { id: 'reject', label: I18n.t('reject'), kind: 'danger' }
      ];
    }
    container.innerHTML = '<div class="overflow-x-auto">' + Tables.render({
      columns: [
        { key: 'patientName', label: I18n.t('patient_name'), render: function (r) { return '<span class="font-medium">' + esc(r.patientName) + '</span>'; } },
        { key: 'route', label: I18n.t('route'), render: function (r) { return esc(r.fromFacility) + ' → ' + esc(r.toFacility); } },
        { key: 'reason', label: I18n.t('reason'), render: function (r) { return '<span class="block max-w-xs truncate" title="' + esc(r.reason) + '">' + esc(r.reason) + '</span>'; } },
        { key: 'priority', label: I18n.t('priority'), render: function (r) { return priorityBadge(r.priority); } },
        { key: 'status', label: I18n.t('status'), render: function (r) { return statusBadge(r.status); } },
        { key: 'date', label: I18n.t('date') }
      ],
      rows: rows,
      emptyTitle: I18n.t('no_data'),
      emptyMessage: I18n.t('no_referrals'),
      actions: actions
    }) + '</div>';
    if (canDecide) {
      Tables.bindActions(container, rows, {
        accept: function (row) {
          if (row.status !== 'pending') { Toast.info(I18n.t('status') + ': ' + row.status); return; }
          setStatus(row, 'accepted', false);
        },
        complete: function (row) {
          if (row.status !== 'accepted') { Toast.info(I18n.t('status') + ': ' + row.status); return; }
          setStatus(row, 'completed', false);
        },
        reject: function (row) {
          if (row.status === 'completed' || row.status === 'rejected') { Toast.info(I18n.t('status') + ': ' + row.status); return; }
          setStatus(row, 'rejected', true);
        }
      });
    }
  }

  function render(rows) {
    var statuses = ['pending', 'accepted', 'completed', 'rejected'];
    var statusLabels = { pending: I18n.t('pending'), accepted: I18n.t('in_progress'), completed: I18n.t('completed'), rejected: I18n.t('cancelled') };
    el.innerHTML =
      '<div class="max-w-6xl mx-auto space-y-4">' +
        '<div class="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">' +
          '<h2 class="text-xl font-semibold text-slate-800">' + esc(I18n.t('referrals')) + '</h2>' +
          '<div class="flex flex-col sm:flex-row gap-2">' +
            '<select id="ref-filter" class="border border-slate-300 rounded-lg px-3 py-2 text-sm">' +
              '<option value="">' + esc(I18n.t('all')) + ' · ' + esc(I18n.t('status')) + '</option>' +
              statuses.map(function (s) { return '<option value="' + s + '">' + esc(statusLabels[s]) + '</option>'; }).join('') +
            '</select>' +
            (canRefer ? '<button id="ref-new" class="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium">＋ ' + esc(I18n.t('new_referral')) + '</button>' : '') +
          '</div>' +
        '</div>' +
        '<div class="bg-white rounded-xl border border-slate-200 shadow-sm p-2 sm:p-4"><div id="ref-table"></div></div>' +
      '</div>';

    var tableBox = el.querySelector('#ref-table');
    renderTable(tableBox, rows);

    el.querySelector('#ref-filter').addEventListener('change', function (ev) {
      var v = ev.target.value;
      renderTable(tableBox, v ? rows.filter(function (r) { return r.status === v; }) : rows);
    });

    var nb = el.querySelector('#ref-new');
    if (nb) nb.addEventListener('click', openNewModal);
  }

  function showError() {
    el.innerHTML =
      '<div class="max-w-xl mx-auto mt-10">' +
      Cards.panel({
        title: I18n.t('error_load'),
        bodyHTML:
          '<p class="text-sm text-slate-600">' + esc(I18n.t('try_again')) + '</p>' +
          '<button id="ref-retry" class="mt-4 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium">' + esc(I18n.t('retry')) + '</button>'
      }) + '</div>';
    el.querySelector('#ref-retry').addEventListener('click', function () { Views.referrals(el); });
  }

  try {
    var res = await Api.get('/referrals');
    if (res && res.queued) Toast.info(I18n.t('offline_queued'));
    var rows = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
    render(rows);
  } catch (e) {
    showError();
  }
};
