/* Arogya Seva Maharashtra — Patient Records view (plain script, no modules) */
I18n.addStrings({
  en: {
    records: 'Medical Records',
    search_patient: 'Search patient',
    search_hint: 'Type patient name or phone number, then choose a patient to open their record.',
    select: 'Select',
    no_patients_found: 'No patients found. Try another search.',
    visits: 'Visits',
    vitals: 'Vitals',
    reports: 'Reports',
    blood_group: 'Blood group',
    add_visit_note: 'Add visit note',
    diagnosis: 'Diagnosis',
    prescription: 'Prescription',
    visit_saved: 'Visit note saved',
    upload_report: 'Upload report',
    choose_file: 'Choose file (PDF, JPG, PNG — max 5 MB)',
    file_too_large: 'File is too large. Maximum size is 5 MB.',
    invalid_file: 'Please choose a PDF, JPG or PNG file.',
    report_added: 'Report added (demo mode)',
    no_visits: 'No visits recorded yet.',
    no_vitals: 'No vitals recorded yet.',
    no_reports: 'No reports uploaded yet.',
    pulse: 'Pulse',
    spo2: 'SpO2',
    temp: 'Temp',
    bp: 'BP'
  },
  hi: {
    records: 'चिकित्सा रिकॉर्ड',
    search_patient: 'रोगी खोजें',
    search_hint: 'रोगी का नाम या फ़ोन नंबर लिखें, फिर रिकॉर्ड खोलने के लिए रोगी चुनें।',
    select: 'चुनें',
    no_patients_found: 'कोई रोगी नहीं मिला। कोई अन्य खोज आज़माएँ।',
    visits: 'मुलाकातें',
    vitals: 'वाइटल साइन',
    reports: 'रिपोर्टें',
    blood_group: 'रक्त समूह',
    add_visit_note: 'विज़िट नोट जोड़ें',
    diagnosis: 'निदान',
    prescription: 'नुस्खा',
    visit_saved: 'विज़िट नोट सहेजा गया',
    upload_report: 'रिपोर्ट अपलोड करें',
    choose_file: 'फ़ाइल चुनें (PDF, JPG, PNG — अधिकतम 5 MB)',
    file_too_large: 'फ़ाइल बहुत बड़ी है। अधिकतम आकार 5 MB है।',
    invalid_file: 'कृपया PDF, JPG या PNG फ़ाइल चुनें।',
    report_added: 'रिपोर्ट जोड़ी गई (डेमो मोड)',
    no_visits: 'अभी तक कोई मुलाकात दर्ज नहीं है।',
    no_vitals: 'अभी तक कोई वाइटल दर्ज नहीं है।',
    no_reports: 'अभी तक कोई रिपोर्ट अपलोड नहीं हुई है।',
    pulse: 'नब्ज़',
    spo2: 'SpO2',
    temp: 'तापमान',
    bp: 'रक्तचाप'
  },
  mr: {
    records: 'वैद्यकीय रेकॉर्ड',
    search_patient: 'रुग्ण शोधा',
    search_hint: 'रुग्णाचे नाव किंवा फोन नंबर टाइप करा, मग रेकॉर्ड उघडण्यासाठी रुग्ण निवडा.',
    select: 'निवडा',
    no_patients_found: 'कोणताही रुग्ण आढळला नाही. दुसरा शोध प्रयत्न करा.',
    visits: 'भेटी',
    vitals: 'वाइटल साईन',
    reports: 'अहवाल',
    blood_group: 'रक्तगट',
    add_visit_note: 'भेट नोंद जोडा',
    diagnosis: 'निदान',
    prescription: 'प्रिस्क्रिप्शन',
    visit_saved: 'भेट नोंद जतन केली',
    upload_report: 'अहवाल अपलोड करा',
    choose_file: 'फाइल निवडा (PDF, JPG, PNG — जास्तीत जास्त 5 MB)',
    file_too_large: 'फाइल खूप मोठी आहे. जास्तीत जास्त आकार 5 MB आहे.',
    invalid_file: 'कृपया PDF, JPG किंवा PNG फाइल निवडा.',
    report_added: 'अहवाल जोडला (डेमो मोड)',
    no_visits: 'अद्याप कोणत्याही भेटी नोंदवलेल्या नाहीत.',
    no_vitals: 'अद्याप कोणतेही वाइटल नोंदवलेले नाहीत.',
    no_reports: 'अद्याप कोणताही अहवाल अपलोड केलेला नाही.',
    pulse: 'नाडी',
    spo2: 'SpO2',
    temp: 'तापमान',
    bp: 'रक्तदाब'
  }
});

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

Views.records = async function (el) {
  document.title = I18n.t('records') + ' · ' + I18n.t('app_name');
  el.innerHTML = Skeleton.page();

  function showError() {
    el.innerHTML =
      '<div class="max-w-xl mx-auto mt-10">' +
      Cards.panel({
        title: I18n.t('error_load'),
        bodyHTML:
          '<p class="text-sm text-slate-600">' + esc(I18n.t('try_again')) + '</p>' +
          '<button id="rec-retry" class="mt-4 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium">' + esc(I18n.t('retry')) + '</button>'
      }) + '</div>';
    el.querySelector('#rec-retry').addEventListener('click', function () { Views.records(el); });
  }

  function renderSearch() {
    el.innerHTML =
      '<div class="max-w-2xl mx-auto">' +
      Cards.panel({
        title: I18n.t('search_patient'),
        subtitle: I18n.t('search_hint'),
        bodyHTML:
          '<form id="rec-search-form" class="flex flex-col sm:flex-row gap-2">' +
            '<input id="rec-q" type="text" autocomplete="off" class="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="' + esc(I18n.t('search')) + '…" />' +
            '<button type="submit" class="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium">' + esc(I18n.t('search')) + '</button>' +
          '</form>' +
          '<div id="rec-results" class="mt-4 space-y-2"></div>'
      }) + '</div>';

    el.querySelector('#rec-search-form').addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var q = el.querySelector('#rec-q').value.trim();
      var box = el.querySelector('#rec-results');
      if (!q) return;
      box.innerHTML = Skeleton.lines();
      try {
        var res = await Api.get('/patients?q=' + encodeURIComponent(q));
        if (res && res.queued) Toast.info(I18n.t('offline_queued'));
        var list = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
        if (!list.length) {
          box.innerHTML = EmptyState.render({ icon: '🔍', title: I18n.t('no_data'), message: I18n.t('no_patients_found') });
          return;
        }
        box.innerHTML = list.map(function (p) {
          return '<div class="flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2 bg-white">' +
            '<div><div class="font-medium text-sm">' + esc(p.name) + '</div>' +
            '<div class="text-xs text-slate-500">' + esc(p.age) + ' · ' + esc(I18n.t(p.gender || 'other')) + ' · ' + esc(p.village || '') + '</div></div>' +
            '<button data-pick="' + esc(p.id) + '" class="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-medium">' + esc(I18n.t('select')) + '</button></div>';
        }).join('');
        box.querySelectorAll('[data-pick]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            Router.go('#/records?id=' + encodeURIComponent(btn.getAttribute('data-pick')));
          });
        });
      } catch (err) {
        box.innerHTML = EmptyState.render({ icon: '⚠️', title: I18n.t('error_load'), message: I18n.t('try_again') });
      }
    });
  }

  function openVisitModal(id) {
    var body =
      '<form id="visit-form" class="space-y-3">' +
      Forms.field({ label: I18n.t('diagnosis'), name: 'diagnosis', type: 'text', required: true }) +
      Forms.field({ label: I18n.t('notes'), name: 'notes', type: 'textarea', rows: 3 }) +
      Forms.field({ label: I18n.t('prescription'), name: 'prescription', type: 'textarea', rows: 3 }) +
      '</form>';
    Modal.open({
      title: I18n.t('add_visit_note'),
      bodyHTML: body,
      actions: [
        { label: I18n.t('cancel'), kind: 'secondary', onClick: function () { Modal.close(); } },
        {
          label: I18n.t('save'), kind: 'primary', onClick: async function () {
            var form = document.getElementById('visit-form');
            if (!Forms.validate(form)) { Toast.error(I18n.t('required_field')); return; }
            var vals = Forms.values(form);
            try {
              var res = await Api.post('/patients/' + encodeURIComponent(id) + '/visits', vals);
              if (res && res.queued) Toast.info(I18n.t('offline_queued'));
              else Toast.success(I18n.t('visit_saved'));
              Modal.close();
              Views.records(el);
            } catch (e) { Toast.error(I18n.t('operation_failed')); }
          }
        }
      ]
    });
  }

  function renderRecord(id, data) {
    var p = data.patient || {};
    var visits = data.visits || [];
    var vitals = data.vitals || [];
    var reports = data.reports || [];
    var canAddVisit = Auth.can('doctor');

    var genderLabel = p.gender ? I18n.t(p.gender) : '';

    var header =
      '<div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">' +
        '<div class="flex flex-col sm:flex-row sm:items-center gap-4">' +
          '<div class="w-14 h-14 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xl font-bold shrink-0">' + esc((p.name || '?').charAt(0).toUpperCase()) + '</div>' +
          '<div class="flex-1 min-w-0">' +
            '<h2 class="text-lg font-semibold text-slate-800">' + esc(p.name) + '</h2>' +
            '<div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 mt-1">' +
              '<span>' + esc(p.age) + ' ' + esc(I18n.t('age')) + '</span>' +
              (genderLabel ? '<span>' + esc(genderLabel) + '</span>' : '') +
              (p.phone ? '<span>📞 ' + esc(p.phone) + '</span>' : '') +
              (p.village ? '<span>📍 ' + esc(p.village) + '</span>' : '') +
              (p.bloodGroup ? '<span class="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">' + esc(p.bloodGroup) + '</span>' : '') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="flex gap-2 mt-5 border-b border-slate-200" role="tablist">' +
          '<button data-tab="visits" class="px-4 py-2 text-sm font-medium border-b-2 border-teal-600 text-teal-700">' + esc(I18n.t('visits')) + '</button>' +
          '<button data-tab="vitals" class="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-slate-500">' + esc(I18n.t('vitals')) + '</button>' +
          '<button data-tab="reports" class="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-slate-500">' + esc(I18n.t('reports')) + '</button>' +
        '</div>' +
      '</div>';

    var visitsHTML = visits.length
      ? '<div class="mt-4">' + visits.map(function (v) {
          return '<div class="relative pl-6 pb-6 border-l-2 border-teal-200 ml-2 last:pb-0">' +
            '<span class="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-teal-500"></span>' +
            '<div class="text-xs text-slate-500">' + esc(v.date) + (v.doctor ? ' · ' + esc(v.doctor) : '') + '</div>' +
            '<div class="font-medium text-sm text-slate-800 mt-0.5">' + esc(v.diagnosis) + '</div>' +
            (v.notes ? '<p class="text-sm text-slate-600 mt-1">' + esc(v.notes) + '</p>' : '') +
            (v.prescription ? '<p class="text-sm text-slate-600 mt-1"><span class="font-medium text-slate-700">' + esc(I18n.t('prescription')) + ':</span> ' + esc(v.prescription) + '</p>' : '') +
          '</div>';
        }).join('') + '</div>'
      : EmptyState.render({ icon: '🩺', title: I18n.t('no_data'), message: I18n.t('no_visits') });

    var vitalsSection =
      '<div data-tabpane="vitals" class="hidden">' +
        (vitals.length
          ? '<div class="bg-white rounded-xl border border-slate-200 p-4 mt-4"><div class="h-64"><canvas id="vitals-chart"></canvas></div></div>' +
            '<div class="mt-4 overflow-x-auto">' +
            Tables.render({
              columns: [
                { key: 'date', label: I18n.t('date') },
                { key: 'temp', label: I18n.t('temp') + ' (°F)' },
                { key: 'bp', label: I18n.t('bp'), render: function (r) { return esc(r.sysBp) + '/' + esc(r.diaBp); } },
                { key: 'pulse', label: I18n.t('pulse') },
                { key: 'spo2', label: I18n.t('spo2') + ' (%)' }
              ],
              rows: vitals
            }) + '</div>'
          : '<div class="mt-4">' + EmptyState.render({ icon: '💓', title: I18n.t('no_data'), message: I18n.t('no_vitals') }) + '</div>') +
      '</div>';

    var reportsSection =
      '<div data-tabpane="reports" class="hidden">' +
        '<div class="flex justify-end mt-4">' +
          '<button id="rec-upload-btn" class="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium">⬆ ' + esc(I18n.t('upload_report')) + '</button>' +
          '<input id="rec-file" type="file" accept=".pdf,.jpg,.jpeg,.png" class="hidden" />' +
        '</div>' +
        '<div id="rec-reports-list" class="mt-3"></div>' +
      '</div>';

    el.innerHTML =
      '<div class="max-w-4xl mx-auto space-y-4">' + header +
        '<div data-tabpane="visits">' +
          (canAddVisit
            ? '<div class="flex justify-end mt-4"><button id="rec-add-visit" class="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium">＋ ' + esc(I18n.t('add_visit_note')) + '</button></div>'
            : '') +
          visitsHTML +
        '</div>' +
        vitalsSection + reportsSection +
      '</div>';

    function renderReportsList() {
      var box = el.querySelector('#rec-reports-list');
      if (!reports.length) {
        box.innerHTML = EmptyState.render({ icon: '📄', title: I18n.t('no_data'), message: I18n.t('no_reports') });
        return;
      }
      box.innerHTML = '<div class="space-y-2">' + reports.map(function (r) {
        return '<div class="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">' +
          '<div class="min-w-0"><div class="font-medium text-sm truncate">' + esc(r.name) + '</div>' +
          '<div class="text-xs text-slate-500">' + esc(r.date) + (r.size ? ' · ' + esc(r.size) : '') + '</div></div>' +
          '<button data-dl class="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium shrink-0">⬇ ' + esc(I18n.t('download')) + '</button></div>';
      }).join('') + '</div>';
      box.querySelectorAll('[data-dl]').forEach(function (btn) {
        btn.addEventListener('click', function () { Toast.info(I18n.t('demo_notice')); });
      });
    }
    renderReportsList();

    // Tab switching
    el.querySelectorAll('[data-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var t = btn.getAttribute('data-tab');
        el.querySelectorAll('[data-tab]').forEach(function (b) {
          var active = b.getAttribute('data-tab') === t;
          b.classList.toggle('border-teal-600', active);
          b.classList.toggle('text-teal-700', active);
          b.classList.toggle('border-transparent', !active);
          b.classList.toggle('text-slate-500', !active);
        });
        el.querySelectorAll('[data-tabpane]').forEach(function (pane) {
          pane.classList.toggle('hidden', pane.getAttribute('data-tabpane') !== t);
        });
      });
    });

    var addBtn = el.querySelector('#rec-add-visit');
    if (addBtn) addBtn.addEventListener('click', function () { openVisitModal(id); });

    el.querySelector('#rec-upload-btn').addEventListener('click', function () {
      el.querySelector('#rec-file').click();
    });
    el.querySelector('#rec-file').addEventListener('change', function (ev) {
      var f = ev.target.files && ev.target.files[0];
      if (!f) return;
      if (!/\.(pdf|jpe?g|png)$/i.test(f.name)) { Toast.error(I18n.t('invalid_file')); ev.target.value = ''; return; }
      if (f.size > 5 * 1024 * 1024) { Toast.error(I18n.t('file_too_large')); ev.target.value = ''; return; }
      Toast.info(I18n.t('demo_notice'));
      reports.unshift({
        id: 'local-' + Date.now(),
        name: f.name,
        date: new Date().toISOString().slice(0, 10),
        size: Math.round(f.size / 1024) + ' KB'
      });
      renderReportsList();
      Toast.success(I18n.t('report_added'));
      ev.target.value = '';
    });

    // Vitals chart
    if (window.Chart && vitals.length) {
      var canvas = el.querySelector('#vitals-chart');
      if (canvas) {
        new Chart(canvas, {
          type: 'line',
          data: {
            labels: vitals.map(function (v) { return v.date; }),
            datasets: [
              { label: I18n.t('pulse'), data: vitals.map(function (v) { return v.pulse; }), borderColor: '#0d9488', backgroundColor: '#0d9488', tension: 0.3, fill: false },
              { label: I18n.t('spo2'), data: vitals.map(function (v) { return v.spo2; }), borderColor: '#2563eb', backgroundColor: '#2563eb', tension: 0.3, fill: false }
            ]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
      }
    }
  }

  try {
    var params = Router.params() || {};
    var id = params.id;
    if (!id) { renderSearch(); return; }
    var res = await Api.get('/patients/' + encodeURIComponent(id) + '/record');
    if (res && res.queued) Toast.info(I18n.t('offline_queued'));
    var data = (res && res.data) ? res.data : res;
    if (!data || !data.patient) { showError(); return; }
    renderRecord(id, data);
  } catch (e) {
    showError();
  }
};
