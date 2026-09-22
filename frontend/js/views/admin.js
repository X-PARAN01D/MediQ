/* Arogya Seva Maharashtra — Administration view.
   Plain script, no modules. Registers Views.admin.
   system_admin: full access. facility_admin: read-only. */

I18n.addStrings({
  en: {
    admin_title: 'Administration',
    tab_users: 'Users',
    tab_system: 'System',
    add_user: 'Add User',
    edit_user: 'Edit User',
    role: 'Role',
    activate: 'Activate',
    deactivate: 'Deactivate',
    backend_url: 'Backend URL',
    demo_mode: 'Demo Mode',
    demo_on: 'Demo mode is ON — using sample data.',
    demo_off: 'Connected to live backend.',
    storage_usage: 'Storage Usage',
    storage_note: 'The offline queue and cached data are stored locally on this device. Clearing the queue removes unsent requests.',
    clear_queue: 'Clear Offline Queue',
    queue_cleared: 'Offline queue cleared.',
    read_only: 'Read-only access — contact a system administrator to make changes.',
    no_users: 'No users found.',
    no_users_msg: 'No user accounts exist yet.',
    save_url: 'Save',
    url_saved: 'Backend URL updated.',
    confirm_deactivate: 'Deactivate this user?',
    confirm_activate: 'Activate this user?'
  },
  hi: {
    admin_title: 'प्रशासन',
    tab_users: 'उपयोगकर्ता',
    tab_system: 'सिस्टम',
    add_user: 'उपयोगकर्ता जोड़ें',
    edit_user: 'उपयोगकर्ता संपादित करें',
    role: 'भूमिका',
    activate: 'सक्रिय करें',
    deactivate: 'निष्क्रिय करें',
    backend_url: 'बैकएंड URL',
    demo_mode: 'डेमो मोड',
    demo_on: 'डेमो मोड चालू है — नमूना डेटा उपयोग में है।',
    demo_off: 'लाइव बैकएंड से जुड़ा हुआ है।',
    storage_usage: 'स्टोरेज उपयोग',
    storage_note: 'ऑफलाइन कतार और कैश डेटा इस डिवाइस पर स्थानीय रूप से संग्रहीत हैं। कतार साफ़ करने से न भेजे गए अनुरोध हट जाते हैं।',
    clear_queue: 'ऑफलाइन कतार साफ़ करें',
    queue_cleared: 'ऑफलाइन कतार साफ़ कर दी गई।',
    read_only: 'केवल-पढ़ने की पहुँच — बदलाव के लिए सिस्टम प्रशासक से संपर्क करें।',
    no_users: 'कोई उपयोगकर्ता नहीं मिला।',
    no_users_msg: 'अभी कोई उपयोगकर्ता खाता मौजूद नहीं है।',
    save_url: 'सहेजें',
    url_saved: 'बैकएंड URL अपडेट किया गया।',
    confirm_deactivate: 'इस उपयोगकर्ता को निष्क्रिय करें?',
    confirm_activate: 'इस उपयोगकर्ता को सक्रिय करें?'
  },
  mr: {
    admin_title: 'प्रशासन',
    tab_users: 'वापरकर्ते',
    tab_system: 'प्रणाली',
    add_user: 'वापरकर्ता जोडा',
    edit_user: 'वापरकर्ता संपादित करा',
    role: 'भूमिका',
    activate: 'सक्रिय करा',
    deactivate: 'निष्क्रिय करा',
    backend_url: 'बॅकएंड URL',
    demo_mode: 'डेमो मोड',
    demo_on: 'डेमो मोड चालू आहे — नमुना डेटा वापरात आहे.',
    demo_off: 'थेट बॅकएंडशी जोडले आहे.',
    storage_usage: 'साठवण वापर',
    storage_note: 'ऑफलाइन रांग आणि कॅश केलेला डेटा या डिव्हाइसवर स्थानिकरित्या जतन केला आहे. रांग साफ केल्याने न पाठवलेल्या विनंत्या काढून टाकल्या जातात.',
    clear_queue: 'ऑफलाइन रांग साफ करा',
    queue_cleared: 'ऑफलाइन रांग साफ केली.',
    read_only: 'फक्त-वाचन प्रवेश — बदलांसाठी सिस्टम प्रशासकाशी संपर्क साधा.',
    no_users: 'कोणतेही वापरकर्ते सापडले नाहीत.',
    no_users_msg: 'अद्याप कोणतेही वापरकर्ता खाते अस्तित्वात नाही.',
    save_url: 'जतन करा',
    url_saved: 'बॅकएंड URL अद्यतनित केला.',
    confirm_deactivate: 'हा वापरकर्ता निष्क्रिय करायचा?',
    confirm_activate: 'हा वापरकर्ता सक्रिय करायचा?'
  }
});

(function () {
  'use strict';

  var ROLES = [
    'system_admin', 'facility_admin', 'doctor', 'nurse',
    'pharmacist', 'asha_worker', 'lab_technician', 'receptionist'
  ];

  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function canManage() {
    try { return Auth.can('system_admin'); } catch (e) { return false; }
  }

  function guardManage() {
    if (!canManage()) { Toast.warning(I18n.t('read_only')); return false; }
    return true;
  }

  function roleLabel(r) {
    return esc(String(r || '').replace(/_/g, ' '));
  }

  function statusBadge(st) {
    var active = String(st).toLowerCase() === 'active';
    return '<span class="inline-block px-2 py-1 rounded-full text-xs font-semibold ' +
      (active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600') + '">' +
      esc(active ? I18n.t('active') : (st || '—')) + '</span>';
  }

  /* ---------------- Users tab ---------------- */

  function userFormFields(user) {
    user = user || {};
    var roleOpts = ROLES.map(function (r) { return { value: r, label: r.replace(/_/g, ' ') }; });
    return Forms.field({ label: I18n.t('name'), name: 'name', type: 'text', required: true, value: user.name || '' }) +
      Forms.field({ label: I18n.t('role'), name: 'role', type: 'select', required: true, value: user.role || '', options: [{ value: '', label: '—' }].concat(roleOpts) }) +
      Forms.field({ label: I18n.t('facility'), name: 'facility', type: 'text', required: true, value: user.facility || '' }) +
      Forms.field({ label: I18n.t('phone'), name: 'phone', type: 'tel', required: true, value: user.phone || '' }) +
      (user.id
        ? Forms.field({
          label: I18n.t('status'), name: 'status', type: 'select', required: true,
          value: user.status || 'active',
          options: [{ value: 'active', label: I18n.t('active') }, { value: 'inactive', label: I18n.t('deactivate') }]
        })
        : '');
  }

  function openUserModal(user, onSaved) {
    var isEdit = !!(user && user.id);
    Modal.open({
      title: isEdit ? I18n.t('edit_user') : I18n.t('add_user'),
      bodyHTML: '<form id="admin-user-form" class="space-y-4">' + userFormFields(user) + '</form>',
      actions: [
        { label: I18n.t('cancel'), kind: 'secondary', onClick: function () { Modal.close(); } },
        {
          label: I18n.t('save'), kind: 'primary',
          onClick: async function () {
            var form = document.getElementById('admin-user-form');
            if (!form || !Forms.validate(form)) { Toast.error(I18n.t('required_field')); return; }
            var v = Forms.values(form);
            try {
              var res = isEdit
                ? await Api.put('/users/' + encodeURIComponent(user.id), v)
                : await Api.post('/users', v);
              Modal.close();
              if (res && res.queued) Toast.info(I18n.t('offline_queued'));
              else Toast.success(isEdit ? I18n.t('updated_ok') : I18n.t('saved_ok'));
              if (onSaved) onSaved();
            } catch (e) {
              Toast.error(I18n.t('operation_failed'));
            }
          }
        }
      ]
    });
  }

  async function paintUsers(el, mount) {
    mount.innerHTML = Skeleton.table();

    var rows = [];
    try {
      var res = await Api.get('/users');
      if (res && res.queued) Toast.info(I18n.t('offline_queued'));
      rows = Array.isArray(res) ? res : (res && (res.data || res.rows)) || [];
    } catch (e) {
      mount.innerHTML =
        '<div class="rounded-xl bg-red-50 border border-red-200 p-6 text-center">' +
        '<p class="font-medium text-red-800">' + esc(I18n.t('error_load')) + '</p>' +
        '<button id="admin-retry" class="btn btn-danger mt-4">' + esc(I18n.t('try_again')) + '</button></div>';
      var rb = mount.querySelector('#admin-retry');
      if (rb) rb.addEventListener('click', function () { paintUsers(el, mount); });
      return;
    }

    var manage = canManage();
    var header =
      '<div class="flex flex-wrap items-center justify-between gap-3 mb-4">' +
      '<h2 class="text-lg font-bold text-gray-900">' + esc(I18n.t('tab_users')) + '</h2>' +
      (manage
        ? '<button id="admin-add-user" class="btn btn-primary">+ ' + esc(I18n.t('add_user')) + '</button>'
        : '<p class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">🔒 ' + esc(I18n.t('read_only')) + '</p>') +
      '</div>';

    var body = rows.length
      ? Tables.render({
        columns: [
          { key: 'name', label: I18n.t('name') },
          { key: 'role', label: I18n.t('role'), render: function (r) { return roleLabel(r.role); } },
          { key: 'facility', label: I18n.t('facility') },
          { key: 'phone', label: I18n.t('phone') },
          { key: 'status', label: I18n.t('status'), render: function (r) { return statusBadge(r.status); } }
        ],
        rows: rows,
        emptyTitle: I18n.t('no_users'),
        emptyMessage: I18n.t('no_users_msg'),
        actions: manage ? [
          { id: 'edit', label: I18n.t('edit'), kind: 'secondary' },
          { id: 'toggle', label: I18n.t('activate') + '/' + I18n.t('deactivate'), kind: 'secondary' },
          { id: 'delete', label: I18n.t('delete'), kind: 'danger' }
        ] : []
      })
      : EmptyState.render({ icon: '👥', title: I18n.t('no_users'), message: I18n.t('no_users_msg'), actionLabel: manage ? I18n.t('add_user') : '' });

    mount.innerHTML = header + body;

    var addBtn = mount.querySelector('#admin-add-user');
    if (addBtn) addBtn.addEventListener('click', function () {
      if (!guardManage()) return;
      openUserModal(null, function () { paintUsers(el, mount); });
    });
    var eb = mount.querySelector('[data-empty-btn]');
    if (eb) eb.addEventListener('click', function () {
      if (!guardManage()) return;
      openUserModal(null, function () { paintUsers(el, mount); });
    });

    if (manage && rows.length) {
      Tables.bindActions(mount, rows, {
        edit: function (row) {
          if (!guardManage()) return;
          openUserModal(row, function () { paintUsers(el, mount); });
        },
        toggle: async function (row) {
          if (!guardManage()) return;
          var toActive = String(row.status).toLowerCase() !== 'active';
          var ok = await Modal.confirm({
            title: toActive ? I18n.t('activate') : I18n.t('deactivate'),
            message: toActive ? I18n.t('confirm_activate') : I18n.t('confirm_deactivate'),
            confirmLabel: toActive ? I18n.t('activate') : I18n.t('deactivate')
          });
          if (!ok) return;
          try {
            var res = await Api.put('/users/' + encodeURIComponent(row.id || row._id), { status: toActive ? 'active' : 'inactive' });
            if (res && res.queued) Toast.info(I18n.t('offline_queued'));
            else Toast.success(I18n.t('updated_ok'));
            paintUsers(el, mount);
          } catch (e) { Toast.error(I18n.t('operation_failed')); }
        },
        delete: async function (row) {
          if (!guardManage()) return;
          var ok = await Modal.confirm({
            title: I18n.t('confirm_delete'),
            message: I18n.t('delete_confirm_msg'),
            confirmLabel: I18n.t('delete')
          });
          if (!ok) return;
          try {
            var res = await Api.del('/users/' + encodeURIComponent(row.id || row._id));
            if (res && res.queued) Toast.info(I18n.t('offline_queued'));
            else Toast.success(I18n.t('deleted_ok'));
            paintUsers(el, mount);
          } catch (e) { Toast.error(I18n.t('operation_failed')); }
        }
      });
    }
  }

  /* ---------------- System tab ---------------- */

  function paintSystem(el, mount) {
    var demo = false;
    try { demo = !!(Api && Api.demoMode); } catch (e) { demo = false; }
    var baseUrl = '';
    try { baseUrl = (Api && Api.baseUrl) || ''; } catch (e) { baseUrl = ''; }

    var badge = demo
      ? '<span class="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">⚠ ' + esc(I18n.t('demo_mode')) + ' — ' + esc(I18n.t('demo_on')) + '</span>'
      : '<span class="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">✓ ' + esc(I18n.t('demo_off')) + '</span>';

    mount.innerHTML =
      '<div class="space-y-4">' +
      Cards.panel({
        title: I18n.t('backend_url'),
        bodyHTML:
          '<div class="space-y-3">' +
          '<input id="admin-baseurl" type="url" value="' + esc(baseUrl) + '" placeholder="https://" ' +
          'class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />' +
          '<button id="admin-save-url" class="btn btn-primary">' + esc(I18n.t('save_url')) + '</button>' +
          '</div>'
      }) +
      Cards.panel({ title: I18n.t('demo_mode'), bodyHTML: badge }) +
      Cards.panel({
        title: I18n.t('storage_usage'),
        bodyHTML:
          '<p class="text-sm text-gray-600 mb-4">' + esc(I18n.t('storage_note')) + '</p>' +
          '<button id="admin-clear-queue" class="btn btn-secondary">' + esc(I18n.t('clear_queue')) + '</button>'
      }) +
      '</div>';

    var saveBtn = mount.querySelector('#admin-save-url');
    if (saveBtn) saveBtn.addEventListener('click', function () {
      if (!guardManage()) return;
      var url = mount.querySelector('#admin-baseurl').value.trim();
      try {
        if (Api && typeof Api.setBaseUrl === 'function') Api.setBaseUrl(url);
        Toast.success(I18n.t('url_saved'));
      } catch (e) {
        Toast.error(I18n.t('operation_failed'));
      }
    });

    var clearBtn = mount.querySelector('#admin-clear-queue');
    if (clearBtn) clearBtn.addEventListener('click', async function () {
      if (!guardManage()) return;
      var ok = await Modal.confirm({
        title: I18n.t('clear_queue'),
        message: I18n.t('storage_note'),
        confirmLabel: I18n.t('clear_queue')
      });
      if (!ok) return;
      try {
        if (Api && typeof Api.clearQueue === 'function') await Api.clearQueue();
        Toast.success(I18n.t('queue_cleared'));
      } catch (e) {
        Toast.error(I18n.t('operation_failed'));
      }
    });
  }

  /* ---------------- Entry ---------------- */

  Views.admin = async function (el) {
    document.title = I18n.t('app_name') + ' · ' + I18n.t('admin_title');
    var tab = 'users';

    function shell() {
      return '<div class="p-4 max-w-7xl mx-auto">' +
        '<h1 class="text-xl sm:text-2xl font-bold text-gray-900 mb-4">' + esc(I18n.t('admin_title')) + '</h1>' +
        '<div class="flex gap-2 mb-4 border-b border-gray-200">' +
        '<button data-tab="users" class="admin-tab px-4 py-2 text-sm font-medium border-b-2 -mb-px ' +
        (tab === 'users' ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700') + '">' +
        esc(I18n.t('tab_users')) + '</button>' +
        '<button data-tab="system" class="admin-tab px-4 py-2 text-sm font-medium border-b-2 -mb-px ' +
        (tab === 'system' ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700') + '">' +
        esc(I18n.t('tab_system')) + '</button>' +
        '</div>' +
        '<div id="admin-mount"></div>' +
        '</div>';
    }

    function paint() {
      el.innerHTML = shell();
      el.querySelectorAll('.admin-tab').forEach(function (btn) {
        btn.addEventListener('click', function () {
          tab = btn.getAttribute('data-tab');
          paint();
        });
      });
      var mount = el.querySelector('#admin-mount');
      if (tab === 'users') paintUsers(el, mount);
      else paintSystem(el, mount);
    }

    paint();
  };

})();
