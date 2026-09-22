/* Arogya Seva Maharashtra — Assisted Teleconsultation view.
   Plain script, no modules. Registers Views.teleconsult (list + session room). */

I18n.addStrings({
  en: {
    tc_title: 'Teleconsultation',
    tc_room: 'Consultation Room',
    new_session: 'New Session',
    join: 'Join',
    presenting_complaint: 'Presenting Complaint',
    vitals_summary: 'Vitals',
    assisted_by: 'Assisted by',
    asha_assisted: 'ASHA-assisted',
    mute: 'Mute',
    camera: 'Camera',
    end_call: 'End Call',
    camera_off_demo: 'Camera off — demo',
    end_confirm_title: 'End Call?',
    end_confirm_msg: 'End this teleconsultation session?',
    session_time: 'Scheduled At',
    select_doctor: 'Select doctor',
    diagnosis: 'Diagnosis',
    consultation_notes: 'Consultation Notes',
    prescription: 'Prescription',
    medicine: 'Medicine',
    dosage: 'Dosage',
    days: 'Days',
    add_medicine: 'Add Medicine',
    remove: 'Remove',
    save_consultation: 'Save Consultation',
    no_sessions: 'No teleconsultations yet',
    no_sessions_msg: 'No sessions are scheduled. Start a new assisted session.',
    room_error: 'Could not load this session.',
    back_to_list: 'Back to List',
    patient_panel: 'Patient',
    video_panel: 'Video',
    doctor_panel: 'Doctor',
    consultation_saved: 'Consultation saved',
    duration: 'Duration',
    session_started: 'Started',
    session_ended: 'Ended'
  },
  hi: {
    tc_title: 'टेलीकंसल्टेशन',
    tc_room: 'परामर्श कक्ष',
    new_session: 'नया सत्र',
    join: 'जुड़ें',
    presenting_complaint: 'मुख्य शिकायत',
    vitals_summary: 'महत्वपूर्ण संकेत',
    assisted_by: 'सहायता द्वारा',
    asha_assisted: 'आशा-सहायित',
    mute: 'म्यूट',
    camera: 'कैमरा',
    end_call: 'कॉल समाप्त करें',
    camera_off_demo: 'कैमरा बंद — डेमो',
    end_confirm_title: 'कॉल समाप्त करें?',
    end_confirm_msg: 'क्या यह टेलीकंसल्टेशन सत्र समाप्त करें?',
    session_time: 'निर्धारित समय',
    select_doctor: 'डॉक्टर चुनें',
    diagnosis: 'निदान',
    consultation_notes: 'परामर्श टिप्पणियाँ',
    prescription: 'नुस्खा',
    medicine: 'दवाई',
    dosage: 'खुराक',
    days: 'दिन',
    add_medicine: 'दवाई जोड़ें',
    remove: 'हटाएं',
    save_consultation: 'परामर्श सहेजें',
    no_sessions: 'अभी कोई टेलीकंसल्टेशन नहीं',
    no_sessions_msg: 'कोई सत्र निर्धारित नहीं है। नया सहायता-युक्त सत्र शुरू करें।',
    room_error: 'यह सत्र लोड नहीं हो सका।',
    back_to_list: 'सूची पर वापस जाएं',
    patient_panel: 'मरीज़',
    video_panel: 'वीडियो',
    doctor_panel: 'डॉक्टर',
    consultation_saved: 'परामर्श सहेजा गया',
    duration: 'अवधि',
    session_started: 'प्रारंभ',
    session_ended: 'समाप्त'
  },
  mr: {
    tc_title: 'टेलीकन्सल्टेशन',
    tc_room: 'सल्लामसलत कक्ष',
    new_session: 'नवीन सत्र',
    join: 'सामील व्हा',
    presenting_complaint: 'मुख्य तक्रार',
    vitals_summary: 'जीवनावश्यक निर्देशांक',
    assisted_by: 'सहाय्य',
    asha_assisted: 'आशा-सहाय्यित',
    mute: 'म्यूट',
    camera: 'कॅमेरा',
    end_call: 'कॉल संपवा',
    camera_off_demo: 'कॅमेरा बंद — डेमो',
    end_confirm_title: 'कॉल संपवायचा?',
    end_confirm_msg: 'हे टेलीकन्सल्टेशन सत्र संपवायचे का?',
    session_time: 'नियोजित वेळ',
    select_doctor: 'डॉक्टर निवडा',
    diagnosis: 'निदान',
    consultation_notes: 'सल्लामसलत नोंदी',
    prescription: 'औषधपत्रिका',
    medicine: 'औषध',
    dosage: 'डोस',
    days: 'दिवस',
    add_medicine: 'औषध जोडा',
    remove: 'काढा',
    save_consultation: 'सल्लामसलत जतन करा',
    no_sessions: 'अद्याप टेलीकन्सल्टेशन नाही',
    no_sessions_msg: 'कोणतेही सत्र नियोजित नाही. नवीन सहाय्यित सत्र सुरू करा.',
    room_error: 'हे सत्र लोड होऊ शकले नाही.',
    back_to_list: 'यादीकडे परत जा',
    patient_panel: 'रुग्ण',
    video_panel: 'व्हिडिओ',
    doctor_panel: 'डॉक्टर',
    consultation_saved: 'सल्लामसलत जतन केली',
    duration: 'कालावधी',
    session_started: 'सुरू',
    session_ended: 'समाप्त'
  }
});

(function () {
  'use strict';

  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fmtDT(v) {
    if (!v) return '—';
    var d = new Date(v);
    return isNaN(d.getTime()) ? esc(v) : esc(d.toLocaleString());
  }

  function fmtDuration(totalSeconds) {
    if (totalSeconds == null || isNaN(totalSeconds)) return '—';
    totalSeconds = Math.max(0, Math.round(totalSeconds));
    var h = Math.floor(totalSeconds / 3600);
    var m = Math.floor((totalSeconds % 3600) / 60);
    var s = totalSeconds % 60;
    var mm = (h > 0 ? String(m) : m).padStart(2, '0');
    var ss = String(s).padStart(2, '0');
    return h > 0 ? h + ':' + mm + ':' + ss : m + ':' + ss;
  }

  var STATUS_TONE = {
    scheduled: 'bg-amber-100 text-amber-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  };

  function statusBadge(st) {
    var cls = STATUS_TONE[st] || 'bg-gray-100 text-gray-700';
    var key = { scheduled: 'scheduled', in_progress: 'in_progress', completed: 'completed', cancelled: 'cancelled' }[st];
    return '<span class="inline-block px-2 py-1 rounded-full text-xs font-semibold ' + cls + '">' + esc(key ? I18n.t(key) : (st || '—')) + '</span>';
  }

  function errorPanel(msg) {
    return '<div class="p-4 max-w-2xl mx-auto">' +
      '<div class="rounded-xl bg-red-50 border border-red-200 p-6 text-center">' +
      '<p class="font-medium text-red-800">' + esc(msg) + '</p>' +
      '<div class="mt-4 flex justify-center gap-3">' +
      '<button data-tc-retry class="btn btn-danger">' + esc(I18n.t('try_again')) + '</button>' +
      '<button data-tc-back class="btn btn-secondary">' + esc(I18n.t('back_to_list')) + '</button>' +
      '</div></div></div>';
  }

  function bindErrorButtons(el, reload) {
    var r = el.querySelector('[data-tc-retry]');
    if (r) r.addEventListener('click', reload);
    var b = el.querySelector('[data-tc-back]');
    if (b) b.addEventListener('click', function () { Router.go('#/teleconsult'); });
  }

  /* ---------------- New session modal ---------------- */

  function openNewSessionModal(onDone) {
    var doctorOptions = ['Dr. Patil', 'Dr. Sharma', 'Dr. Jadhav'].map(function (d) {
      return { value: d, label: d };
    });
    var bodyHTML =
      '<form id="tc-new-form" class="space-y-4">' +
      Forms.field({ label: I18n.t('patient'), name: 'patientName', type: 'text', required: true, placeholder: I18n.t('patient') }) +
      Forms.field({ label: I18n.t('doctor'), name: 'doctorName', type: 'select', required: true, options: [{ value: '', label: I18n.t('select_doctor') }].concat(doctorOptions) }) +
      Forms.field({ label: I18n.t('session_time'), name: 'scheduledAt', type: 'datetime-local', required: true }) +
      '<label class="flex items-center gap-2 text-sm text-gray-700">' +
      '<input type="checkbox" name="assisted" class="h-4 w-4 rounded border-gray-300 text-teal-600" />' +
      esc(I18n.t('asha_assisted')) + '</label>' +
      '</form>';
    Modal.open({
      title: I18n.t('new_session'),
      bodyHTML: bodyHTML,
      actions: [
        { label: I18n.t('cancel'), kind: 'secondary', onClick: function () { Modal.close(); } },
        {
          label: I18n.t('submit'), kind: 'primary',
          onClick: async function () {
            var form = document.getElementById('tc-new-form');
            if (!form || !Forms.validate(form)) { Toast.error(I18n.t('required_field')); return; }
            var v = Forms.values(form);
            var payload = {
              patientName: v.patientName,
              doctorName: v.doctorName,
              scheduledAt: v.scheduledAt,
              assisted: !!v.assisted,
              status: 'scheduled'
            };
            try {
              var res = await Api.post('/teleconsults', payload);
              Modal.close();
              if (res && res.queued) {
                Toast.info(I18n.t('offline_queued'));
                if (onDone) onDone();
                return;
              }
              var created = (res && res.data) || res || {};
              Toast.success(I18n.t('saved_ok'));
              var newId = created.id || created._id;
              if (newId) Router.go('#/teleconsult?id=' + encodeURIComponent(newId));
              else if (onDone) onDone();
            } catch (e) {
              Toast.error(I18n.t('operation_failed'));
            }
          }
        }
      ]
    });
  }

  /* ---------------- List view ---------------- */

  async function renderList(el) {
    document.title = I18n.t('app_name') + ' · ' + I18n.t('tc_title');
    el.innerHTML = '<div class="p-4 max-w-7xl mx-auto">' + Skeleton.page() + '</div>';

    var rows = [];
    try {
      var res = await Api.get('/teleconsults');
      if (res && res.queued) Toast.info(I18n.t('offline_queued'));
      rows = Array.isArray(res) ? res : (res && (res.data || res.rows)) || [];
    } catch (e) {
      el.innerHTML = errorPanel(I18n.t('error_load'));
      bindErrorButtons(el, function () { Views.teleconsult(el); });
      return;
    }

    var header =
      '<div class="flex flex-wrap items-center justify-between gap-3 mb-4">' +
      '<h1 class="text-xl sm:text-2xl font-bold text-gray-900">' + esc(I18n.t('tc_title')) + '</h1>' +
      '<button id="tc-new" class="btn btn-primary">+ ' + esc(I18n.t('new_session')) + '</button>' +
      '</div>';

    var body;
    if (rows.length) {
      body = Tables.render({
        columns: [
          { key: 'patientName', label: I18n.t('patient') },
          { key: 'doctorName', label: I18n.t('doctor') },
          { key: 'scheduledAt', label: I18n.t('session_time'), render: function (r) { return fmtDT(r.scheduledAt); } },
          {
            key: 'duration', label: I18n.t('duration'),
            render: function (r) { return fmtDuration(r.duration_seconds != null ? r.duration_seconds : (r.startedAt && r.endedAt ? Math.max(0, Math.round((new Date(r.endedAt) - new Date(r.startedAt)) / 1000)) : null)); }
          },
          { key: 'status', label: I18n.t('status'), render: function (r) { return statusBadge(r.status); } },
          {
            key: 'assistedBy', label: I18n.t('assisted_by'),
            render: function (r) {
              if (r.assistedBy) return '<span class="inline-block px-2 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">' + esc(r.assistedBy) + '</span>';
              if (r.assisted) return '<span class="inline-block px-2 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">' + esc(I18n.t('asha_assisted')) + '</span>';
              return '—';
            }
          }
        ],
        rows: rows,
        emptyTitle: I18n.t('no_sessions'),
        emptyMessage: I18n.t('no_sessions_msg'),
        actions: [{ id: 'join', label: I18n.t('join'), kind: 'primary' }]
      });
    } else {
      body = EmptyState.render({ icon: '📹', title: I18n.t('no_sessions'), message: I18n.t('no_sessions_msg'), actionLabel: I18n.t('new_session') });
    }

    el.innerHTML = '<div class="p-4 max-w-7xl mx-auto">' + header + body + '</div>';

    var nb = el.querySelector('#tc-new');
    if (nb) nb.addEventListener('click', function () {
      openNewSessionModal(function () { Views.teleconsult(el); });
    });
    var eb = el.querySelector('[data-empty-btn]');
    if (eb) eb.addEventListener('click', function () {
      openNewSessionModal(function () { Views.teleconsult(el); });
    });
    if (rows.length) {
      Tables.bindActions(el, rows, {
        join: function (row) { Router.go('#/teleconsult?id=' + encodeURIComponent(row.id || row._id || '')); }
      });
    }
  }

  /* ---------------- Session room ---------------- */

  var INPUT_CLS = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500';

  function renderRxRows(wrap, rx) {
    wrap.innerHTML = rx.map(function (row, idx) {
      return '<div class="grid grid-cols-12 gap-2 items-end" data-rx="' + idx + '">' +
        '<div class="col-span-5"><label class="block text-xs text-gray-600 mb-1">' + esc(I18n.t('medicine')) + '</label>' +
        '<input class="' + INPUT_CLS + ' rx-med" value="' + esc(row.medicine) + '" placeholder="' + esc(I18n.t('medicine')) + '"></div>' +
        '<div class="col-span-3"><label class="block text-xs text-gray-600 mb-1">' + esc(I18n.t('dosage')) + '</label>' +
        '<input class="' + INPUT_CLS + ' rx-dose" value="' + esc(row.dosage) + '" placeholder="1-0-1"></div>' +
        '<div class="col-span-2"><label class="block text-xs text-gray-600 mb-1">' + esc(I18n.t('days')) + '</label>' +
        '<input type="number" min="1" class="' + INPUT_CLS + ' rx-days" value="' + esc(row.days) + '"></div>' +
        '<div class="col-span-2"><button type="button" class="btn btn-secondary w-full rx-remove" data-idx="' + idx + '">' +
        '<span aria-hidden="true">×</span><span class="sr-only">' + esc(I18n.t('remove')) + '</span></button></div>' +
        '</div>';
    }).join('');
  }

  async function renderRoom(el, id) {
    document.title = I18n.t('app_name') + ' · ' + I18n.t('tc_room');
    el.innerHTML = '<div class="p-4 max-w-7xl mx-auto">' + Skeleton.page() + '</div>';

    var session = null, sid = id;
    try {
      if (id === 'new') {
        var created = await Api.post('/teleconsults', {
          patientName: I18n.t('patient'),
          scheduledAt: new Date().toISOString(),
          status: 'scheduled'
        });
        var c = (created && !created.queued) ? ((created.data || created)) : null;
        session = c || { id: 'new', patientName: '—', doctorName: '—', status: 'scheduled' };
        sid = (c && (c.id || c._id)) || 'new';
      } else {
        var got = await Api.get('/teleconsults/' + encodeURIComponent(id));
        session = (got && got.data) || got || {};
      }
    } catch (e) {
      el.innerHTML = errorPanel(I18n.t('room_error'));
      bindErrorButtons(el, function () { Views.teleconsult(el); });
      return;
    }
    session = session || {};

    var rx = Array.isArray(session.prescription) && session.prescription.length
      ? session.prescription.map(function (p) {
        return { medicine: p.medicine || p.name || '', dosage: p.dosage || '', days: p.days || '' };
      })
      : [{ medicine: '', dosage: '', days: '' }];

    /* (a) Patient panel */
    var patientBody =
      '<div class="space-y-3 text-sm">' +
      '<div><p class="text-xs text-gray-500">' + esc(I18n.t('patient')) + '</p>' +
      '<p class="font-semibold text-gray-900 text-base">' + esc(session.patientName || '—') + '</p></div>' +
      '<div class="grid grid-cols-2 gap-2">' +
      '<div><p class="text-xs text-gray-500">' + esc(I18n.t('age')) + '</p><p class="font-medium">' + esc(session.age != null ? session.age : '—') + '</p></div>' +
      '<div><p class="text-xs text-gray-500">' + esc(I18n.t('gender')) + '</p><p class="font-medium">' + esc(session.gender || '—') + '</p></div>' +
      '</div>' +
      '<div><p class="text-xs text-gray-500">' + esc(I18n.t('presenting_complaint')) + '</p>' +
      '<p class="font-medium">' + esc(session.complaint || session.presentingComplaint || '—') + '</p></div>' +
      '<div><p class="text-xs text-gray-500">' + esc(I18n.t('vitals_summary')) + '</p>' +
      '<p class="font-medium">' + esc(session.vitals || session.vitalsSummary || '—') + '</p></div>' +
      (session.assistedBy
        ? '<div><span class="inline-block px-2 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">🤝 ' + esc(session.assistedBy) + '</span></div>'
        : '') +
      '<div class="grid grid-cols-3 gap-2 pt-1 border-t border-gray-100">' +
      '<div><p class="text-xs text-gray-500">' + esc(I18n.t('session_started')) + '</p><p class="font-medium text-xs">' + esc(session.startedAt ? new Date(session.startedAt).toLocaleTimeString() : '—') + '</p></div>' +
      '<div><p class="text-xs text-gray-500">' + esc(I18n.t('session_ended')) + '</p><p class="font-medium text-xs">' + esc(session.endedAt ? new Date(session.endedAt).toLocaleTimeString() : '—') + '</p></div>' +
      '<div><p class="text-xs text-gray-500">' + esc(I18n.t('duration')) + '</p><p class="font-medium text-xs">⏱ ' + esc(fmtDuration(session.duration_seconds)) + '</p></div>' +
      '</div>' +
      '</div>';

    /* (b) Video area */
    var videoBody =
      '<div class="bg-gray-900 rounded-xl aspect-video flex flex-col items-center justify-center text-white">' +
      '<svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-gray-500">' +
      '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/></svg>' +
      '<p class="mt-3 text-sm text-gray-400">' + esc(I18n.t('camera_off_demo')) + '</p>' +
      '</div>' +
      '<div class="flex justify-center gap-3 mt-4">' +
      '<button id="tc-mute" class="btn btn-secondary">' + esc(I18n.t('mute')) + '</button>' +
      '<button id="tc-cam" class="btn btn-secondary">' + esc(I18n.t('camera')) + '</button>' +
      '<button id="tc-end" class="btn btn-danger">' + esc(I18n.t('end_call')) + '</button>' +
      '</div>';

    /* (c) Doctor panel */
    var doctorBody =
      '<div class="space-y-4">' +
      '<div><label class="block text-sm font-medium text-gray-700 mb-1">' + esc(I18n.t('diagnosis')) + '</label>' +
      '<textarea id="tc-diagnosis" rows="3" class="' + INPUT_CLS + '">' + esc(session.diagnosis || '') + '</textarea></div>' +
      '<div><label class="block text-sm font-medium text-gray-700 mb-1">' + esc(I18n.t('consultation_notes')) + '</label>' +
      '<textarea id="tc-notes" rows="3" class="' + INPUT_CLS + '">' + esc(session.notes || '') + '</textarea></div>' +
      '<div><div class="flex items-center justify-between mb-2">' +
      '<label class="text-sm font-medium text-gray-700">' + esc(I18n.t('prescription')) + '</label>' +
      '<button id="tc-rx-add" type="button" class="btn btn-secondary btn-sm">+ ' + esc(I18n.t('add_medicine')) + '</button>' +
      '</div><div id="tc-rx-rows" class="space-y-3"></div></div>' +
      '<button id="tc-save" class="btn btn-primary w-full">' + esc(I18n.t('save_consultation')) + '</button>' +
      '</div>';

    el.innerHTML =
      '<div class="p-4 max-w-7xl mx-auto">' +
      '<div class="flex flex-wrap items-center justify-between gap-3 mb-4">' +
      '<div class="flex items-center gap-3">' +
      '<button id="tc-back" class="btn btn-secondary">← ' + esc(I18n.t('back_to_list')) + '</button>' +
      '<h1 class="text-xl sm:text-2xl font-bold text-gray-900">' + esc(I18n.t('tc_room')) + '</h1>' +
      '</div>' + statusBadge(session.status) +
      '</div>' +
      '<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">' +
      '<div>' + Cards.panel({ title: I18n.t('patient_panel'), bodyHTML: patientBody }) + '</div>' +
      '<div>' + Cards.panel({ title: I18n.t('video_panel'), bodyHTML: videoBody }) + '</div>' +
      '<div>' + Cards.panel({ title: I18n.t('doctor_panel'), bodyHTML: doctorBody }) + '</div>' +
      '</div></div>';

    var backBtn = el.querySelector('#tc-back');
    if (backBtn) backBtn.addEventListener('click', function () { Router.go('#/teleconsult'); });

    var rxWrap = el.querySelector('#tc-rx-rows');
    function paintRx() {
      renderRxRows(rxWrap, rx);
      rxWrap.querySelectorAll('.rx-remove').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var i = parseInt(btn.getAttribute('data-idx'), 10);
          rx.splice(i, 1);
          if (!rx.length) rx.push({ medicine: '', dosage: '', days: '' });
          paintRx();
        });
      });
    }
    paintRx();

    var addBtn = el.querySelector('#tc-rx-add');
    if (addBtn) addBtn.addEventListener('click', function () {
      rx.push({ medicine: '', dosage: '', days: '' });
      paintRx();
    });

    var muteBtn = el.querySelector('#tc-mute');
    if (muteBtn) muteBtn.addEventListener('click', function () { Toast.info(I18n.t('demo_notice')); });
    var camBtn = el.querySelector('#tc-cam');
    if (camBtn) camBtn.addEventListener('click', function () { Toast.info(I18n.t('demo_notice')); });

    var endBtn = el.querySelector('#tc-end');
    if (endBtn) endBtn.addEventListener('click', async function () {
      var ok = await Modal.confirm({
        title: I18n.t('end_confirm_title'),
        message: I18n.t('end_confirm_msg'),
        confirmLabel: I18n.t('end_call')
      });
      if (!ok) return;
      try {
        var res = await Api.put('/teleconsults/' + encodeURIComponent(sid), { status: 'completed' });
        if (res && res.queued) Toast.info(I18n.t('offline_queued'));
        else Toast.success(I18n.t('updated_ok'));
      } catch (e) {
        Toast.error(I18n.t('operation_failed'));
      }
      Router.go('#/teleconsult');
    });

    var saveBtn = el.querySelector('#tc-save');
    if (saveBtn) saveBtn.addEventListener('click', async function () {
      var prescription = [];
      rxWrap.querySelectorAll('[data-rx]').forEach(function (row) {
        var med = row.querySelector('.rx-med').value.trim();
        if (!med) return;
        prescription.push({
          medicine: med,
          dosage: row.querySelector('.rx-dose').value.trim(),
          days: row.querySelector('.rx-days').value.trim()
        });
      });
      var payload = {
        diagnosis: el.querySelector('#tc-diagnosis').value,
        notes: el.querySelector('#tc-notes').value,
        prescription: prescription
      };
      try {
        var res = await Api.put('/teleconsults/' + encodeURIComponent(sid), payload);
        if (res && res.queued) Toast.info(I18n.t('offline_queued'));
        else Toast.success(I18n.t('consultation_saved'));
      } catch (e) {
        Toast.error(I18n.t('operation_failed'));
      }
    });
  }

  /* ---------------- Entry ---------------- */

  Views.teleconsult = async function (el) {
    var params = Router.params();
    if (params && params.id) {
      await renderRoom(el, params.id);
      return;
    }
    await renderList(el);
  };

})();
