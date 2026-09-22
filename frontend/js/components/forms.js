/* Forms — window.Forms
 *   Forms.field({ label, name, type, value, required, options, placeholder, min, max, step, rows }) -> HTML string
 *     type: text|number|tel|date|time|datetime-local|select|textarea|checkbox|password
 *   Forms.values(form)   -> { name: value } (checkbox -> boolean)
 *   Forms.validate(form) -> boolean (native validation via reportValidity)
 * Plain <script> global, no dependencies. Values are NOT escaped — views escape data.
 */
(function () {
  'use strict';

  function asterisk(required) {
    return required ? ' <span class="text-red-500" aria-hidden="true">*</span>' : '';
  }

  function field(o) {
    o = o || {};
    var label = o.label || '';
    var name = o.name || '';
    var type = o.type || 'text';
    var reqAttr = o.required ? ' required' : '';
    var phAttr = (o.placeholder != null && o.placeholder !== '') ? ' placeholder="' + o.placeholder + '"' : '';

    if (type === 'select') {
      var opts = (o.options || []).map(function (op) {
        var v = (typeof op === 'object' && op !== null) ? op.value : op;
        var l = (typeof op === 'object' && op !== null) ? op.label : op;
        var sel = (o.value !== undefined && o.value !== null && String(o.value) === String(v)) ? ' selected' : '';
        return '<option value="' + v + '"' + sel + '>' + l + '</option>';
      }).join('');
      return '<div class="field">' +
        '<label class="label" for="' + name + '">' + label + asterisk(o.required) + '</label>' +
        '<select class="select" id="' + name + '" name="' + name + '"' + reqAttr + '>' + opts + '</select>' +
      '</div>';
    }

    if (type === 'textarea') {
      return '<div class="field">' +
        '<label class="label" for="' + name + '">' + label + asterisk(o.required) + '</label>' +
        '<textarea class="textarea" id="' + name + '" name="' + name + '" rows="' + (o.rows || 3) + '"' + reqAttr + phAttr + '>' +
          (o.value == null ? '' : o.value) +
        '</textarea>' +
      '</div>';
    }

    if (type === 'checkbox') {
      var checked = o.value ? ' checked' : '';
      return '<div class="field">' +
        '<label class="label flex items-center gap-2 cursor-pointer">' +
          '<input type="checkbox" name="' + name + '" class="w-4 h-4 accent-teal-600"' + checked + reqAttr + '>' +
          '<span>' + label + asterisk(o.required) + '</span>' +
        '</label>' +
      '</div>';
    }

    var valAttr = (o.value !== undefined && o.value !== null && o.value !== '') ? ' value="' + o.value + '"' : '';
    var minAttr = (o.min !== undefined && o.min !== null) ? ' min="' + o.min + '"' : '';
    var maxAttr = (o.max !== undefined && o.max !== null) ? ' max="' + o.max + '"' : '';
    var stepAttr = (o.step !== undefined && o.step !== null) ? ' step="' + o.step + '"' : '';

    return '<div class="field">' +
      '<label class="label" for="' + name + '">' + label + asterisk(o.required) + '</label>' +
      '<input type="' + type + '" class="input" id="' + name + '" name="' + name + '"' +
        valAttr + reqAttr + phAttr + minAttr + maxAttr + stepAttr + '>' +
    '</div>';
  }

  function values(form) {
    var out = {};
    var els = form.querySelectorAll('[name]');
    Array.prototype.forEach.call(els, function (el) {
      if (el.disabled || !el.name) return;
      if (el.type === 'checkbox') {
        out[el.name] = el.checked;
      } else if (el.type === 'radio') {
        if (el.checked) out[el.name] = el.value;
      } else {
        out[el.name] = el.value;
      }
    });
    return out;
  }

  function validate(form) {
    if (typeof form.reportValidity === 'function') {
      return form.reportValidity();
    }
    return form.checkValidity();
  }

  window.Forms = {
    field: field,
    values: values,
    validate: validate
  };
})();
