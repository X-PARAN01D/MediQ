/* Arogya Seva Maharashtra — Facility Dashboard view.
   Plain script, no modules. Registers Views['facility-dashboard'].
   Roles: facility_admin, system_admin, doctor. */

I18n.addStrings({
  en: {
    fd_title: 'Facility Dashboard',
    patients_today: 'Patients Today',
    appointments_today: 'Appointments Today',
    active_referrals: 'Active Referrals',
    critical_cases: 'Critical Cases',
    low_stock_items: 'Low Stock Items',
    queue_length: 'Queue Length',
    appts_by_day: 'Appointments by Day',
    referrals_by_status: 'Referrals by Status',
    stock_alerts: 'Stock Alerts',
    stock: 'Stock',
    reorder_level: 'Reorder Level',
    queue_now: 'Live Queue',
    now_serving: 'Now Serving',
    waiting: 'Waiting',
    charts_unavailable: 'Charts unavailable in this browser.',
    no_stock_alerts: 'All stock levels are healthy.',
    no_queue: 'No patients in queue right now.'
  },
  hi: {
    fd_title: 'सुविधा डैशबोर्ड',
    patients_today: 'आज के मरीज़',
    appointments_today: 'आज की नियुक्तियाँ',
    active_referrals: 'सक्रिय रेफरल',
    critical_cases: 'गंभीर मामले',
    low_stock_items: 'कम स्टॉक वाली वस्तुएँ',
    queue_length: 'कतार की लंबाई',
    appts_by_day: 'दिन-वार नियुक्तियाँ',
    referrals_by_status: 'स्थिति-वार रेफरल',
    stock_alerts: 'स्टॉक चेतावनियाँ',
    stock: 'स्टॉक',
    reorder_level: 'पुनः-आदेश स्तर',
    queue_now: 'लाइव कतार',
    now_serving: 'अभी सेवा में',
    waiting: 'प्रतीक्षा में',
    charts_unavailable: 'इस ब्राउज़र में चार्ट उपलब्ध नहीं हैं।',
    no_stock_alerts: 'सभी स्टॉक स्तर स्वस्थ हैं।',
    no_queue: 'अभी कतार में कोई मरीज़ नहीं है।'
  },
  mr: {
    fd_title: 'सुविधा डॅशबोर्ड',
    patients_today: 'आजचे रुग्ण',
    appointments_today: 'आजच्या भेटी',
    active_referrals: 'सक्रिय संदर्भ',
    critical_cases: 'गंभीर प्रकरणे',
    low_stock_items: 'कमी साठा असलेल्या वस्तू',
    queue_length: 'रांगेची लांबी',
    appts_by_day: 'दिवसनिहाय भेटी',
    referrals_by_status: 'स्थितीनिहाय संदर्भ',
    stock_alerts: 'साठा सूचना',
    stock: 'साठा',
    reorder_level: 'पुन्हा-मागणी पातळी',
    queue_now: 'थेट रांग',
    now_serving: 'सध्या सेवा',
    waiting: 'प्रतीक्षेत',
    charts_unavailable: 'या ब्राउझरमध्ये तक्ते उपलब्ध नाहीत.',
    no_stock_alerts: 'सर्व साठा पातळ्या निरोगी आहेत.',
    no_queue: 'सध्या रांगेत कोणीही रुग्ण नाही.'
  }
});

(function () {
  'use strict';

  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function num(v) {
    var n = Number(v);
    return isNaN(n) ? 0 : n;
  }

  Views['facility-dashboard'] = async function (el) {
    document.title = I18n.t('app_name') + ' · ' + I18n.t('fd_title');
    el.innerHTML = '<div class="p-4 max-w-7xl mx-auto">' + Skeleton.page() + '</div>';

    var stats = null;
    try {
      var res = await Api.get('/facility/stats');
      if (res && res.queued) Toast.info(I18n.t('offline_queued'));
      stats = (res && res.data) || res || {};
    } catch (e) {
      el.innerHTML = '<div class="p-4 max-w-2xl mx-auto">' +
        '<div class="rounded-xl bg-red-50 border border-red-200 p-6 text-center">' +
        '<p class="font-medium text-red-800">' + esc(I18n.t('error_load')) + '</p>' +
        '<button id="fd-retry" class="btn btn-danger mt-4">' + esc(I18n.t('try_again')) + '</button>' +
        '</div></div>';
      var rb = el.querySelector('#fd-retry');
      if (rb) rb.addEventListener('click', function () { Views['facility-dashboard'](el); });
      return;
    }

    var kpis = stats.kpis || {};
    var abd = stats.appointmentsByDay || { labels: [], data: [] };
    var rbs = stats.referralsByStatus || { labels: [], data: [] };
    var stockAlerts = stats.stockAlerts || [];
    var queue = stats.queueNow || {};

    /* KPI cards */
    var kpiDefs = [
      { label: I18n.t('patients_today'), value: num(kpis.patientsToday), icon: '🧑‍⚕️', tone: 'teal' },
      { label: I18n.t('appointments_today'), value: num(kpis.appointmentsToday), icon: '📅', tone: 'blue' },
      { label: I18n.t('active_referrals'), value: num(kpis.activeReferrals), icon: '🔁', tone: 'amber' },
      { label: I18n.t('critical_cases'), value: num(kpis.criticalCases), icon: '🚨', tone: 'red' },
      { label: I18n.t('low_stock_items'), value: num(kpis.lowStock), icon: '📦', tone: 'amber' },
      { label: I18n.t('queue_length'), value: num(kpis.queueLength), icon: '👥', tone: 'slate' }
    ];
    var kpiHTML = '<div class="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">' +
      kpiDefs.map(function (k) { return Cards.stat({ label: k.label, value: k.value, sub: '', icon: k.icon, tone: k.tone }); }).join('') +
      '</div>';

    /* Charts */
    var chartsHTML =
      '<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">' +
      Cards.panel({
        title: I18n.t('appts_by_day'),
        bodyHTML: '<div class="relative h-64"><canvas id="fd-bar"></canvas>' +
          '<p id="fd-bar-fallback" class="hidden text-sm text-gray-500 text-center py-10">' + esc(I18n.t('charts_unavailable')) + '</p></div>'
      }) +
      Cards.panel({
        title: I18n.t('referrals_by_status'),
        bodyHTML: '<div class="relative h-64"><canvas id="fd-doughnut"></canvas>' +
          '<p id="fd-doughnut-fallback" class="hidden text-sm text-gray-500 text-center py-10">' + esc(I18n.t('charts_unavailable')) + '</p></div>'
      }) +
      '</div>';

    /* Stock alerts */
    var stockBody = stockAlerts.length
      ? Tables.render({
        columns: [
          { key: 'name', label: I18n.t('name') },
          {
            key: 'stock', label: I18n.t('stock'),
            render: function (r) {
              return '<span class="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">' + esc(r.stock) + '</span>';
            }
          },
          { key: 'reorderLevel', label: I18n.t('reorder_level') }
        ],
        rows: stockAlerts,
        emptyTitle: I18n.t('no_data'),
        emptyMessage: I18n.t('no_stock_alerts'),
        actions: []
      })
      : '<p class="text-sm text-gray-500 py-4 text-center">✓ ' + esc(I18n.t('no_stock_alerts')) + '</p>';
    var stockHTML = '<div class="mb-4">' + Cards.panel({ title: I18n.t('stock_alerts'), bodyHTML: stockBody }) + '</div>';

    /* Queue snapshot */
    var queueBody =
      '<div class="grid grid-cols-2 gap-4 text-center">' +
      '<div class="rounded-xl bg-teal-50 border border-teal-200 p-4">' +
      '<p class="text-xs uppercase tracking-wide text-teal-700 font-semibold">' + esc(I18n.t('now_serving')) + '</p>' +
      '<p class="text-3xl font-extrabold text-teal-800 mt-1">' + esc(queue.nowServing != null ? queue.nowServing : '—') + '</p></div>' +
      '<div class="rounded-xl bg-amber-50 border border-amber-200 p-4">' +
      '<p class="text-xs uppercase tracking-wide text-amber-700 font-semibold">' + esc(I18n.t('waiting')) + '</p>' +
      '<p class="text-3xl font-extrabold text-amber-800 mt-1">' + esc(queue.waiting != null ? queue.waiting : num(kpis.queueLength)) + '</p></div>' +
      '</div>' +
      (!queue.nowServing && !num(kpis.queueLength)
        ? '<p class="text-sm text-gray-500 text-center mt-3">' + esc(I18n.t('no_queue')) + '</p>'
        : '');
    var queueHTML = '<div class="mb-4">' + Cards.panel({ title: I18n.t('queue_now'), bodyHTML: queueBody }) + '</div>';

    el.innerHTML =
      '<div class="p-4 max-w-7xl mx-auto">' +
      '<h1 class="text-xl sm:text-2xl font-bold text-gray-900 mb-4">' + esc(I18n.t('fd_title')) + '</h1>' +
      kpiHTML + chartsHTML + stockHTML + queueHTML +
      '</div>';

    /* Draw charts (guard window.Chart) */
    var charts = [];
    function showFallback(canvasId, fallbackId) {
      var c = document.getElementById(canvasId);
      if (c) c.classList.add('hidden');
      var f = document.getElementById(fallbackId);
      if (f) f.classList.remove('hidden');
    }
    if (window.Chart) {
      try {
        var bar = document.getElementById('fd-bar');
        if (bar) {
          charts.push(new window.Chart(bar, {
            type: 'bar',
            data: {
              labels: abd.labels || [],
              datasets: [{ data: abd.data || [], backgroundColor: '#0d9488', borderRadius: 6 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
          }));
        }
        var doughnut = document.getElementById('fd-doughnut');
        if (doughnut) {
          charts.push(new window.Chart(doughnut, {
            type: 'doughnut',
            data: {
              labels: rbs.labels || [],
              datasets: [{ data: rbs.data || [], backgroundColor: ['#f59e0b', '#3b82f6', '#10b981'] }]
            },
            options: { responsive: true, maintainAspectRatio: false }
          }));
        }
      } catch (e) {
        showFallback('fd-bar', 'fd-bar-fallback');
        showFallback('fd-doughnut', 'fd-doughnut-fallback');
      }
    } else {
      showFallback('fd-bar', 'fd-bar-fallback');
      showFallback('fd-doughnut', 'fd-doughnut-fallback');
    }

    return function () {
      charts.forEach(function (c) { try { c.destroy(); } catch (e) { /* noop */ } });
    };
  };

})();
