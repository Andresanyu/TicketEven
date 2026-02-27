import api from "./api.js";

const CATEGORY_COLORS = {
  'Música':  { bg: '#1a1a2e', emoji: '🎵' },
  'Teatro':  { bg: '#1e1a2e', emoji: '🎭' },
  'Deporte': { bg: '#1a2e1e', emoji: '⚽' },
  'Arte':    { bg: '#2e1a1a', emoji: '🎨' },
  'Tech':    { bg: '#1a2028', emoji: '💻' },
  'Comedia': { bg: '#2e2a1a', emoji: '😂' },
};

let ALL_EVENTS  = [];
let ALL_CATS    = [];
let selectedId  = null;

const searchInput    = document.getElementById('searchInput');
const searchDropdown = document.getElementById('searchDropdown');
const searchBox      = document.getElementById('searchBox');
const searchClear    = document.getElementById('searchClear');
const actionSection  = document.getElementById('actionSection');

function showToast(msg, type) {
  const t = document.getElementById('toast');
  if (!t) return;
  document.getElementById('toastMsg').textContent = msg;
  t.className = 'toast' + (type === 'error' ? ' error' : '');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  if (!iso) return 'Sin fecha';
  return new Date(iso).toLocaleDateString('es-CO', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

async function loadData() {
  try {
    const [events, cats] = await Promise.all([
      api.get('/events'),
      api.get('/categories'),
    ]);
    ALL_EVENTS = events;
    ALL_CATS   = cats;
  } catch (e) {
    console.error('Error cargando datos:', e);
    showToast('Error al conectar con el servidor.', 'error');
  }
}

function openDropdown()  { searchDropdown.classList.add('open'); }
function closeDropdown() { searchDropdown.classList.remove('open'); }

function renderDropdown(query) {
  const q = query.trim().toLowerCase();
  const matches = q
    ? ALL_EVENTS.filter(e => (e.nombre || '').toLowerCase().includes(q))
    : ALL_EVENTS;

  if (!matches.length) {
    searchDropdown.innerHTML = `<div class="dd-empty">No se encontraron eventos.</div>`;
    openDropdown();
    return;
  }

  searchDropdown.innerHTML = matches.slice(0, 8).map(ev => {
    const cat     = ALL_CATS.find(c => c.id === ev.categoria_id);
    const catName = ev.categoria || cat?.nombre || 'Sin categoría';
    const price   = ev.valor ? `$${Number(ev.valor).toLocaleString('es-CO')}` : 'Gratis';
    const isFree  = !ev.valor;
    const isSel   = ev.id === selectedId;

    return `
      <div class="dd-event-item ${isSel ? 'selected' : ''}" onclick="selectEvent(${ev.id})">
        <div class="dd-event-left">
          <div class="dd-event-name">${escHtml(ev.nombre)}</div>
          <div class="dd-event-meta">
            <span class="dd-event-cat">${escHtml(catName)}</span>
            &middot;
            ${formatDate(ev.fecha)}
          </div>
        </div>
        <div class="dd-event-right ${isFree ? 'free' : ''}">${isFree ? '✦ GRATIS' : price}</div>
      </div>`;
  }).join('');

  openDropdown();
}

function selectEvent(id) {
  const ev = ALL_EVENTS.find(e => e.id === id);
  if (!ev) return;
  selectedId = id;

  searchInput.value = ev.nombre;
  searchClear.classList.add('visible');
  closeDropdown();
  renderActionCard(ev);
}

window.selectEvent = selectEvent;

function clearSearch() {
  searchInput.value = '';
  searchClear.classList.remove('visible');
  selectedId = null;
  actionSection.innerHTML = '';
  closeDropdown();
  searchInput.focus();
}

window.clearSearch = clearSearch;

searchInput.addEventListener('focus', () => {
  searchBox.classList.add('focused');
  renderDropdown(searchInput.value);
});

searchInput.addEventListener('blur', () => {
  searchBox.classList.remove('focused');
  setTimeout(closeDropdown, 150);
});

searchInput.addEventListener('input', () => {
  const val = searchInput.value;
  searchClear.classList.toggle('visible', val.length > 0);
  renderDropdown(val);
});

function renderActionCard(ev) {
  const cat       = ALL_CATS.find(c => c.id === ev.categoria_id);
  const catName   = ev.categoria || cat?.nombre || 'Sin categoría';
  const info      = CATEGORY_COLORS[catName] || { bg: '#1a1c19', emoji: '🎪' };
  const isActive  = ev.activo !== false;
  const price     = ev.valor ? `$${Number(ev.valor).toLocaleString('es-CO')}` : 'Gratis';

  const statusClass = isActive ? 'active'   : 'inactive';
  const statusText  = isActive ? 'Activo'   : 'Inactivo';

  const warningHtml = isActive
    ? `<div class="warning-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <p>Al inactivar este evento <strong>dejará de mostrarse</strong> en la plataforma. Puedes reactivarlo en cualquier momento.</p>
      </div>`
    : `<div class="warning-box info">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p>Este evento está actualmente <strong>inactivo</strong>. Puedes reactivarlo para que vuelva a mostrarse en la plataforma.</p>
      </div>`;

  const actionBtnHtml = isActive
    ? `<button class="btn btn-inactivar" id="toggleBtn" onclick="toggleActive()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 12H3"/>
          <circle cx="19" cy="12" r="3"/>
        </svg>
        Inactivar evento
      </button>`
    : `<button class="btn btn-activar" id="toggleBtn" onclick="toggleActive()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M7 12h14"/>
          <circle cx="5" cy="12" r="3"/>
        </svg>
        Activar evento
      </button>`;

  actionSection.innerHTML = `
    <div class="action-card">

      <div class="event-preview">
        <div class="event-preview-icon" style="background:${info.bg};">
          ${info.emoji}
        </div>
        <div class="event-preview-info">
          <div class="event-preview-name">${escHtml(ev.nombre)}</div>
          <div class="event-preview-meta">
            <span class="event-preview-cat">${escHtml(catName)}</span>
            &middot;
            ${formatDate(ev.fecha)}
            &middot;
            ${price}
          </div>
        </div>
        <span class="status-pill ${statusClass}">${statusText}</span>
      </div>

      <hr class="action-divider">

      ${warningHtml}

      <div class="action-buttons">
        <button class="btn btn-ghost" onclick="clearSearch()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          Cancelar
        </button>
        ${actionBtnHtml}
      </div>

    </div>`;
}

async function toggleActive() {
  const ev = ALL_EVENTS.find(e => e.id === selectedId);
  if (!ev) return;

  const btn = document.getElementById('toggleBtn');
  if (btn) btn.disabled = true;

  const newState = ev.activo === false ? true : false;

  try {
    await api.patch('/events/' + selectedId, { activo: newState });
    ev.activo = newState;
    showToast(newState ? 'Evento activado correctamente' : 'Evento inactivado correctamente');
    renderActionCard(ev);
  } catch (err) {
    console.error(err);
    showToast('Error al cambiar el estado del evento.', 'error');
    if (btn) btn.disabled = false;
  }
}

window.toggleActive = toggleActive;

async function init() {
  await loadData();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}