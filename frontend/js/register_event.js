import api from "./api.js";
import { Auth } from "./auth.js";

Auth.requireAdmin();

export async function loadCategoryOptions() {
  const select = document.getElementById('ev-category');
  if (!select) return;

  try {
    const categories = await api.get('/categories');
    select.innerHTML = '';

    if (!Array.isArray(categories) || categories.length === 0) {
      select.innerHTML = '<option value="">Sin categorías disponibles</option>';
      return;
    }

    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = String(cat.id);
      option.textContent = cat.nombre;
      select.appendChild(option);
    });
  } catch (err) {
    console.error('Error cargando categorías:', err);
    select.innerHTML = '<option value="">No se pudieron cargar</option>';
    showToast('No se pudieron cargar las categorías.', 'error');
  }
}

export function showToast(msg, type) {
  const t = document.getElementById('toast');
  if (!t) return;
  document.getElementById('toastMsg').textContent = msg;
  t.className = 'toast' + (type === 'error' ? ' error' : '');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

export function previewImg(url) {
  const img    = document.getElementById('imgTag');
  const box    = document.getElementById('imgBox');
  const holder = document.getElementById('imgHolder');
  if (!img) return;

  if (!url) {
    img.classList.remove('show');
    box.classList.remove('loaded');
    holder.style.display = 'flex';
    return;
  }

  const tmp = new Image();
  tmp.onload = () => {
    img.src = url;
    img.classList.add('show');
    box.classList.add('loaded');
    holder.style.display = 'none';
  };
  tmp.onerror = () => {
    img.classList.remove('show');
    box.classList.remove('loaded');
    holder.style.display = 'flex';
  };
  tmp.src = url;
}

function validate() {
  let ok = true;

  function check(fieldId, inputId, cond, msg) {
    const field = document.getElementById(fieldId);
    const input = document.getElementById(inputId);
    if (!field || !input) return;
    const err = field.querySelector('.err-msg');
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

  const nombre = document.getElementById('ev-name').value.trim();
  check('field-nombre', 'ev-name', nombre.length > 0 && nombre.length <= 150,
    'El nombre es obligatorio (máx. 150 caracteres).');

  const fecha = document.getElementById('ev-date').value;
  if (!fecha) {
    check('field-fecha', 'ev-date', false, 'La fecha es obligatoria.');
  } else {
    const fechaEvento = new Date(fecha);
    check('field-fecha', 'ev-date',
      !isNaN(fechaEvento.getTime()) && fechaEvento > new Date(),
      'La fecha debe ser después de la fecha actual.');
  }

  const valor = document.getElementById('ev-price').value;
  check('field-valor', 'ev-price',
    valor === '' || (!isNaN(valor) && Number(valor) >= 0),
    'Ingresa un valor numérico válido (≥ 0).');

  const desc = document.getElementById('ev-descripcion').value;
  check('field-descripcion', 'ev-descripcion', desc.length <= 1000,
    'La descripción no puede superar 1000 caracteres.');

  const imgUrl = document.getElementById('ev-imagen').value.trim();
  if (imgUrl) {
    try { new URL(imgUrl); check('field-imagen', 'ev-imagen', true); }
    catch { check('field-imagen', 'ev-imagen', false, 'Ingresa una URL válida.'); }
  }

  return ok;
}

async function saveEvent() {
  const categoryValue = document.getElementById('ev-category').value;

  const data = {
    nombre:       document.getElementById('ev-name').value.trim(),
    categoria_id: categoryValue === '' ? null : Number(categoryValue),
    fecha:        document.getElementById('ev-date').value,
    valor:        document.getElementById('ev-price').value !== ''
                    ? parseFloat(document.getElementById('ev-price').value)
                    : null,
    descripcion:  document.getElementById('ev-descripcion').value.trim() || 'Sin descripción',
    imagen_url:   document.getElementById('ev-imagen').value.trim() || null,
    activo:       document.getElementById('ev-activo').checked,
  };

  await api.post('/events', data, Auth.authOptions());
  showToast('Evento creado');
  resetForm();
}

export function resetForm() {
  document.getElementById('eventForm')?.reset();
  document.querySelectorAll('.field').forEach(f => f.classList.remove('has-error'));
  document.querySelectorAll('.invalid').forEach(i => i.classList.remove('invalid'));
  previewImg('');
}

function setMinEventDate() {
  const dateInput = document.getElementById('ev-date');
  if (!dateInput) return;
  const now = new Date();
  now.setSeconds(0, 0);
  const pad = n => String(n).padStart(2, '0');
  dateInput.min =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

const formEl = document.getElementById('eventForm');
if (formEl) {
  formEl.addEventListener('submit', async e => {
    e.preventDefault();
    if (!validate()) {
      showToast('Corrige los errores antes de continuar.', 'error');
      return;
    }
    const btn = document.getElementById('submitBtn');
    btn.classList.add('loading');
    try {
      await saveEvent();
    } catch (err) {
      showToast('Error al guardar el evento.', 'error');
      console.error(err);
    } finally {
      btn.classList.remove('loading');
    }
  });

  document.querySelectorAll('input, select, textarea').forEach(el => {
    el.addEventListener('input', function() {
      const f = this.closest('.field');
      if (f) { f.classList.remove('has-error'); this.classList.remove('invalid'); }
    });
  });
}

window.previewImg = previewImg;
window.resetForm  = resetForm;

setMinEventDate();
loadCategoryOptions();