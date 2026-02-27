import api from "./api.js";

const params  = new URLSearchParams(window.location.search);
let currentEventId = params.get('id');
let allEvents = [];

function showToast(msg, type) {
  var t = document.getElementById('toast');
  if (!t) return;
  document.getElementById('toastMsg').textContent = msg;
  t.className = 'toast' + (type === 'error' ? ' error' : '');
  t.classList.add('show');
  setTimeout(function () { t.classList.remove('show'); }, 3000);
}

function previewImg(url) {
  var img    = document.getElementById('imgTag');
  var box    = document.getElementById('imgBox');
  var holder = document.getElementById('imgHolder');
  if (!img) return;
  if (!url) {
    img.classList.remove('show');
    box.classList.remove('loaded');
    holder.style.display = 'flex';
    return;
  }
  var tmp = new Image();
  tmp.onload = function () {
    img.src = url;
    img.classList.add('show');
    box.classList.add('loaded');
    holder.style.display = 'none';
  };
  tmp.onerror = function () {
    img.classList.remove('show');
    box.classList.remove('loaded');
    holder.style.display = 'flex';
  };
  tmp.src = url;
}

window.previewImg = previewImg;

function clearSearch() {
  var input = document.getElementById('searchInput');
  var dropdown = document.getElementById('searchDropdown');
  var clear = document.getElementById('searchClear');
  if (input) input.value = '';
  if (dropdown) {
    dropdown.innerHTML = '';
    dropdown.classList.remove('open');
  }
  if (clear) clear.classList.remove('visible');
}

window.clearSearch = clearSearch;

function formatDateLabel(isoString) {
  if (!isoString) return 'Sin fecha';
  var d = new Date(isoString);
  if (isNaN(d.getTime())) return 'Sin fecha';
  return d.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatPriceLabel(value) {
  if (value === null || value === undefined || value === '') return 'Gratis';
  var amount = Number(value);
  if (isNaN(amount) || amount <= 0) return 'Gratis';
  return amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

function renderSearchDropdown(items) {
  var dropdown = document.getElementById('searchDropdown');
  if (!dropdown) return;

  if (!items.length) {
    dropdown.innerHTML = '<div class="dd-empty">No se encontraron eventos.</div>';
    dropdown.classList.add('open');
    return;
  }

  dropdown.innerHTML = items.slice(0, 8).map(function (ev) {
    var selected = String(ev.id) === String(currentEventId) ? ' selected' : '';
    var price = formatPriceLabel(ev.valor);
    var priceClass = price === 'Gratis' ? 'dd-event-right free' : 'dd-event-right';
    return `
      <div class="dd-event-item${selected}" data-id="${ev.id}">
        <div class="dd-event-left">
          <div class="dd-event-name">${escHtml(ev.nombre || 'Sin nombre')}</div>
          <div class="dd-event-meta">
            <span>${formatDateLabel(ev.fecha)}</span>
            <span>•</span>
            <span class="dd-event-cat">${escHtml(ev.categoria || 'Sin categoría')}</span>
          </div>
        </div>
        <div class="${priceClass}">${escHtml(price)}</div>
      </div>`;
  }).join('');

  dropdown.classList.add('open');

  dropdown.querySelectorAll('.dd-event-item').forEach(function (item) {
    item.addEventListener('click', function () {
      var id = this.getAttribute('data-id');
      if (id) selectEventById(id, true);
    });
  });
}

function filterEventsByTerm(term) {
  var normalized = String(term || '').trim().toLowerCase();
  if (!normalized) return allEvents;
  return allEvents.filter(function (ev) {
    return String(ev.nombre || '').toLowerCase().includes(normalized);
  });
}

function setSearchInputValueById(id) {
  var input = document.getElementById('searchInput');
  var clear = document.getElementById('searchClear');
  if (!input) return;
  var selected = allEvents.find(function (ev) { return String(ev.id) === String(id); });
  input.value = selected?.nombre || '';
  if (clear && input.value.trim()) clear.classList.add('visible');
}

async function selectEventById(id, syncUrl) {
  currentEventId = String(id);
  if (syncUrl) {
    var nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('id', currentEventId);
    window.history.replaceState({}, '', nextUrl.toString());
  }

  setSearchInputValueById(currentEventId);

  var dropdown = document.getElementById('searchDropdown');
  if (dropdown) dropdown.classList.remove('open');

  try {
    var ev = await api.get('/events/' + currentEventId);
    renderForm(ev);
  } catch (err) {
    console.error(err);
    renderError('No se pudo cargar el evento. Verifica que el ID sea correcto.');
  }
}

function setupSearchUI() {
  var box = document.getElementById('searchBox');
  var input = document.getElementById('searchInput');
  var dropdown = document.getElementById('searchDropdown');
  var clear = document.getElementById('searchClear');
  if (!box || !input || !dropdown || !clear) return;

  input.addEventListener('focus', function () {
    box.classList.add('focused');
    renderSearchDropdown(filterEventsByTerm(input.value));
  });

  input.addEventListener('input', function () {
    if (input.value.trim()) clear.classList.add('visible');
    else clear.classList.remove('visible');
    renderSearchDropdown(filterEventsByTerm(input.value));
  });

  document.addEventListener('click', function (evt) {
    if (!box.contains(evt.target) && !dropdown.contains(evt.target)) {
      box.classList.remove('focused');
      dropdown.classList.remove('open');
    }
  });
}

function renderIdleState() {
  document.getElementById('pageContent').innerHTML = `
    <div class="dd-empty">Busca y selecciona un evento para editarlo.</div>
  `;
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

  var nombre = (document.getElementById('ev-name')?.value ?? '').trim();
  check('field-nombre', 'ev-name', nombre.length > 0 && nombre.length <= 150,
    'El nombre es obligatorio (máx. 150 caracteres).');

  var fecha = document.getElementById('ev-date')?.value ?? '';
  if (!fecha) {
    check('field-fecha', 'ev-date', false, 'La fecha es obligatoria.');
  } else {
    var fechaEvento = new Date(fecha);
    check('field-fecha', 'ev-date',
      !isNaN(fechaEvento.getTime()),
      'La fecha ingresada no es válida.');
  }

  var valor = document.getElementById('ev-price')?.value ?? '';
  check('field-valor', 'ev-price',
    valor === '' || (!isNaN(valor) && Number(valor) >= 0),
    'Ingresa un valor numérico válido (≥ 0).');

  var desc = document.getElementById('ev-descripcion')?.value ?? '';
  check('field-descripcion', 'ev-descripcion', desc.length <= 1000,
    'La descripción no puede superar 1000 caracteres.');

  var imgUrl = (document.getElementById('ev-imagen')?.value ?? '').trim();
  if (imgUrl) {
    try { new URL(imgUrl); check('field-imagen', 'ev-imagen', true); }
    catch (e) { check('field-imagen', 'ev-imagen', false, 'Ingresa una URL válida.'); }
  }

  return ok;
}

async function loadCategories(selectedId) {
  try {
    var cats = await api.get('/categories');
    var sel  = document.getElementById('ev-category');
    if (!sel) return;
    sel.innerHTML = '<option value="">Sin categoría</option>';
    cats.forEach(function (c) {
      var opt = document.createElement('option');
      opt.value       = c.id;
      opt.textContent = c.nombre;
      if (String(c.id) === String(selectedId)) opt.selected = true;
      sel.appendChild(opt);
    });
  } catch (e) {
    console.error('Error cargando categorías:', e);
  }
}

function toLocalDatetime(isoString) {
  if (!isoString) return '';
  var d   = new Date(isoString);
  var pad = function (n) { return String(n).padStart(2, '0'); };
  return d.getFullYear() + '-' +
    pad(d.getMonth() + 1) + '-' +
    pad(d.getDate()) + 'T' +
    pad(d.getHours()) + ':' +
    pad(d.getMinutes());
}

function renderForm(ev) {
  var container = document.getElementById('pageContent');
  container.innerHTML = `
    <form id="eventForm" novalidate>
      <div class="form-card">

        <div class="section-title">Información básica</div>

        <div class="form-grid">

          <div class="field full" id="field-nombre">
            <label>Nombre del evento <span class="req">*</span></label>
            <input type="text" id="ev-name" maxlength="150" value="${escHtml(ev.nombre || '')}">
            <span class="err-msg">El nombre es obligatorio (máx. 150 caracteres).</span>
          </div>

          <div class="field" id="field-categoria">
            <label>Categoría</label>
            <div class="select-wrap">
              <select id="ev-category">
                <option value="">Cargando categorías…</option>
              </select>
            </div>
          </div>

          <div class="field" id="field-fecha">
            <label>Fecha y hora <span class="req">*</span></label>
            <input type="datetime-local" id="ev-date" value="${toLocalDatetime(ev.fecha)}">
            <span class="err-msg">La fecha es obligatoria.</span>
          </div>

          <div class="field full" id="field-valor">
            <label>Valor de entrada</label>
            <input type="number" id="ev-price" min="0" step="100"
              placeholder="0  (dejar vacío = gratis)"
              value="${ev.valor != null ? ev.valor : ''}">
            <span class="err-msg">Ingresa un valor numérico válido (≥ 0).</span>
          </div>

          <div class="field full" id="field-descripcion">
            <label>Descripción</label>
            <textarea id="ev-descripcion" placeholder="Describe brevemente el evento…">${escHtml(ev.descripcion === 'Sin descripción' ? '' : (ev.descripcion || ''))}</textarea>
            <span class="err-msg">La descripción no puede superar 1000 caracteres.</span>
          </div>

        </div>

        <hr class="divider">

        <div class="section-title">Imagen y estado</div>

        <div class="form-grid">

          <div class="field" id="field-imagen">
            <label>URL de imagen promocional</label>
            <input type="url" id="ev-imagen"
              placeholder="https://ejemplo.com/imagen.jpg"
              oninput="previewImg(this.value)"
              value="${escHtml(ev.imagen_url || '')}">
            <span class="err-msg">Ingresa una URL válida.</span>
            <div class="img-preview" id="imgBox">
              <img id="imgTag" src="" alt="">
              <div class="img-placeholder" id="imgHolder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                Vista previa
              </div>
            </div>
          </div>

          <div class="field" id="field-activo">
            <label>Estado</label>
            <div class="toggle-row">
              <div class="toggle-label-text">
                <strong>Evento activo</strong>
              </div>
              <label class="switch">
                <input type="checkbox" id="ev-activo" ${ev.activo !== false ? 'checked' : ''}>
                <span class="switch-track"></span>
              </label>
            </div>
          </div>

        </div>

        <hr class="divider">

        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="history.back()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            Cancelar
          </button>
          <button type="submit" class="btn btn-primary" id="submitBtn">
            <div class="spinner"></div>
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Guardar cambios</span>
          </button>
        </div>

      </div>
    </form>`;

  loadCategories(ev.categoria_id);

  if (ev.imagen_url) previewImg(ev.imagen_url);

  document.getElementById('eventForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!validate()) {
      showToast('Corrige los errores antes de continuar.', 'error');
      return;
    }
    var btn = document.getElementById('submitBtn');
    btn.classList.add('loading');
    try {
      await api.put('/events/' + currentEventId, {
        nombre:      document.getElementById('ev-name').value.trim(),
        categoria_id: document.getElementById('ev-category').value || null,
        fecha:       document.getElementById('ev-date').value,
        valor:       document.getElementById('ev-price').value !== ''
                       ? parseFloat(document.getElementById('ev-price').value)
                       : null,
        descripcion: document.getElementById('ev-descripcion').value.trim() || 'Sin descripción',
        imagen_url:  document.getElementById('ev-imagen').value.trim() || null,
        activo:      document.getElementById('ev-activo').checked,
      });
      showToast('Evento actualizado');
    } catch (err) {
      showToast('Error al guardar los cambios.', 'error');
      console.error(err);
    } finally {
      btn.classList.remove('loading');
    }
  });

  document.querySelectorAll('input, select, textarea').forEach(function (el) {
    el.addEventListener('input', function () {
      var f = this.closest('.field');
      if (f) { f.classList.remove('has-error'); this.classList.remove('invalid'); }
    });
  });
}

function renderError(msg) {
  document.getElementById('pageContent').innerHTML = `
    <div class="error-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p>${msg}</p>
      <a href="register.html" class="btn btn-ghost">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="19" y1="12" x2="5" y2="12"/>
          <polyline points="12 19 5 12 12 5"/>
        </svg>
        Volver a eventos
      </a>
    </div>`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function init() {
  try {
    allEvents = await api.get('/events');
    setupSearchUI();

    if (currentEventId) {
      await selectEventById(currentEventId, false);
      return;
    }

    renderIdleState();
  } catch (err) {
    console.error(err);
    renderError('No se pudieron cargar los eventos. Intenta nuevamente.');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}