/* Arogya Seva Maharashtra — Pharmacy view (plain script, no modules) */
I18n.addStrings({
  en: {
    pharmacy: 'Pharmacy',
    dispense: 'Dispense',
    update_stock: 'Update stock',
    stock: 'Stock',
    unit: 'Unit',
    batch: 'Batch',
    expiry: 'Expiry',
    reorder_level: 'Reorder level',
    medicine_name: 'Medicine',
    low_stock: 'Low stock',
    out_of_stock: 'Out of stock',
    in_stock: 'In stock',
    total_medicines: 'Total medicines',
    quantity: 'Quantity',
    dispense_saved: 'Medicine dispensed',
    stock_updated: 'Stock updated',
    my_prescriptions: 'My prescriptions',
    prescribed_on: 'Prescribed on',
    prescribed_by: 'Prescribed by',
    dosage: 'Dosage',
    no_prescriptions: 'No prescriptions found.'
  },
  hi: {
    pharmacy: 'फार्मेसी',
    dispense: 'दवा दें',
    update_stock: 'स्टॉक अपडेट करें',
    stock: 'स्टॉक',
    unit: 'इकाई',
    batch: 'बैच',
    expiry: 'समाप्ति',
    reorder_level: 'पुनः आदेश स्तर',
    medicine_name: 'दवा',
    low_stock: 'कम स्टॉक',
    out_of_stock: 'स्टॉक समाप्त',
    in_stock: 'स्टॉक में',
    total_medicines: 'कुल दवाएँ',
    quantity: 'मात्रा',
    dispense_saved: 'दवा दे दी गई',
    stock_updated: 'स्टॉक अपडेट हुआ',
    my_prescriptions: 'मेरे नुस्खे',
    prescribed_on: 'नुस्खा तिथि',
    prescribed_by: 'नुस्खा देने वाले',
    dosage: 'खुराक',
    no_prescriptions: 'कोई नुस्खा नहीं मिला।'
  },
  mr: {
    pharmacy: 'फार्मसी',
    dispense: 'औषध द्या',
    update_stock: 'साठा अद्यतनित करा',
    stock: 'साठा',
    unit: 'एकक',
    batch: 'बॅच',
    expiry: 'कालबाह्यता',
    reorder_level: 'पुनर्मागणी पातळी',
    medicine_name: 'औषध',
    low_stock: 'कमी साठा',
    out_of_stock: 'साठा संपला',
    in_stock: 'साठ्यात',
    total_medicines: 'एकूण औषधे',
    quantity: 'प्रमाण',
    dispense_saved: 'औषध दिले',
    stock_updated: 'साठा अद्यतनित केला',
    my_prescriptions: 'माझी प्रिस्क्रिप्शन्स',
    prescribed_on: 'प्रिस्क्रिप्शन तारीख',
    prescribed_by: 'प्रिस्क्रिप्शन देणारे',
    dosage: 'मात्रा',
    no_prescriptions: 'कोणतेही प्रिस्क्रिप्शन आढळले नाही.'
  }
});

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

Views.pharmacy = async function (el) {
  document.title = I18n.t('pharmacy') + ' · ' + I18n.t('app_name');
  el.innerHTML = Skeleton.page();

  var isPatient = Auth.can('patient') && !Auth.can('doctor', 'pharmacist', 'admin');
  var canManage = Auth.can('pharmacist', 'doctor', 'admin');

  function badge(text, tone) {
    var tones = {
      red: 'bg-red-100 text-red-700',
      amber: 'bg-amber-100 text-amber-800',
      green: 'bg-green-100 text-green-700',
      slate: 'bg-slate-100 text-slate-600'
    };
    return '<span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold ' + (tones[tone] || tones.slate) + '">' + esc(text) + '</span>';
  }

  function showError(retryFn) {
    el.innerHTML =
      '<div class="max-w-xl mx-auto mt-10">' +
      Cards.panel({
        title: I18n.t('error_load'),
        bodyHTML:
          '<p class="text-sm text-slate-600">' + esc(I18n.t('try_again')) + '</p>' +
          '<button id="ph-retry" class="mt-4 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium">' + esc(I18n.t('retry')) + '</button>'
      }) + '</div>';
    el.querySelector('#ph-retry').addEventListener('click', retryFn);
  }

  function openDispenseModal(med) {
    var body =
      '<form id="disp-form" class="space-y-3">' +
      '<div class="text-sm text-slate-600"><span class="font-medium text-slate-800">' + esc(med.name) + '</span> · ' + esc(I18n.t('stock')) + ': ' + esc(med.stock) + ' ' + esc(med.unit) + '</div>' +
      Forms.field({ label: I18n.t('patient_name'), name: 'patientName', type: 'text', required: true }) +
      Forms.field({ label: I18n.t('quantity'), name: 'qty', type: 'number', min: 1, max: med.stock, value: 1, required: true }) +
      '</form>';
    Modal.open({
      title: I18n.t('dispense') + ' — ' + med.name,
      bodyHTML: body,
      actions: [
        { label: I18n.t('cancel'), kind: 'secondary', onClick: function () { Modal.close(); } },
        {
          label: I18n.t('dispense'), kind: 'primary', onClick: async function () {
            var form = document.getElementById('disp-form');
            if (!Forms.validate(form)) { Toast.error(I18n.t('required_field')); return; }
            var vals = Forms.values(form);
            try {
              var res = await Api.post('/pharmacy/dispense', { medicineId: med.id, qty: Number(vals.qty), patientName: vals.patientName });
              if (res && res.queued) Toast.info(I18n.t('offline_queued'));
              else Toast.success(I18n.t('dispense_saved'));
              Modal.close();
              Views.pharmacy(el);
            } catch (e) { Toast.error(I18n.t('operation_failed')); }
          }
        }
      ]
    });
  }

  function openStockModal(med) {
    var body =
      '<form id="stock-form" class="space-y-3">' +
      Forms.field({ label: I18n.t('stock') + ' (' + med.unit + ')', name: 'stock', type: 'number', min: 0, value: med.stock, required: true }) +
      '</form>';
    Modal.open({
      title: I18n.t('update_stock') + ' — ' + med.name,
      bodyHTML: body,
      actions: [
        { label: I18n.t('cancel'), kind: 'secondary', onClick: function () { Modal.close(); } },
        {
          label: I18n.t('update'), kind: 'primary', onClick: async function () {
            var form = document.getElementById('stock-form');
            if (!Forms.validate(form)) { Toast.error(I18n.t('required_field')); return; }
            var vals = Forms.values(form);
            try {
              var res = await Api.put('/medicines/' + encodeURIComponent(med.id), { stock: Number(vals.stock) });
              if (res && res.queued) Toast.info(I18n.t('offline_queued'));
              else Toast.success(I18n.t('stock_updated'));
              Modal.close();
              Views.pharmacy(el);
            } catch (e) { Toast.error(I18n.t('operation_failed')); }
          }
        }
      ]
    });
  }

  function renderStock(meds) {
    var low = meds.filter(function (m) { return Number(m.stock) > 0 && Number(m.stock) <= Number(m.reorderLevel); }).length;
    var out = meds.filter(function (m) { return Number(m.stock) <= 0; }).length;

    var stats =
      '<div class="grid grid-cols-3 gap-3">' +
        Cards.stat({ label: I18n.t('total_medicines'), value: meds.length, icon: '💊', tone: 'teal' }) +
        Cards.stat({ label: I18n.t('low_stock'), value: low, icon: '⚠️', tone: 'amber' }) +
        Cards.stat({ label: I18n.t('out_of_stock'), value: out, icon: '🚫', tone: 'red' }) +
      '</div>';

    var rowsHtml = meds.length ? meds.map(function (m) {
      var s = Number(m.stock), r = Number(m.reorderLevel);
      var rowTone = s <= 0 ? 'bg-red-50' : (s <= r ? 'bg-amber-50' : '');
      var stockBadge = s <= 0 ? badge(m.stock + ' ' + m.unit + ' · ' + I18n.t('out_of_stock'), 'red')
        : (s <= r ? badge(m.stock + ' ' + m.unit + ' · ' + I18n.t('low_stock'), 'amber')
        : badge(m.stock + ' ' + m.unit, 'green'));
      return '<tr class="border-b border-slate-100 ' + rowTone + '">' +
        '<td class="px-3 py-2.5 font-medium text-slate-800">' + esc(m.name) + '<div class="text-xs font-normal text-slate-500">' + esc(I18n.t('batch')) + ': ' + esc(m.batch || '—') + '</div></td>' +
        '<td class="px-3 py-2.5">' + stockBadge + '</td>' +
        '<td class="px-3 py-2.5 text-slate-600">' + esc(m.reorderLevel) + '</td>' +
        '<td class="px-3 py-2.5 text-slate-600">' + esc(m.expiry || '—') + '</td>' +
        '<td class="px-3 py-2.5"><div class="flex gap-2">' +
          (canManage ? '<button data-dispense="' + esc(m.id) + '" class="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-medium">' + esc(I18n.t('dispense')) + '</button>' : '') +
          (canManage ? '<button data-stock="' + esc(m.id) + '" class="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">' + esc(I18n.t('update_stock')) + '</button>' : '') +
        '</div></td>' +
      '</tr>';
    }).join('') : '<tr><td colspan="5" class="px-3 py-8 text-center text-slate-500 text-sm">' + esc(I18n.t('no_data')) + '</td></tr>';

    el.innerHTML =
      '<div class="max-w-6xl mx-auto space-y-4">' +
        '<h2 class="text-xl font-semibold text-slate-800">' + esc(I18n.t('pharmacy')) + '</h2>' +
        stats +
        '<div class="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">' +
          '<table class="min-w-full text-sm">' +
            '<thead><tr class="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">' +
              '<th class="px-3 py-2.5">' + esc(I18n.t('medicine_name')) + '</th>' +
              '<th class="px-3 py-2.5">' + esc(I18n.t('stock')) + '</th>' +
              '<th class="px-3 py-2.5">' + esc(I18n.t('reorder_level')) + '</th>' +
              '<th class="px-3 py-2.5">' + esc(I18n.t('expiry')) + '</th>' +
              '<th class="px-3 py-2.5">' + esc(I18n.t('actions')) + '</th>' +
            '</tr></thead>' +
            '<tbody>' + rowsHtml + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>';

    var byId = {};
    meds.forEach(function (m) { byId[m.id] = m; });
    el.querySelectorAll('[data-dispense]').forEach(function (btn) {
      btn.addEventListener('click', function () { openDispenseModal(byId[btn.getAttribute('data-dispense')]); });
    });
    el.querySelectorAll('[data-stock]').forEach(function (btn) {
      btn.addEventListener('click', function () { openStockModal(byId[btn.getAttribute('data-stock')]); });
    });
  }

  function renderPrescriptions(list) {
    var items = list.length ? list.map(function (rx) {
      return '<div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">' +
        '<div class="flex items-start justify-between gap-3">' +
          '<div class="min-w-0">' +
            '<div class="font-medium text-sm text-slate-800">' + esc(rx.medicineName || rx.name) + '</div>' +
            '<div class="text-xs text-slate-500 mt-1">' +
              (rx.dosage ? esc(I18n.t('dosage')) + ': ' + esc(rx.dosage) + ' · ' : '') +
              (rx.prescribedBy ? esc(I18n.t('prescribed_by')) + ': ' + esc(rx.prescribedBy) + ' · ' : '') +
              (rx.date ? esc(I18n.t('prescribed_on')) + ': ' + esc(rx.date) : '') +
            '</div>' +
            (rx.notes ? '<p class="text-sm text-slate-600 mt-2">' + esc(rx.notes) + '</p>' : '') +
          '</div>' +
          '<button data-rx-dl class="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium shrink-0">⬇ ' + esc(I18n.t('download')) + '</button>' +
        '</div>' +
      '</div>';
    }).join('')
      : EmptyState.render({ icon: '💊', title: I18n.t('no_data'), message: I18n.t('no_prescriptions') });

    el.innerHTML =
      '<div class="max-w-3xl mx-auto space-y-4">' +
        '<h2 class="text-xl font-semibold text-slate-800">' + esc(I18n.t('my_prescriptions')) + '</h2>' +
        '<div class="space-y-3">' + items + '</div>' +
      '</div>';

    el.querySelectorAll('[data-rx-dl]').forEach(function (btn) {
      btn.addEventListener('click', function () { Toast.info(I18n.t('demo_notice')); });
    });
  }

  try {
    if (isPatient) {
      var user = Auth.user() || {};
      var res = await Api.get('/pharmacy/prescriptions?patient=' + encodeURIComponent(user.name || ''));
      if (res && res.queued) Toast.info(I18n.t('offline_queued'));
      var list = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
      renderPrescriptions(list);
    } else {
      var res2 = await Api.get('/medicines');
      if (res2 && res2.queued) Toast.info(I18n.t('offline_queued'));
      var meds = (res2 && res2.data) ? res2.data : (Array.isArray(res2) ? res2 : []);
      renderStock(meds);
    }
  } catch (e) {
    showError(function () { Views.pharmacy(el); });
  }
};
