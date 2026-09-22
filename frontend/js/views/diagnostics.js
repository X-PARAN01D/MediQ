/* Arogya Seva Maharashtra — Diagnostics view (plain script, no modules) */
I18n.addStrings({
  en: {
    diagnostics: 'Diagnostics',
    orders: 'Orders',
    results: 'Results',
    order_test: 'Order test',
    test_name: 'Test name',
    test_type: 'Test type',
    ordered_by: 'Ordered by',
    collect_sample: 'Collect sample',
    mark_ready: 'Mark ready',
    enter_result: 'Enter result',
    view_result: 'View result',
    result_text: 'Result',
    result_saved: 'Result saved',
    sample_collected_msg: 'Sample collected',
    no_orders: 'No test orders found.',
    no_results: 'No results available yet.',
    order_saved: 'Test ordered'
  },
  hi: {
    diagnostics: 'जाँच (डायग्नोस्टिक्स)',
    orders: 'आदेश',
    results: 'परिणाम',
    order_test: 'जाँच का आदेश दें',
    test_name: 'जाँच का नाम',
    test_type: 'जाँच का प्रकार',
    ordered_by: 'आदेशकर्ता',
    collect_sample: 'नमूना लें',
    mark_ready: 'तैयार चिह्नित करें',
    enter_result: 'परिणाम दर्ज करें',
    view_result: 'परिणाम देखें',
    result_text: 'परिणाम',
    result_saved: 'परिणाम सहेजा गया',
    sample_collected_msg: 'नमूना एकत्रित',
    no_orders: 'कोई जाँच आदेश नहीं मिला।',
    no_results: 'अभी तक कोई परिणाम उपलब्ध नहीं है।',
    order_saved: 'जाँच का आदेश दिया गया'
  },
  mr: {
    diagnostics: 'निदान चाचण्या',
    orders: 'मागण्या',
    results: 'निकाल',
    order_test: 'चाचणी मागवा',
    test_name: 'चाचणीचे नाव',
    test_type: 'चाचणीचा प्रकार',
    ordered_by: 'मागवणारे',
    collect_sample: 'नमुना घ्या',
    mark_ready: 'तयार म्हणून चिन्हांकित करा',
    enter_result: 'निकाल नोंदवा',
    view_result: 'निकाल पहा',
    result_text: 'निकाल',
    result_saved: 'निकाल जतन केला',
    sample_collected_msg: 'नमुना गोळा केला',
    no_orders: 'कोणत्याही चाचणी मागण्या आढळल्या नाहीत.',
    no_results: 'अद्याप कोणतेही निकाल उपलब्ध नाहीत.',
    order_saved: 'चाचणी मागवली'
  }
});

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

Views.diagnostics = async function (el) {
  document.title = I18n.t('diagnostics') + ' · ' + I18n.t('app_name');
  el.innerHTML = Skeleton.page();

  var canOrder = Auth.can('doctor', 'asha_worker');
  var isLab = Auth.can('lab_tech');

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
  function statusBadge(s) {
    var map = { ordered: 'amber', sample_collected: 'blue', report_ready: 'green' };
    var labels = { ordered: I18n.t('pending'), sample_collected: I18n.t('in_progress'), report_ready: I18n.t('done') };
    return badge(labels[s] || s, map[s] || 'slate');
  }

  function testOptions() {
    var lang = 'en';
    try { lang = (I18n.lang && I18n.lang()) || 'en'; } catch (e) {}
    var tests = [
      { value: 'CBC', label: { en: 'CBC', hi: 'CBC', mr: 'CBC' } },
      { value: 'Blood Sugar', label: { en: 'Blood Sugar', hi: 'रक्त शर्करा', mr: 'रक्तातील साखर' } },
      { value: 'X-Ray', label: { en: 'X-Ray', hi: 'एक्स-रे', mr: 'एक्स-रे' } },
      { value: 'ECG', label: { en: 'ECG', hi: 'ECG', mr: 'ECG' } },
      { value: 'Urine Test', label: { en: 'Urine Test', hi: 'मूत्र परीक्षण', mr: 'लघवी तपासणी' } },
      { value: 'TB Sputum', label: { en: 'TB Sputum', hi: 'टीबी बलगम जांच', mr: 'टीबी थुंकी तपासणी' } },
      { value: 'Malaria Test', label: { en: 'Malaria Test', hi: 'मलेरिया जांच', mr: 'मलेरिया तपासणी' } }
    ];
    return tests.map(function (t) { return { value: t.value, label: t.label[lang] || t.label.en }; });
  }

  function openOrderModal() {
    var body =
      '<form id="diag-form" class="space-y-3">' +
      Forms.field({ label: I18n.t('patient_name'), name: 'patientName', type: 'text', required: true }) +
      Forms.field({ label: I18n.t('test_name'), name: 'testName', type: 'select', options: testOptions(), required: true }) +
      Forms.field({ label: I18n.t('test_type'), name: 'testType', type: 'text', placeholder: 'Pathology / Radiology / Cardiology…' }) +
      Forms.field({ label: I18n.t('notes'), name: 'notes', type: 'textarea', rows: 3 }) +
      '</form>';
    Modal.open({
      title: I18n.t('order_test'),
      bodyHTML: body,
      actions: [
        { label: I18n.t('cancel'), kind: 'secondary', onClick: function () { Modal.close(); } },
        {
          label: I18n.t('submit'), kind: 'primary', onClick: async function () {
            var form = document.getElementById('diag-form');
            if (!Forms.validate(form)) { Toast.error(I18n.t('required_field')); return; }
            var vals = Forms.values(form);
            try {
              var res = await Api.post('/diagnostics', vals);
              if (res && res.queued) Toast.info(I18n.t('offline_queued'));
              else Toast.success(I18n.t('order_saved'));
              Modal.close();
              Views.diagnostics(el);
            } catch (e) { Toast.error(I18n.t('operation_failed')); }
          }
        }
      ]
    });
  }

  async function updateStatus(row, payload, okMsg) {
    try {
      var res = await Api.put('/diagnostics/' + encodeURIComponent(row.id), payload);
      if (res && res.queued) Toast.info(I18n.t('offline_queued'));
      else Toast.success(okMsg);
      Views.diagnostics(el);
    } catch (e) { Toast.error(I18n.t('operation_failed')); }
  }

  function openResultEntryModal(row) {
    var body =
      '<form id="result-form" class="space-y-3">' +
      Forms.field({ label: I18n.t('enter_result'), name: 'result', type: 'textarea', rows: 5, required: true }) +
      '</form>';
    Modal.open({
      title: I18n.t('mark_ready') + ' — ' + row.testName,
      bodyHTML: body,
      actions: [
        { label: I18n.t('cancel'), kind: 'secondary', onClick: function () { Modal.close(); } },
        {
          label: I18n.t('save'), kind: 'primary', onClick: async function () {
            var form = document.getElementById('result-form');
            if (!Forms.validate(form)) { Toast.error(I18n.t('required_field')); return; }
            var vals = Forms.values(form);
            Modal.close();
            updateStatus(row, { status: 'report_ready', result: vals.result }, I18n.t('result_saved'));
          }
        }
      ]
    });
  }

  function openViewResultModal(row) {
    Modal.open({
      title: I18n.t('view_result') + ' — ' + row.testName,
      bodyHTML:
        '<div class="text-sm text-slate-500 mb-2">' + esc(row.patientName) + ' · ' + esc(row.date) + '</div>' +
        '<pre class="whitespace-pre-wrap text-sm bg-slate-50 border border-slate-200 rounded-lg p-3">' + esc(row.result || '—') + '</pre>',
      actions: [{ label: I18n.t('close'), kind: 'secondary', onClick: function () { Modal.close(); } }]
    });
  }

  function renderOrdersTab(container, rows) {
    if (!rows.length) {
      container.innerHTML = EmptyState.render({
        icon: '🧪', title: I18n.t('no_data'), message: I18n.t('no_orders'),
        actionLabel: canOrder ? I18n.t('order_test') : null
      });
      var eb = container.querySelector('[data-empty-btn]');
      if (eb) eb.addEventListener('click', openOrderModal);
      return;
    }
    var actions = [];
    if (isLab) {
      actions = [
        { id: 'collect', label: I18n.t('collect_sample'), kind: 'primary' },
        { id: 'ready', label: I18n.t('mark_ready'), kind: 'secondary' }
      ];
    }
    container.innerHTML = '<div class="overflow-x-auto">' + Tables.render({
      columns: [
        { key: 'patientName', label: I18n.t('patient'), render: function (r) { return '<span class="font-medium">' + esc(r.patientName) + '</span>'; } },
        { key: 'testName', label: I18n.t('test_name') },
        { key: 'testType', label: I18n.t('test_type') },
        { key: 'status', label: I18n.t('status'), render: function (r) { return statusBadge(r.status); } },
        { key: 'orderedBy', label: I18n.t('ordered_by') },
        { key: 'date', label: I18n.t('date') }
      ],
      rows: rows,
      emptyTitle: I18n.t('no_data'),
      emptyMessage: I18n.t('no_orders'),
      actions: actions
    }) + '</div>';
    if (isLab) {
      Tables.bindActions(container, rows, {
        collect: function (row) {
          if (row.status !== 'ordered') { Toast.info(I18n.t('status') + ': ' + row.status); return; }
          updateStatus(row, { status: 'sample_collected' }, I18n.t('sample_collected_msg'));
        },
        ready: function (row) {
          if (row.status === 'report_ready') { Toast.info(I18n.t('done')); return; }
          openResultEntryModal(row);
        }
      });
    }
  }

  function renderResultsTab(container, rows) {
    var ready = rows.filter(function (r) { return r.status === 'report_ready'; });
    if (!ready.length) {
      container.innerHTML = EmptyState.render({ icon: '📋', title: I18n.t('no_data'), message: I18n.t('no_results') });
      return;
    }
    container.innerHTML = '<div class="overflow-x-auto">' + Tables.render({
      columns: [
        { key: 'patientName', label: I18n.t('patient'), render: function (r) { return '<span class="font-medium">' + esc(r.patientName) + '</span>'; } },
        { key: 'testName', label: I18n.t('test_name') },
        { key: 'testType', label: I18n.t('test_type') },
        { key: 'date', label: I18n.t('date') },
        { key: 'status', label: I18n.t('status'), render: function (r) { return statusBadge(r.status); } }
      ],
      rows: ready,
      emptyTitle: I18n.t('no_data'),
      emptyMessage: I18n.t('no_results'),
      actions: [{ id: 'view', label: I18n.t('view_result'), kind: 'primary' }]
    }) + '</div>';
    Tables.bindActions(container, ready, {
      view: function (row) { openViewResultModal(row); }
    });
  }

  function render(rows) {
    el.innerHTML =
      '<div class="max-w-6xl mx-auto space-y-4">' +
        '<div class="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">' +
          '<h2 class="text-xl font-semibold text-slate-800">' + esc(I18n.t('diagnostics')) + '</h2>' +
          (canOrder ? '<button id="diag-order" class="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium self-start sm:self-auto">＋ ' + esc(I18n.t('order_test')) + '</button>' : '') +
        '</div>' +
        '<div class="flex gap-2 border-b border-slate-200" role="tablist">' +
          '<button data-dtab="orders" class="px-4 py-2 text-sm font-medium border-b-2 border-teal-600 text-teal-700">' + esc(I18n.t('orders')) + '</button>' +
          '<button data-dtab="results" class="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-slate-500">' + esc(I18n.t('results')) + '</button>' +
        '</div>' +
        '<div class="bg-white rounded-xl border border-slate-200 shadow-sm p-2 sm:p-4">' +
          '<div data-dtabpane="orders" id="diag-orders"></div>' +
          '<div data-dtabpane="results" id="diag-results" class="hidden"></div>' +
        '</div>' +
      '</div>';

    renderOrdersTab(el.querySelector('#diag-orders'), rows);
    renderResultsTab(el.querySelector('#diag-results'), rows);

    el.querySelectorAll('[data-dtab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var t = btn.getAttribute('data-dtab');
        el.querySelectorAll('[data-dtab]').forEach(function (b) {
          var active = b.getAttribute('data-dtab') === t;
          b.classList.toggle('border-teal-600', active);
          b.classList.toggle('text-teal-700', active);
          b.classList.toggle('border-transparent', !active);
          b.classList.toggle('text-slate-500', !active);
        });
        el.querySelectorAll('[data-dtabpane]').forEach(function (pane) {
          pane.classList.toggle('hidden', pane.getAttribute('data-dtabpane') !== t);
        });
      });
    });

    var ob = el.querySelector('#diag-order');
    if (ob) ob.addEventListener('click', openOrderModal);
  }

  function showError() {
    el.innerHTML =
      '<div class="max-w-xl mx-auto mt-10">' +
      Cards.panel({
        title: I18n.t('error_load'),
        bodyHTML:
          '<p class="text-sm text-slate-600">' + esc(I18n.t('try_again')) + '</p>' +
          '<button id="diag-retry" class="mt-4 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium">' + esc(I18n.t('retry')) + '</button>'
      }) + '</div>';
    el.querySelector('#diag-retry').addEventListener('click', function () { Views.diagnostics(el); });
  }

  try {
    var res = await Api.get('/diagnostics');
    if (res && res.queued) Toast.info(I18n.t('offline_queued'));
    var rows = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
    render(rows);
  } catch (e) {
    showError();
  }
};
