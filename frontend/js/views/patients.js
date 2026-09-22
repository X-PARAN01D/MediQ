I18n.addStrings({
  en: {
    x_title: 'Patients',
    add_patient: 'Add patient',
    field_name: 'Full name',
    field_age: 'Age (years)',
    field_gender: 'Gender',
    field_phone: 'Phone number',
    field_village: 'Village',
    field_blood: 'Blood group',
    field_emergency: 'Emergency contact',
    col_name: 'Name',
    col_age_gender: 'Age / Gender',
    col_phone: 'Phone',
    col_village: 'Village',
    col_risk: 'Risk',
    col_last_visit: 'Last visit',
    search_ph: 'Search by name, phone or village…',
    no_patients: 'No patients found',
    no_patients_msg: 'Add the first patient to get started.',
    years: 'yrs',
    risk_high: 'High',
    risk_medium: 'Medium',
    risk_low: 'Low',
    not_recorded: '—'
  },
  hi: {
    x_title: 'मरीज़',
    add_patient: 'मरीज़ जोड़ें',
    field_name: 'पूरा नाम',
    field_age: 'आयु (वर्ष)',
    field_gender: 'लिंग',
    field_phone: 'फ़ोन नंबर',
    field_village: 'गाँव',
    field_blood: 'रक्त समूह',
    field_emergency: 'आपातकालीन संपर्क',
    col_name: 'नाम',
    col_age_gender: 'आयु / लिंग',
    col_phone: 'फ़ोन',
    col_village: 'गाँव',
    col_risk: 'जोखिम',
    col_last_visit: 'अंतिम मुलाकात',
    search_ph: 'नाम, फ़ोन या गाँव से खोजें…',
    no_patients: 'कोई मरीज़ नहीं मिला',
    no_patients_msg: 'शुरू करने के लिए पहला मरीज़ जोड़ें।',
    years: 'वर्ष',
    risk_high: 'उच्च',
    risk_medium: 'मध्यम',
    risk_low: 'कम',
    not_recorded: '—'
  },
  mr: {
    x_title: 'रुग्ण',
    add_patient: 'रुग्ण जोडा',
    field_name: 'पूर्ण नाव',
    field_age: 'वय (वर्षे)',
    field_gender: 'लिंग',
    field_phone: 'फोन नंबर',
    field_village: 'गाव',
    field_blood: 'रक्तगट',
    field_emergency: 'आपत्कालीन संपर्क',
    col_name: 'नाव',
    col_age_gender: 'वय / लिंग',
    col_phone: 'फोन',
    col_village: 'गाव',
    col_risk: 'धोका',
    col_last_visit: 'शेवटची भेट',
    search_ph: 'नाव, फोन किंवा गावाने शोधा…',
    no_patients: 'कोणतेही रुग्ण आढळले नाहीत',
    no_patients_msg: 'सुरुवात करण्यासाठी पहिला रुग्ण जोडा.',
    years: 'वर्षे',
    risk_high: 'जास्त',
    risk_medium: 'मध्यम',
    risk_low: 'कमी',
    not_recorded: '—'
  }
});

Views.patients = async (el) => {
  document.title = I18n.t('x_title') + ' · ' + I18n.t('app_name');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  el.innerHTML = Skeleton.page();

  const canAdd = Auth.can('asha_worker', 'doctor', 'specialist', 'facility_admin', 'system_admin');

  const riskBadge = (risk) => {
    const r = String(risk || 'low').toLowerCase();
    const tone = r === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
      : r === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    const label = r === 'high' ? I18n.t('risk_high') : r === 'medium' ? I18n.t('risk_medium') : I18n.t('risk_low');
    return `<span class="px-2 py-0.5 rounded-full text-xs font-medium ${tone}">${esc(label)}</span>`;
  };

  const genderLabel = (g) => g === 'male' ? I18n.t('male') : g === 'female' ? I18n.t('female') : I18n.t('other');

  const load = async (q) => {
    el.innerHTML = Skeleton.page();
    try {
      const url = '/patients' + (q ? '?q=' + encodeURIComponent(q) : '');
      const data = await Api.get(url);
      if (data && data.queued) {
        el.innerHTML = `<div class="card p-6 text-center"><p class="text-slate-600 dark:text-slate-300">${esc(I18n.t('offline_queued'))}</p></div>`;
        return;
      }
      const rows = Array.isArray(data) ? data : (data && data.items) || [];

      const columns = [
        { key: 'name', label: I18n.t('col_name'), render: r => `<span class="font-medium text-slate-900 dark:text-white">${esc(r.name)}</span>` },
        { key: 'ageGender', label: I18n.t('col_age_gender'), render: r => esc((r.age ?? '') + (r.age ? ' ' + I18n.t('years') : '') + (r.gender ? ' · ' + genderLabel(r.gender) : '')) },
        { key: 'phone', label: I18n.t('col_phone'), render: r => esc(r.phone || I18n.t('not_recorded')) },
        { key: 'village', label: I18n.t('col_village'), render: r => esc(r.village || I18n.t('not_recorded')) },
        { key: 'risk', label: I18n.t('col_risk'), render: r => riskBadge(r.risk) },
        { key: 'lastVisit', label: I18n.t('col_last_visit'), render: r => esc(r.lastVisit || I18n.t('not_recorded')) }
      ];

      el.innerHTML = `
        <div class="space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center gap-3">
            <h1 class="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex-1">${esc(I18n.t('x_title'))}</h1>
            ${canAdd ? `<button class="btn btn-primary" data-add>+ ${esc(I18n.t('add_patient'))}</button>` : ''}
          </div>
          <div class="card p-3">
            <input type="search" id="patient-search" class="form-input" placeholder="${esc(I18n.t('search_ph'))}" value="${esc(q || '')}" />
          </div>
          <div id="patients-table-wrap">
            ${rows.length ? Tables.render({ columns, rows, actions: [{ id: 'view', label: I18n.t('view'), kind: 'outline' }] })
              : EmptyState.render({ icon: '👥', title: I18n.t('no_patients'), message: I18n.t('no_patients_msg'), actionLabel: canAdd ? I18n.t('add_patient') : null })}
          </div>
        </div>`;

      const wrap = el.querySelector('#patients-table-wrap');
      if (rows.length) {
        Tables.bindActions(el, rows, {
          view: (row) => Router.go('#/records?id=' + encodeURIComponent(row.id))
        });
      } else {
        el.querySelector('[data-empty-btn]')?.addEventListener('click', () => { if (canAdd) openAddModal(); });
      }

      el.querySelector('[data-add]')?.addEventListener('click', openAddModal);

      let debounce;
      el.querySelector('#patient-search').addEventListener('input', (e) => {
        clearTimeout(debounce);
        debounce = setTimeout(() => load(e.target.value.trim()), 400);
      });
    } catch (e) {
      el.innerHTML = `<div class="card p-6 text-center"><p class="text-slate-600 dark:text-slate-300 mb-4">${esc(I18n.t('error_load'))}</p><button class="btn btn-primary btn-sm" data-retry>${esc(I18n.t('try_again'))}</button></div>`;
      el.querySelector('[data-retry]').onclick = () => load(q);
    }
  };

  const openAddModal = () => {
    const bodyHTML = `
      <form id="patient-add-form" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        ${Forms.field({ label: I18n.t('field_name'), name: 'name', type: 'text', required: true })}
        ${Forms.field({ label: I18n.t('field_age'), name: 'age', type: 'number', min: 0, max: 120, required: true })}
        ${Forms.field({ label: I18n.t('field_gender'), name: 'gender', type: 'select', required: true, options: [
          { value: 'female', label: I18n.t('female') },
          { value: 'male', label: I18n.t('male') },
          { value: 'other', label: I18n.t('other') }
        ]})}
        ${Forms.field({ label: I18n.t('field_phone'), name: 'phone', type: 'tel', required: true })}
        ${Forms.field({ label: I18n.t('field_village'), name: 'village', type: 'text', required: true })}
        ${Forms.field({ label: I18n.t('field_blood'), name: 'bloodGroup', type: 'select', options: ['', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(b => ({ value: b, label: b || '—' })) })}
        <div class="sm:col-span-2">${Forms.field({ label: I18n.t('field_emergency'), name: 'emergencyContact', type: 'tel' })}</div>
      </form>`;
    Modal.open({
      title: I18n.t('add_patient'),
      bodyHTML,
      actions: [
        { label: I18n.t('cancel'), kind: 'ghost', onClick: () => Modal.close() },
        { label: I18n.t('save'), kind: 'primary', onClick: async () => {
          const form = document.querySelector('#patient-add-form');
          if (!Forms.validate(form)) return;
          const body = Forms.values(form);
          try {
            const res = await Api.post('/patients', body);
            if (res && res.queued) { Toast.info(I18n.t('offline_queued')); }
            else { Toast.success(I18n.t('saved_ok')); }
            Modal.close();
            load(el.querySelector('#patient-search')?.value.trim() || '');
          } catch (err) { Toast.error(I18n.t('operation_failed')); }
        }}
      ]
    });
  };

  await load(Router.params().q || '');
};
