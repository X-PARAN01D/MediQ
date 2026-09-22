I18n.addStrings({
  en: {
    x_title: 'OPD Queue',
    now_serving: 'Now serving',
    join_queue: 'Join queue',
    call_next: 'Call next',
    waiting: 'waiting',
    in_queue: 'In queue',
    served: 'Served',
    queue_empty: 'Queue is empty',
    queue_empty_msg: 'No patients are waiting right now. Join the queue to get a token.',
    field_patient_name: 'Patient name',
    your_token: 'Your token number',
    joined_ok: 'You have joined the queue',
    called_ok: 'Next patient called',
    wait_mins: 'min wait',
    token_label: 'Token'
  },
  hi: {
    x_title: 'ओपीडी कतार',
    now_serving: 'अभी सेवा में',
    join_queue: 'कतार में जुड़ें',
    call_next: 'अगला बुलाएँ',
    waiting: 'प्रतीक्षा में',
    in_queue: 'कतार में',
    served: 'सेवा पूर्ण',
    queue_empty: 'कतार खाली है',
    queue_empty_msg: 'अभी कोई मरीज़ प्रतीक्षा में नहीं है। टोकन लेने के लिए कतार में जुड़ें।',
    field_patient_name: 'मरीज़ का नाम',
    your_token: 'आपका टोकन नंबर',
    joined_ok: 'आप कतार में जुड़ गए हैं',
    called_ok: 'अगला मरीज़ बुलाया गया',
    wait_mins: 'मिनट प्रतीक्षा',
    token_label: 'टोकन'
  },
  mr: {
    x_title: 'ओपीडी रांग',
    now_serving: 'सध्या सेवा सुरू',
    join_queue: 'रांगेत सामील व्हा',
    call_next: 'पुढील बोलवा',
    waiting: 'प्रतीक्षेत',
    in_queue: 'रांगेत',
    served: 'सेवा पूर्ण',
    queue_empty: 'रांग रिकामी आहे',
    queue_empty_msg: 'सध्या कोणीही रुग्ण प्रतीक्षेत नाही. टोकन घेण्यासाठी रांगेत सामील व्हा.',
    field_patient_name: 'रुग्णाचे नाव',
    your_token: 'तुमचा टोकन नंबर',
    joined_ok: 'तुम्ही रांगेत सामील झाला आहात',
    called_ok: 'पुढील रुग्ण बोलावला',
    wait_mins: 'मिनिटे प्रतीक्षा',
    token_label: 'टोकन'
  }
});

Views.queue = async (el) => {
  document.title = I18n.t('x_title') + ' · ' + I18n.t('app_name');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const isStaff = Auth.can('doctor', 'specialist', 'asha_worker', 'facility_admin', 'system_admin', 'lab_tech', 'pharmacist');
  let timer = null;

  const statusBadge = (st) => {
    const s = String(st || 'waiting').toLowerCase();
    const tone = s === 'serving' ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
      : s === 'served' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    const label = s === 'serving' ? I18n.t('now_serving') : s === 'served' ? I18n.t('served') : I18n.t('waiting');
    return `<span class="px-2 py-0.5 rounded-full text-xs font-medium ${tone}">${esc(label)}</span>`;
  };

  const load = async () => {
    try {
      const data = await Api.get('/queue');
      if (data && data.queued) {
        el.innerHTML = `<div class="card p-6 text-center"><p class="text-slate-600 dark:text-slate-300">${esc(I18n.t('offline_queued'))}</p></div>`;
        return;
      }
      const nowServing = (data && data.nowServing) || null;
      const list = (data && data.list) || [];

      const listHTML = list.length ? list.map(p => `
        <div class="card p-4 flex items-center gap-4">
          <div class="flex-shrink-0 w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold">#${esc(p.token ?? '')}</div>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-slate-900 dark:text-white truncate">${esc(p.patientName)}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">${esc(p.waitMin ?? 0)} ${esc(I18n.t('wait_mins'))}</p>
          </div>
          ${statusBadge(p.status)}
        </div>`).join('')
        : EmptyState.render({ icon: '⏳', title: I18n.t('queue_empty'), message: I18n.t('queue_empty_msg'), actionLabel: I18n.t('join_queue') });

      el.innerHTML = `
        <div class="space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center gap-3">
            <h1 class="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex-1">${esc(I18n.t('x_title'))}</h1>
            <div class="flex gap-2">
              ${isStaff ? `<button class="btn btn-outline" data-call-next>⏭ ${esc(I18n.t('call_next'))}</button>` : ''}
              <button class="btn btn-primary" data-join>+ ${esc(I18n.t('join_queue'))}</button>
            </div>
          </div>

          <div class="card p-6 sm:p-8 text-center bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-lg">
            <p class="text-sm uppercase tracking-wide opacity-90">${esc(I18n.t('now_serving'))}</p>
            ${nowServing
              ? `<p class="mt-2 text-5xl sm:text-6xl font-extrabold">#${esc(nowServing.token ?? '')}</p>
                 <p class="mt-2 text-lg font-medium">${esc(nowServing.patientName || '')}</p>`
              : `<p class="mt-2 text-2xl font-semibold opacity-80">${esc(I18n.t('queue_empty'))}</p>`}
          </div>

          <div class="space-y-3">${listHTML}</div>
        </div>`;

      el.querySelector('[data-join]').addEventListener('click', openJoinModal);
      el.querySelector('[data-empty-btn]')?.addEventListener('click', openJoinModal);
      el.querySelector('[data-call-next]')?.addEventListener('click', async () => {
        try {
          const res = await Api.put('/queue/next', {});
          if (res && res.queued) Toast.info(I18n.t('offline_queued')); else Toast.success(I18n.t('called_ok'));
          load();
        } catch (e2) { Toast.error(I18n.t('operation_failed')); }
      });
    } catch (e) {
      el.innerHTML = `<div class="card p-6 text-center"><p class="text-slate-600 dark:text-slate-300 mb-4">${esc(I18n.t('error_load'))}</p><button class="btn btn-primary btn-sm" data-retry>${esc(I18n.t('try_again'))}</button></div>`;
      el.querySelector('[data-retry]').onclick = () => load();
    }
  };

  const openJoinModal = () => {
    Modal.open({
      title: I18n.t('join_queue'),
      bodyHTML: `<form id="queue-join-form">${Forms.field({ label: I18n.t('field_patient_name'), name: 'patientName', type: 'text', required: true })}</form>`,
      actions: [
        { label: I18n.t('cancel'), kind: 'ghost', onClick: () => Modal.close() },
        { label: I18n.t('submit'), kind: 'primary', onClick: async () => {
          const form = document.querySelector('#queue-join-form');
          if (!Forms.validate(form)) return;
          try {
            const res = await Api.post('/queue', Forms.values(form));
            Modal.close();
            if (res && res.queued) {
              Toast.info(I18n.t('offline_queued'));
            } else {
              Toast.success(I18n.t('joined_ok'));
              const token = res && (res.token ?? res.id);
              Modal.open({
                title: I18n.t('your_token'),
                bodyHTML: `<div class="text-center py-4"><p class="text-6xl font-extrabold text-teal-700 dark:text-teal-300">#${esc(token ?? '')}</p></div>`,
                actions: [{ label: I18n.t('close'), kind: 'primary', onClick: () => Modal.close() }]
              });
            }
            load();
          } catch (err) { Toast.error(I18n.t('operation_failed')); }
        }}
      ]
    });
  };

  el.innerHTML = Skeleton.page();
  await load();
  timer = setInterval(load, 30000);

  return () => { if (timer) clearInterval(timer); };
};
