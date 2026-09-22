I18n.addStrings({
  en: {
    x_title: 'Dashboard',
    greeting_morning: 'Good morning',
    greeting_afternoon: 'Good afternoon',
    greeting_evening: 'Good evening',
    today_is: 'Today is',
    recent_alerts: 'Alerts & notices',
    quick_actions: 'Quick actions',
    weekly_trend: 'Weekly activity',
    no_alerts: 'No alerts. All services running normally.'
  },
  hi: {
    x_title: 'डैशबोर्ड',
    greeting_morning: 'सुप्रभात',
    greeting_afternoon: 'नमस्कार',
    greeting_evening: 'शुभ संध्या',
    today_is: 'आज है',
    recent_alerts: 'अलर्ट और सूचनाएँ',
    quick_actions: 'त्वरित क्रियाएँ',
    weekly_trend: 'साप्ताहिक गतिविधि',
    no_alerts: 'कोई अलर्ट नहीं। सभी सेवाएँ सामान्य रूप से चल रही हैं।'
  },
  mr: {
    x_title: 'डॅशबोर्ड',
    greeting_morning: 'सुप्रभात',
    greeting_afternoon: 'नमस्कार',
    greeting_evening: 'शुभ संध्या',
    today_is: 'आज आहे',
    recent_alerts: 'अलर्ट व सूचना',
    quick_actions: 'त्वरित कृती',
    weekly_trend: 'साप्ताहिक कामकाज',
    no_alerts: 'कोणतेही अलर्ट नाहीत. सर्व सेवा सामान्यपणे चालू आहेत.'
  }
});

Views.dashboard = async (el) => {
  document.title = I18n.t('x_title') + ' · ' + I18n.t('app_name');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  el.innerHTML = Skeleton.page();

  const user = Auth.user() || { name: 'User', role: 'patient' };
  const role = user.role || 'patient';

  const QUICK_ACTIONS = [
    { roles: ['patient'], label: I18n.t('queue'), icon: '⏳', hash: '#/queue' },
    { roles: ['patient'], label: I18n.t('appointments'), icon: '📅', hash: '#/appointments' },
    { roles: ['asha_worker'], label: I18n.t('triage'), icon: '🩺', hash: '#/triage' },
    { roles: ['asha_worker'], label: I18n.t('patients'), icon: '👥', hash: '#/patients' },
    { roles: ['doctor', 'specialist'], label: I18n.t('queue'), icon: '⏳', hash: '#/queue' },
    { roles: ['doctor', 'specialist'], label: I18n.t('appointments'), icon: '📅', hash: '#/appointments' },
    { roles: ['doctor'], label: I18n.t('triage'), icon: '🩺', hash: '#/triage' },
    { roles: ['lab_tech'], label: I18n.t('diagnostics'), icon: '🧪', hash: '#/diagnostics' },
    { roles: ['pharmacist'], label: I18n.t('pharmacy'), icon: '💊', hash: '#/pharmacy' },
    { roles: ['facility_admin', 'system_admin'], label: I18n.t('admin'), icon: '⚙️', hash: '#/admin' },
    { roles: ['doctor', 'specialist', 'asha_worker'], label: I18n.t('referrals'), icon: '↗️', hash: '#/referrals' },
    { roles: ['patient', 'doctor'], label: I18n.t('records'), icon: '📋', hash: '#/records' },
    { roles: ['doctor', 'specialist'], label: I18n.t('teleconsult'), icon: '📹', hash: '#/teleconsult' },
  ];

  try {
    const data = await Api.get('/dashboard/summary?role=' + encodeURIComponent(role));
    if (data && data.queued) {
      el.innerHTML = `<div class="card p-6 text-center"><p class="text-slate-600 dark:text-slate-300">${esc(I18n.t('offline_queued'))}</p></div>`;
      return;
    }
    if (!data) throw new Error('no data');

    const hour = new Date().getHours();
    const greetKey = hour < 12 ? 'greeting_morning' : (hour < 17 ? 'greeting_afternoon' : 'greeting_evening');
    const dateStr = new Date().toLocaleDateString(I18n.lang === 'hi' ? 'hi-IN' : (I18n.lang === 'mr' ? 'mr-IN' : 'en-IN'), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const stats = (data.stats || []).map(s =>
      Cards.stat({ label: s.label, value: s.value, sub: s.sub, icon: s.icon, tone: s.tone })
    ).join('');

    const alerts = (data.alerts || []).map(a => {
      const toneCls = { red: 'border-red-500 bg-red-50 dark:bg-red-900/20', amber: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20', teal: 'border-teal-500 bg-teal-50 dark:bg-teal-900/20', green: 'border-green-500 bg-green-50 dark:bg-green-900/20', blue: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20', slate: 'border-slate-400 bg-slate-50 dark:bg-slate-800' }[a.tone] || 'border-slate-400 bg-slate-50 dark:bg-slate-800';
      return `<div class="border-l-4 ${toneCls} rounded-r-lg p-3 text-sm text-slate-700 dark:text-slate-200">${esc(a.text)}</div>`;
    }).join('');

    const actions = QUICK_ACTIONS.filter(a => a.roles.includes(role)).map(a => `
      <button data-qa-hash="${a.hash}" class="btn btn-outline flex items-center gap-2 justify-start text-left">
        <span class="text-lg">${a.icon}</span><span>${esc(a.label)}</span>
      </button>`).join('');

    const trend = data.trend || { labels: [], data: [], label: '' };

    el.innerHTML = `
      <div class="space-y-6">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">${esc(I18n.t(greetKey))}, ${esc(user.name)} 👋</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400">${esc(I18n.t('today_is'))} ${esc(dateStr)}</p>
          ${Api.demoMode ? `<p class="mt-1 text-xs text-amber-600 dark:text-amber-400">🔶 ${esc(I18n.t('demo_notice'))}</p>` : ''}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">${stats}</div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div class="lg:col-span-2">
            ${Cards.panel({
              title: I18n.t('weekly_trend'),
              bodyHTML: `<div class="relative h-56 sm:h-64"><canvas id="dash-chart"></canvas></div><p id="dash-chart-fallback" class="hidden text-sm text-slate-500"></p>`
            })}
          </div>
          <div>
            ${Cards.panel({
              title: I18n.t('recent_alerts'),
              bodyHTML: alerts ? `<div class="space-y-2">${alerts}</div>` : `<p class="text-sm text-slate-500 dark:text-slate-400">${esc(I18n.t('no_alerts'))}</p>`
            })}
          </div>
        </div>

        <div>
          ${Cards.panel({
            title: I18n.t('quick_actions'),
            bodyHTML: actions ? `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">${actions}</div>` : `<p class="text-sm text-slate-500">${esc(I18n.t('no_data'))}</p>`
          })}
        </div>
      </div>`;

    el.querySelectorAll('[data-qa-hash]').forEach(btn => {
      btn.addEventListener('click', () => Router.go(btn.dataset.qaHash));
    });

    const canvas = el.querySelector('#dash-chart');
    const fallback = el.querySelector('#dash-chart-fallback');
    if (window.Chart && canvas && trend.labels && trend.labels.length) {
      new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: trend.labels,
          datasets: [{
            label: trend.label || I18n.t('total'),
            data: trend.data || [],
            backgroundColor: 'rgba(13,148,136,0.7)',
            borderRadius: 4
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
      });
    } else if (fallback) {
      canvas.style.display = 'none';
      fallback.classList.remove('hidden');
      fallback.textContent = trend.labels.length
        ? trend.labels.map((l, i) => l + ': ' + (trend.data[i] ?? 0)).join(' · ')
        : I18n.t('no_data');
    }
  } catch (e) {
    el.innerHTML = `<div class="card p-6 text-center"><p class="text-slate-600 dark:text-slate-300 mb-4">${esc(I18n.t('error_load'))}</p><button class="btn btn-primary btn-sm" data-retry>${esc(I18n.t('try_again'))}</button></div>`;
    el.querySelector('[data-retry]').onclick = () => Views.dashboard(el);
  }
};
