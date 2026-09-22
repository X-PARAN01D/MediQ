I18n.addStrings({
  en: {
    x_title: 'Appointments',
    book_appointment: 'Book appointment',
    filter_date: 'Date',
    filter_status: 'Status',
    col_token: 'Token',
    col_patient: 'Patient',
    col_doctor: 'Doctor',
    col_time: 'Time',
    col_reason: 'Reason',
    col_status: 'Status',
    action_confirm: 'Confirm',
    action_cancel: 'Cancel',
    confirmed_ok: 'Appointment confirmed',
    cancelled_ok: 'Appointment cancelled',
    no_appointments: 'No appointments found',
    no_appointments_msg: 'Try a different date or status filter, or book a new appointment.',
    field_patient_name: 'Patient name',
    field_phone: 'Phone number',
    field_doctor: 'Doctor',
    field_date: 'Date',
    field_time: 'Time',
    field_reason: 'Reason for visit',
    st_scheduled: 'Scheduled',
    st_confirmed: 'Confirmed',
    st_cancelled: 'Cancelled',
    st_completed: 'Completed',
    cancel_confirm_msg: 'Are you sure you want to cancel this appointment?',
    booked_ok: 'Appointment booked'
  },
  hi: {
    x_title: 'अपॉइंटमेंट',
    book_appointment: 'अपॉइंटमेंट बुक करें',
    filter_date: 'तारीख',
    filter_status: 'स्थिति',
    col_token: 'टोकन',
    col_patient: 'मरीज़',
    col_doctor: 'डॉक्टर',
    col_time: 'समय',
    col_reason: 'कारण',
    col_status: 'स्थिति',
    action_confirm: 'पुष्टि करें',
    action_cancel: 'रद्द करें',
    confirmed_ok: 'अपॉइंटमेंट की पुष्टि हो गई',
    cancelled_ok: 'अपॉइंटमेंट रद्द हो गया',
    no_appointments: 'कोई अपॉइंटमेंट नहीं मिला',
    no_appointments_msg: 'कोई अन्य तारीख या स्थिति चुनें, या नया अपॉइंटमेंट बुक करें।',
    field_patient_name: 'मरीज़ का नाम',
    field_phone: 'फ़ोन नंबर',
    field_doctor: 'डॉक्टर',
    field_date: 'तारीख',
    field_time: 'समय',
    field_reason: 'आने का कारण',
    st_scheduled: 'निर्धारित',
    st_confirmed: 'पुष्ट',
    st_cancelled: 'रद्द',
    st_completed: 'पूर्ण',
    cancel_confirm_msg: 'क्या आप वाकई यह अपॉइंटमेंट रद्द करना चाहते हैं?',
    booked_ok: 'अपॉइंटमेंट बुक हो गया'
  },
  mr: {
    x_title: 'अपॉइंटमेंट',
    book_appointment: 'अपॉइंटमेंट बुक करा',
    filter_date: 'तारीख',
    filter_status: 'स्थिती',
    col_token: 'टोकन',
    col_patient: 'रुग्ण',
    col_doctor: 'डॉक्टर',
    col_time: 'वेळ',
    col_reason: 'कारण',
    col_status: 'स्थिती',
    action_confirm: 'खात्री करा',
    action_cancel: 'रद्द करा',
    confirmed_ok: 'अपॉइंटमेंट निश्चित झाले',
    cancelled_ok: 'अपॉइंटमेंट रद्द झाले',
    no_appointments: 'कोणतेही अपॉइंटमेंट आढळले नाही',
    no_appointments_msg: 'दुसरी तारीख किंवा स्थिती निवडा, किंवा नवीन अपॉइंटमेंट बुक करा.',
    field_patient_name: 'रुग्णाचे नाव',
    field_phone: 'फोन नंबर',
    field_doctor: 'डॉक्टर',
    field_date: 'तारीख',
    field_time: 'वेळ',
    field_reason: 'भेटीचे कारण',
    st_scheduled: 'नियोजित',
    st_confirmed: 'निश्चित',
    st_cancelled: 'रद्द',
    st_completed: 'पूर्ण',
    cancel_confirm_msg: 'तुम्हाला खात्री आहे की हे अपॉइंटमेंट रद्द करायचे आहे?',
    booked_ok: 'अपॉइंटमेंट बुक झाले'
  }
});

Views.appointments = async (el) => {
  document.title = I18n.t('x_title') + ' · ' + I18n.t('app_name');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  el.innerHTML = Skeleton.page();

  const isStaff = Auth.can('doctor', 'specialist', 'asha_worker', 'facility_admin', 'system_admin', 'lab_tech', 'pharmacist');
  const params = Router.params();
  let curDate = params.date || new Date().toISOString().slice(0, 10);
  let curStatus = params.status || '';

  const statusBadge = (st) => {
    const s = String(st || 'scheduled').toLowerCase();
    const tone = s === 'confirmed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
      : s === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
      : s === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    const label = I18n.t('st_' + s) || esc(st);
    return `<span class="px-2 py-0.5 rounded-full text-xs font-medium ${tone}">${esc(label)}</span>`;
  };

  const statusOptions = ['', 'scheduled', 'confirmed', 'cancelled', 'completed'].map(s => ({
    value: s, label: s ? I18n.t('st_' + s) : I18n.t('all')
  }));

  const load = async () => {
    el.innerHTML = Skeleton.page();
    try {
      let url = '/appointments?date=' + encodeURIComponent(curDate);
      if (curStatus) url += '&status=' + encodeURIComponent(curStatus);
      const data = await Api.get(url);
      if (data && data.queued) {
        el.innerHTML = `<div class="card p-6 text-center"><p class="text-slate-600 dark:text-slate-300">${esc(I18n.t('offline_queued'))}</p></div>`;
        return;
      }
      const rows = Array.isArray(data) ? data : (data && data.items) || [];

      const columns = [
        { key: 'token', label: I18n.t('col_token'), render: r => `<span class="font-mono font-semibold text-teal-700 dark:text-teal-300">#${esc(r.token ?? '')}</span>` },
        { key: 'patientName', label: I18n.t('col_patient'), render: r => esc(r.patientName) },
        { key: 'doctorName', label: I18n.t('col_doctor'), render: r => esc(r.doctorName || '') },
        { key: 'time', label: I18n.t('col_time'), render: r => esc(r.time || '') },
        { key: 'reason', label: I18n.t('col_reason'), render: r => esc(r.reason || '') },
        { key: 'status', label: I18n.t('col_status'), render: r => statusBadge(r.status) }
      ];

      const rowActions = [];
      if (isStaff) rowActions.push(
        { id: 'confirm', label: I18n.t('action_confirm'), kind: 'primary' },
        { id: 'cancel', label: I18n.t('action_cancel'), kind: 'danger' }
      );

      el.innerHTML = `
        <div class="space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center gap-3">
            <h1 class="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex-1">${esc(I18n.t('x_title'))}</h1>
            <button class="btn btn-primary" data-book>+ ${esc(I18n.t('book_appointment'))}</button>
          </div>
          <div class="card p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">${esc(I18n.t('filter_date'))}</label>
              <input type="date" id="appt-date" class="form-input" value="${esc(curDate)}" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">${esc(I18n.t('filter_status'))}</label>
              <select id="appt-status" class="form-input">
                ${statusOptions.map(o => `<option value="${o.value}" ${curStatus === o.value ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div>
            ${rows.length ? Tables.render({ columns, rows, actions: rowActions })
              : EmptyState.render({ icon: '📅', title: I18n.t('no_appointments'), message: I18n.t('no_appointments_msg'), actionLabel: I18n.t('book_appointment') })}
          </div>
        </div>`;

      el.querySelector('#appt-date').addEventListener('change', (e) => { curDate = e.target.value; load(); });
      el.querySelector('#appt-status').addEventListener('change', (e) => { curStatus = e.target.value; load(); });
      el.querySelector('[data-book]').addEventListener('click', openBookModal);
      el.querySelector('[data-empty-btn]')?.addEventListener('click', openBookModal);

      if (rows.length && isStaff) {
        Tables.bindActions(el, rows, {
          confirm: async (row) => {
            try {
              const res = await Api.put('/appointments/' + encodeURIComponent(row.id), { status: 'confirmed' });
              if (res && res.queued) Toast.info(I18n.t('offline_queued')); else Toast.success(I18n.t('confirmed_ok'));
              load();
            } catch (e2) { Toast.error(I18n.t('operation_failed')); }
          },
          cancel: async (row) => {
            const ok = await Modal.confirm({ title: I18n.t('action_cancel'), message: I18n.t('cancel_confirm_msg'), confirmLabel: I18n.t('yes') });
            if (!ok) return;
            try {
              const res = await Api.put('/appointments/' + encodeURIComponent(row.id), { status: 'cancelled' });
              if (res && res.queued) Toast.info(I18n.t('offline_queued')); else Toast.success(I18n.t('cancelled_ok'));
              load();
            } catch (e2) { Toast.error(I18n.t('operation_failed')); }
          }
        });
      }
    } catch (e) {
      el.innerHTML = `<div class="card p-6 text-center"><p class="text-slate-600 dark:text-slate-300 mb-4">${esc(I18n.t('error_load'))}</p><button class="btn btn-primary btn-sm" data-retry>${esc(I18n.t('try_again'))}</button></div>`;
      el.querySelector('[data-retry]').onclick = () => load();
    }
  };

  const openBookModal = () => {
    const bodyHTML = `
      <form id="appt-book-form" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        ${Forms.field({ label: I18n.t('field_patient_name'), name: 'patientName', type: 'text', required: true })}
        ${Forms.field({ label: I18n.t('field_phone'), name: 'phone', type: 'tel', required: true })}
        ${Forms.field({ label: I18n.t('field_doctor'), name: 'doctorName', type: 'select', required: true, options: [
          { value: 'Dr. Patil', label: 'Dr. Patil' },
          { value: 'Dr. Sharma', label: 'Dr. Sharma' },
          { value: 'Dr. Jadhav', label: 'Dr. Jadhav' }
        ]})}
        ${Forms.field({ label: I18n.t('field_date'), name: 'date', type: 'date', value: curDate, required: true })}
        ${Forms.field({ label: I18n.t('field_time'), name: 'time', type: 'time', required: true })}
        ${Forms.field({ label: I18n.t('field_reason'), name: 'reason', type: 'text' })}
      </form>`;
    Modal.open({
      title: I18n.t('book_appointment'),
      bodyHTML,
      actions: [
        { label: I18n.t('cancel'), kind: 'ghost', onClick: () => Modal.close() },
        { label: I18n.t('submit'), kind: 'primary', onClick: async () => {
          const form = document.querySelector('#appt-book-form');
          if (!Forms.validate(form)) return;
          try {
            const res = await Api.post('/appointments', Forms.values(form));
            if (res && res.queued) Toast.info(I18n.t('offline_queued')); else Toast.success(I18n.t('booked_ok'));
            Modal.close();
            load();
          } catch (err) { Toast.error(I18n.t('operation_failed')); }
        }}
      ]
    });
  };

  await load();
};
