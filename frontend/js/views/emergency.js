/* Arogya Seva Maharashtra — Emergency SOS view.
   Plain script, no modules. Registers Views.emergency. */

I18n.addStrings({
  en: {
    sos_title: 'SOS — Emergency Alert',
    sos_tap: 'Tap SOS in a medical emergency',
    sos_warning: 'Use only for real emergencies',
    sos_confirm_msg: 'This will alert the nearest facility and request immediate help. Continue?',
    send_alert: 'Send Alert',
    alert_details: 'Emergency Details',
    location: 'Location / Village',
    describe_emergency: 'Describe the emergency',
    alert_sent: 'Emergency alert sent!',
    alert_queued: 'Alert queued — will send when you are back online.',
    step1: 'Alert sent to nearest facility',
    step2: 'Call 108 for ambulance',
    step3: 'Facility emergency team notified',
    step4: 'Estimated arrival',
    emergency_contacts: 'Emergency Contacts',
    ambulance_108: '108 Ambulance',
    available_247: 'Available 24×7, toll-free',
    call_108: 'Call 108',
    facility_phone: 'Facility Phone',
    not_available: 'Not available',
    submitting: 'Sending…'
  },
  hi: {
    sos_title: 'SOS — आपातकालीन चेतावनी',
    sos_tap: 'चिकित्सा आपातकाल में SOS दबाएं',
    sos_warning: 'केवल वास्तविक आपातकाल के लिए उपयोग करें',
    sos_confirm_msg: 'इससे नज़दीकी सुविधा को सतर्क किया जाएगा और तुरंत सहायता मांगी जाएगी। जारी रखें?',
    send_alert: 'चेतावनी भेजें',
    alert_details: 'आपातकालीन विवरण',
    location: 'स्थान / गाँव',
    describe_emergency: 'आपातकाल का वर्णन करें',
    alert_sent: 'आपातकालीन चेतावनी भेजी गई!',
    alert_queued: 'चेतावनी कतार में है — ऑनलाइन आने पर भेजी जाएगी।',
    step1: 'नज़दीकी सुविधा को चेतावनी भेजी गई',
    step2: 'एम्बुलेंस के लिए 108 पर कॉल करें',
    step3: 'सुविधा आपातकालीन टीम को सूचित किया गया',
    step4: 'अनुमानित आगमन',
    emergency_contacts: 'आपातकालीन संपर्क',
    ambulance_108: '108 एम्बुलेंस',
    available_247: '24×7 उपलब्ध, टोल-फ्री',
    call_108: '108 पर कॉल करें',
    facility_phone: 'सुविधा फोन',
    not_available: 'उपलब्ध नहीं',
    submitting: 'भेजा जा रहा है…'
  },
  mr: {
    sos_title: 'SOS — आणीबाणी सतर्कता',
    sos_tap: 'वैद्यकीय आणीबाणीत SOS दाबा',
    sos_warning: 'फक्त खऱ्या आणीबाणीसाठी वापरा',
    sos_confirm_msg: 'यामुळे जवळच्या सुविधेला सतर्क केले जाईल आणि तात्काळ मदत मागवली जाईल. पुढे जायचे?',
    send_alert: 'सतर्कता पाठवा',
    alert_details: 'आणीबाणी तपशील',
    location: 'ठिकाण / गाव',
    describe_emergency: 'आणीबाणीचे वर्णन करा',
    alert_sent: 'आणीबाणी सतर्कता पाठवली!',
    alert_queued: 'सतर्कता रांगेत आहे — ऑनलाइन आल्यावर पाठवली जाईल.',
    step1: 'जवळच्या सुविधेला सतर्कता पाठवली',
    step2: 'रुग्णवाहिकेसाठी 108 ला कॉल करा',
    step3: 'सुविधेच्या आणीबाणी पथकाला कळवले',
    step4: 'अंदाजित आगमन',
    emergency_contacts: 'आणीबाणी संपर्क',
    ambulance_108: '108 रुग्णवाहिका',
    available_247: '24×7 उपलब्ध, टोल-फ्री',
    call_108: '108 ला कॉल करा',
    facility_phone: 'सुविधा फोन',
    not_available: 'उपलब्ध नाही',
    submitting: 'पाठवत आहे…'
  }
});

(function () {
  'use strict';

  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var PULSE_CSS =
    '<style>' +
    '@keyframes sosPulse{' +
    '0%{box-shadow:0 0 0 0 rgba(220,38,38,.55)}' +
    '70%{box-shadow:0 0 0 30px rgba(220,38,38,0)}' +
    '100%{box-shadow:0 0 0 0 rgba(220,38,38,0)}}' +
    '.sos-btn{animation:sosPulse 1.6s ease-out infinite}' +
    '</style>';

  function contactsHTML() {
    return '<div class="space-y-3">' +
      '<div class="flex items-center justify-between gap-3 rounded-xl bg-red-50 border border-red-200 p-4">' +
      '<div><p class="font-semibold text-red-800">' + esc(I18n.t('ambulance_108')) + '</p>' +
      '<p class="text-xs text-red-600">' + esc(I18n.t('available_247')) + '</p></div>' +
      '<a href="tel:108" class="btn btn-danger whitespace-nowrap">' + esc(I18n.t('call_108')) + '</a>' +
      '</div>' +
      '<div class="flex items-center justify-between gap-3 rounded-xl bg-gray-50 border border-gray-200 p-4">' +
      '<p class="font-semibold text-gray-800">' + esc(I18n.t('facility_phone')) + '</p>' +
      '<span class="text-sm text-gray-500">' + esc(I18n.t('not_available')) + '</span>' +
      '</div>' +
      '</div>';
  }

  function timelineHTML(queued) {
    var steps = [
      { text: I18n.t('step1'), state: 'done' },
      { text: I18n.t('step2'), state: 'action' },
      { text: I18n.t('step3'), state: 'pending' },
      { text: I18n.t('step4') + ': ~25 min', state: 'pending' }
    ];
    var items = steps.map(function (s, i) {
      var dot;
      if (s.state === 'done') {
        dot = '<span class="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-white text-sm font-bold">✓</span>';
      } else if (s.state === 'action') {
        dot = '<span class="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white text-sm font-bold">' + (i + 1) + '</span>';
      } else {
        dot = '<span class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-600 text-sm font-bold">' + (i + 1) + '</span>';
      }
      var extra = s.state === 'action'
        ? '<div class="mt-2"><a href="tel:108" class="btn btn-danger">' + esc(I18n.t('call_108')) + '</a></div>'
        : '';
      var line = i < steps.length - 1 ? '<span class="absolute left-4 top-8 bottom-0 w-px bg-gray-200" aria-hidden="true"></span>' : '';
      return '<li class="relative flex gap-4 pb-6 last:pb-0">' + line + dot +
        '<div class="pt-1"><p class="font-medium text-gray-800">' + esc(s.text) + '</p>' + extra + '</div></li>';
    }).join('');

    var banner = queued
      ? '<div class="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm font-medium text-amber-800">⏳ ' + esc(I18n.t('alert_queued')) + '</div>'
      : '<div class="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm font-medium text-green-800">✓ ' + esc(I18n.t('alert_sent')) + '</div>';

    return banner + '<ol class="relative">' + items + '</ol>';
  }

  function showForm(el) {
    var wrap = el.querySelector('#em-form-wrap');
    wrap.innerHTML = Cards.panel({
      title: I18n.t('alert_details'),
      bodyHTML:
        '<form id="em-form" class="space-y-4">' +
        Forms.field({ label: I18n.t('patient'), name: 'patientName', type: 'text', required: true, placeholder: I18n.t('patient') }) +
        Forms.field({ label: I18n.t('location'), name: 'location', type: 'text', required: true, placeholder: I18n.t('village') }) +
        Forms.field({ label: I18n.t('describe_emergency'), name: 'description', type: 'textarea', rows: 3, required: true }) +
        Forms.field({ label: I18n.t('phone'), name: 'phone', type: 'tel', required: true }) +
        '<button type="submit" id="em-submit" class="btn btn-danger w-full text-lg py-3">' + esc(I18n.t('send_alert')) + '</button>' +
        '</form>'
    });
    wrap.classList.remove('hidden');
    wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });

    var form = wrap.querySelector('#em-form');
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!Forms.validate(form)) { Toast.error(I18n.t('required_field')); return; }
      var btn = form.querySelector('#em-submit');
      btn.disabled = true;
      btn.textContent = I18n.t('submitting');
      var v = Forms.values(form);
      try {
        var res = await Api.post('/emergency', {
          patientName: v.patientName,
          location: v.location,
          description: v.description,
          phone: v.phone,
          createdAt: new Date().toISOString()
        });
        var queued = !!(res && res.queued);
        if (queued) Toast.info(I18n.t('offline_queued'));
        else Toast.success(I18n.t('alert_sent'));
        wrap.classList.add('hidden');
        var result = el.querySelector('#em-result');
        result.innerHTML = Cards.panel({ title: I18n.t('sos_title'), bodyHTML: timelineHTML(queued) });
        result.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (err) {
        Toast.error(I18n.t('operation_failed'));
        btn.disabled = false;
        btn.textContent = I18n.t('send_alert');
      }
    });
  }

  Views.emergency = async function (el) {
    document.title = I18n.t('app_name') + ' · SOS';

    el.innerHTML = PULSE_CSS +
      '<div class="p-4 max-w-2xl mx-auto">' +
      '<div class="text-center py-10">' +
      '<button id="em-sos" class="sos-btn w-44 h-44 sm:w-52 sm:h-52 rounded-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-4xl font-extrabold tracking-widest shadow-2xl focus:outline-none focus:ring-4 focus:ring-red-300">SOS</button>' +
      '<p class="mt-6 text-lg font-medium text-gray-800">' + esc(I18n.t('sos_tap')) + '</p>' +
      '<p class="mt-2 text-sm font-semibold text-red-700">⚠ ' + esc(I18n.t('sos_warning')) + '</p>' +
      '</div>' +
      '<div id="em-form-wrap" class="hidden"></div>' +
      '<div id="em-result" class="mt-4"></div>' +
      '<div class="mt-6">' + Cards.panel({ title: I18n.t('emergency_contacts'), bodyHTML: contactsHTML() }) + '</div>' +
      '</div>';

    var sos = el.querySelector('#em-sos');
    if (sos) sos.addEventListener('click', async function () {
      var ok = await Modal.confirm({
        title: I18n.t('sos_title'),
        message: I18n.t('sos_confirm_msg'),
        confirmLabel: I18n.t('send_alert')
      });
      if (!ok) return;
      showForm(el);
    });
  };

})();
