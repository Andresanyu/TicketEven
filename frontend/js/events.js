import api from "./api.js";

const CATEGORY_COLORS = {
  'Música':   { bg: '#1a1a2e', emoji: '🎵' },
  'Teatro':   { bg: '#1e1a2e', emoji: '🎭' },
  'Deporte':  { bg: '#1a2e1e', emoji: '⚽' },
  'Arte':     { bg: '#2e1a1a', emoji: '🎨' },
  'Tech':     { bg: '#1a2028', emoji: '💻' },
  'Comedia':  { bg: '#2e2a1a', emoji: '😂' },
};

let ALL_EVENTS  = [];
let BASE_EVENTS = [];

const PAGE_SIZE = 10;
let currentFilter = 'Todos';
let page = 0;
let filtered = [];

async function loadEvents() {
  try {
    const events = await api.get("/events");

    ALL_EVENTS = events
      .filter(e => e.activo !== false)
      .map((ev, idx) => ({
        _idx: idx,
        _ts:  ev.fecha ? new Date(ev.fecha).getTime() : 0,
        id:   ev.id,
        name: ev.nombre,
        date: ev.fecha
          ? new Date(ev.fecha).toLocaleDateString("es-CO", { year: 'numeric', month: 'short', day: 'numeric' })
          : 'Sin fecha',
        price:       ev.valor ? `$${Number(ev.valor).toLocaleString("es-CO")}` : 'Gratis',
        category:    ev.categoria || 'Sin categoría',
        descripcion: ev.descripcion,
        image_url:   ev.imagen_url,
      }));

    BASE_EVENTS   = ALL_EVENTS.slice();
    currentFilter = 'Todos';
    page          = 0;

    const grid = document.getElementById('grid');
    if (grid) grid.innerHTML = '';

    filtered = getFiltered();
    loadMore();

  } catch (err) {
    console.error("Error cargando eventos:", err);
    const badge = document.getElementById('countBadge');
    if (badge) badge.textContent = 'Error al cargar eventos';
  }
}

const SORT_FNS = {
  default: null,

  date: (a, b) => {
    const now = Date.now();
    return Math.abs(a._ts - now) - Math.abs(b._ts - now);
  },

  alpha: (a, b) =>
    (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase(), 'es'),
};

const SORT_LABELS = {
  default: 'Ordenar',
  date: 'Por fecha',
  alpha: 'A → Z',
};

function toggleSort() {
  const btn = document.getElementById('sortBtn');
  const drop = document.getElementById('sortDrop');
  if (!btn || !drop) return;
  const open = drop.classList.toggle('open');
  btn.classList.toggle('open', open);
}

document.addEventListener('click', function(e) {
  const wrap = document.getElementById('sortWrap');
  const drop = document.getElementById('sortDrop');
  const btn = document.getElementById('sortBtn');
  if (wrap && !wrap.contains(e.target) && drop && btn) {
    drop.classList.remove('open');
    btn.classList.remove('open');
  }
});

function applySort(type) {
  ['default', 'date', 'alpha'].forEach(function(id) {
    const option = document.getElementById('opt-' + id);
    if (option) option.classList.toggle('active', id === type);
  });

  const label = document.getElementById('sortLabel');
  if (label) label.textContent = SORT_LABELS[type] || SORT_LABELS.default;

  const sortBtn = document.getElementById('sortBtn');
  if (sortBtn) {
    sortBtn.classList.toggle('has-filter', type !== 'default');
    sortBtn.classList.remove('open');
  }

  const drop = document.getElementById('sortDrop');
  if (drop) drop.classList.remove('open');

  _applySort(type);
}

function _applySort(type) {
  const fn = SORT_FNS[type] || null;

  BASE_EVENTS = fn
    ? ALL_EVENTS.slice().sort(fn)
    : ALL_EVENTS.slice();

  page = 0;
  const grid = document.getElementById('grid');
  if (grid) grid.innerHTML = '';
  filtered = getFiltered();
  loadMore();
}

function getFiltered() {
  return currentFilter === 'Todos'
    ? BASE_EVENTS
    : BASE_EVENTS.filter(e => e.category === currentFilter);
}

function filterCategory(cat, btn) {
  currentFilter = cat;
  page = 0;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const grid = document.getElementById('grid');
  if (grid) grid.innerHTML = '';
  filtered = getFiltered();
  loadMore();
}

function buildCard(ev, idx) {
  const info    = CATEGORY_COLORS[ev.category] || { bg: '#1a1c19', emoji: '🎪' };
  const isGratis = ev.price === 'Gratis';
  const delay   = (idx % PAGE_SIZE) * 40;
  const detailHref = `event_card.html?id=${encodeURIComponent(ev.id)}`;

  return `
    <a class="event-card" href="${detailHref}" style="animation-delay:${delay}ms" aria-label="Ver detalle de ${ev.name}">
      <div class="card-img-placeholder" style="background:${info.bg};">
        <span style="font-size:32px;z-index:1;position:relative">${info.emoji}</span>
        <div style="position:absolute;inset:0;background:radial-gradient(circle at 30% 40%, rgba(198,241,53,.08) 0%, transparent 70%)"></div>
      </div>
      <div class="card-body">
        <div class="card-category">${ev.category}</div>
        <div class="card-name">${ev.name}</div>
        <div class="card-meta">
          <div class="card-date">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            ${ev.date}
          </div>
          <div class="card-price ${isGratis ? 'free' : ''}">${isGratis ? '✦ GRATIS' : ev.price}</div>
        </div>
      </div>
    </a>`;
}

function loadMore() {
  filtered = getFiltered();
  const start = page * PAGE_SIZE;
  const chunk = filtered.slice(start, start + PAGE_SIZE);

  const grid = document.getElementById('grid');
  if (grid) {
    chunk.forEach((ev, i) => {
      grid.insertAdjacentHTML('beforeend', buildCard(ev, i));
    });
  }

  page++;
  const shown = Math.min(page * PAGE_SIZE, filtered.length);
  const total = filtered.length;

  const badge = document.getElementById('countBadge');
  if (badge) badge.textContent = `Mostrando ${shown} de ${total} eventos`;

  const btn = document.getElementById('loadMoreBtn');
  if (btn) {
    btn.disabled = shown >= total;
    btn.querySelectorAll('span')[0].textContent =
      btn.disabled ? 'Sin más eventos' : 'Visualizar más';
  }
}

window.loadEvents     = loadEvents;
window.filterCategory = filterCategory;
window.loadMore       = loadMore;
window._applySort     = _applySort;
window.toggleSort     = toggleSort;
window.applySort      = applySort;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadEvents);
} else {
  loadEvents();
}

let editingEventId = null;

async function loadCategoryOptions() {
  var select = document.getElementById('ev-category');
  if (!select) return;

  try {
    var categories = await api.get('/categories');
    select.innerHTML = '';

    if (!Array.isArray(categories) || categories.length === 0) {
      select.innerHTML = '<option value="">Sin categorías disponibles</option>';
      return;
    }

    categories.forEach(function(category) {
      var option = document.createElement('option');
      option.value = String(category.id);
      option.textContent = category.nombre;
      select.appendChild(option);
    });
  } catch (err) {
    console.error('Error cargando categorías:', err);
    select.innerHTML = '<option value="">No se pudieron cargar</option>';
    showToast('No se pudieron cargar las categorías.', 'error');
  }
}

function showToast(msg, type) {
  var t = document.getElementById('toast');
  if (!t) return;
  document.getElementById('toastMsg').textContent = msg;
  t.className = 'toast' + (type === 'error' ? ' error' : '');
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 3000);
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
  tmp.onload = function() {
    img.src = url;
    img.classList.add('show');
    box.classList.add('loaded');
    holder.style.display = 'none';
  };
  tmp.onerror = function() {
    img.classList.remove('show');
    box.classList.remove('loaded');
    holder.style.display = 'flex';
  };
  tmp.src = url;
}

window.previewImg = previewImg;

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

  var nombre = document.getElementById('ev-name').value.trim();
  check('field-nombre', 'ev-name', nombre.length > 0 && nombre.length <= 150,
    'El nombre es obligatorio (máx. 150 caracteres).');

  var fecha = document.getElementById('ev-date').value;
  if (!fecha) {
    check('field-fecha', 'ev-date', false, 'La fecha es obligatoria.');
  } else {
    var fechaEvento = new Date(fecha);
    var ahora = new Date();
    check('field-fecha', 'ev-date',
      !isNaN(fechaEvento.getTime()) && fechaEvento > ahora,
      'La fecha debe ser después de la fecha actual.');
  }

  var valor = document.getElementById('ev-price').value;
  check('field-valor', 'ev-price',
    valor === '' || (!isNaN(valor) && Number(valor) >= 0),
    'Ingresa un valor numérico válido (≥ 0).');

  var desc = document.getElementById('ev-descripcion').value;
  check('field-descripcion', 'ev-descripcion', desc.length <= 1000,
    'La descripción no puede superar 1000 caracteres.');

  var imgUrl = document.getElementById('ev-imagen').value.trim();
  if (imgUrl) {
    try { new URL(imgUrl); check('field-imagen', 'ev-imagen', true); }
    catch(e) { check('field-imagen', 'ev-imagen', false, 'Ingresa una URL válida.'); }
  }

  return ok;
}

async function saveEvent() {
  var categoryValue = document.getElementById('ev-category').value;

  var data = {
    nombre:      document.getElementById('ev-name').value.trim(),
    categoria_id: categoryValue === '' ? null : Number(categoryValue),
    fecha:       document.getElementById('ev-date').value,
    valor:       document.getElementById('ev-price').value !== ''
                   ? parseFloat(document.getElementById('ev-price').value)
                   : null,
    descripcion: document.getElementById('ev-descripcion').value.trim() || 'Sin descripción',
    imagen_url:  document.getElementById('ev-imagen').value.trim() || null,
    activo:      document.getElementById('ev-activo').checked,
  };

  await api.post('/events', data);
  showToast('Evento creado');

  closeEventModal();
  if (typeof loadEvents === 'function') loadEvents();
}

function closeEventModal() { console.log('closeEventModal()'); }

var formEl = document.getElementById('eventForm');
if (formEl) {
  formEl.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!validate()) {
      showToast('Corrige los errores antes de continuar.', 'error');
      return;
    }
    var btn = document.getElementById('submitBtn');
    btn.classList.add('loading');
    try {
      await saveEvent();
    } catch(err) {
      showToast('Error al guardar el evento.', 'error');
      console.error(err);
    } finally {
      btn.classList.remove('loading');
    }
  });

  document.querySelectorAll('input, select, textarea').forEach(function(el) {
    el.addEventListener('input', function() {
      var f = this.closest('.field');
      if (f) { f.classList.remove('has-error'); this.classList.remove('invalid'); }
    });
  });
}

function resetForm() {
  document.getElementById('eventForm')?.reset();
  document.querySelectorAll('.field').forEach(function(f) { f.classList.remove('has-error'); });
  document.querySelectorAll('.invalid').forEach(function(i) { i.classList.remove('invalid'); });
  previewImg('');
  editingEventId = null;
}

window.resetForm = resetForm;

function setMinEventDate() {
  var dateInput = document.getElementById('ev-date');
  if (!dateInput) return;
  var now = new Date();
  now.setSeconds(0, 0);
  var pad = function(n) { return String(n).padStart(2, '0'); };
  dateInput.min =
    now.getFullYear() + '-' +
    pad(now.getMonth() + 1) + '-' +
    pad(now.getDate()) + 'T' +
    pad(now.getHours()) + ':' +
    pad(now.getMinutes());
}

setMinEventDate();
loadCategoryOptions();