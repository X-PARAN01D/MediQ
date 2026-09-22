I18n.addStrings({
  en: {
    x_title: 'Login',
    user_name: 'Your name',
    welcome_back: 'Welcome to Arogya Seva'
  },
  hi: {
    x_title: 'लॉगिन',
    user_name: 'आपका नाम',
    welcome_back: 'आरोग्य सेवा में आपका स्वागत है'
  },
  mr: {
    x_title: 'लॉगिन',
    user_name: 'तुमचे नाव',
    welcome_back: 'आरोग्य सेवा मध्ये आपले स्वागत आहे'
  }
});

Views.login = async (el) => {
  document.title = I18n.t('x_title') + ' · ' + I18n.t('app_name');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const roles = ['patient', 'asha_worker', 'doctor', 'specialist', 'lab_tech', 'pharmacist', 'facility_admin', 'system_admin'];
  const roleOptions = roles.map(r =>
    `<option value="${r}">${esc(I18n.t('role_' + r))}</option>`
  ).join('');

  el.innerHTML = `
    <div class="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-teal-50 to-emerald-100 dark:from-slate-900 dark:to-slate-800">
      <div class="w-full max-w-md">
        <div class="text-center mb-6">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-600 text-white shadow-lg">
            <svg class="w-9 h-9" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
          </div>
          <h1 class="mt-4 text-2xl font-bold text-slate-900 dark:text-white">${esc(I18n.t('app_name'))}</h1>
          <p class="text-sm text-slate-600 dark:text-slate-400">${esc(I18n.t('tagline'))}</p>
        </div>

        <div class="card p-6 sm:p-8 shadow-xl">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-white">${esc(I18n.t('login_title'))}</h2>
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-5">${esc(I18n.t('login_sub'))}</p>
          <form id="login-form" class="space-y-4" autocomplete="off">
            ${Forms.field({ label: I18n.t('user_name'), name: 'name', type: 'text', placeholder: I18n.t('enter_name'), required: false })}
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">${esc(I18n.t('select_role'))}</label>
              <select name="role" class="form-input" required>
                ${roleOptions}
              </select>
            </div>
            <button type="submit" class="btn btn-primary w-full">${esc(I18n.t('login_btn'))}</button>
          </form>
          <p class="mt-4 text-xs text-center text-slate-500 dark:text-slate-400">${esc(I18n.t('demo_login_note'))}</p>
        </div>

        <div class="mt-4 flex justify-center">
          <div class="inline-flex rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600">
            ${['en', 'hi', 'mr'].map(l =>
              `<button data-lang="${l}" class="px-3 py-1 text-sm ${I18n.lang === l ? 'bg-teal-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}">${l.toUpperCase()}</button>`
            ).join('')}
          </div>
        </div>
      </div>
    </div>`;

  el.querySelectorAll('[data-lang]').forEach(btn => {
    btn.addEventListener('click', () => {
      I18n.setLang(btn.dataset.lang);
      Views.login(el);
    });
  });

  el.querySelector('#login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    if (!Forms.validate(form)) return;
    const vals = Forms.values(form);
    const name = (vals.name || '').trim() || 'User';
    Auth.login(vals.role, name);
    Toast.success(I18n.t('welcome') + ', ' + name);
    Router.go('#/dashboard');
  });
};
