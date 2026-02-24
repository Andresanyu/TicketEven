import api from "./api.js";

function showToast(msg, type) {
  var t = document.getElementById('toast');
  if (!t) return;
  document.getElementById('toastMsg').textContent = msg;
  t.className = 'toast' + (type === 'error' ? ' error' : '');
  t.classList.add('show');
  setTimeout(function () { t.classList.remove('show'); }, 3000);
}

function validate() {
  var ok = true;

  function check(fieldId, inputId, cond, msg) {
    var field = document.getElementById(fieldId);
    var input = document.getElementById(inputId);
    if (!field || !input) return;
    var err = field.querySelector('.err-msg');
    if (!cond) {
      field.classList.add('has-error');
      input.classList.add('invalid');
      if (msg && err) err.textContent = msg;
      ok = false;
    } else {
      field.classList.remove('has-error');
      input.classList.remove('invalid');
    }
  }

  var nombre = (document.getElementById('cat-nombre')?.value ?? '').trim();
  check(
    'field-nombre',
    'cat-nombre',
    nombre.length > 0 && nombre.length <= 100,
    'El nombre es obligatorio y no puede superar 100 caracteres.'
  );

  return ok;
}

async function saveCategory() {
  var data = {
    nombre: document.getElementById('cat-nombre').value.trim(),
  };

  await api.post('/categories', data);
  showToast('Categoría creada');

  resetCategoryForm();
}

function resetCategoryForm() {
  document.getElementById('categoryForm')?.reset();
  document.querySelectorAll('.field').forEach(function (f) {
    f.classList.remove('has-error');
  });
  document.querySelectorAll('.invalid').forEach(function (i) {
    i.classList.remove('invalid');
  });
}

window.resetCategoryForm = resetCategoryForm;

var formEl = document.getElementById('categoryForm');
if (formEl) {
  formEl.addEventListener('submit', async function (e) {
    e.preventDefault();

    if (!validate()) {
      showToast('Corrige los errores antes de continuar.', 'error');
      return;
    }

    var btn = document.getElementById('submitCatBtn');
    btn.classList.add('loading');

    try {
      await saveCategory();
    } catch (err) {
      if (err?.status === 409 || err?.message?.toLowerCase().includes('unique')) {
        var field = document.getElementById('field-nombre');
        var input = document.getElementById('cat-nombre');
        var errMsg = field?.querySelector('.err-msg');
        if (field) field.classList.add('has-error');
        if (input) input.classList.add('invalid');
        if (errMsg) errMsg.textContent = 'Ya existe una categoría con ese nombre.';
        showToast('Nombre de categoría duplicado.', 'error');
      } else {
        showToast('Error al guardar la categoría.', 'error');
        console.error(err);
      }
    } finally {
      btn.classList.remove('loading');
    }
  });

  document.querySelectorAll('input, select, textarea').forEach(function (el) {
    el.addEventListener('input', function () {
      var f = this.closest('.field');
      if (f) {
        f.classList.remove('has-error');
        this.classList.remove('invalid');
      }
    });
  });
}