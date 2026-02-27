import api from "./api.js";

let ALL_CATS   = [];
let selectedId = null;

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

async function loadData() {
  try {
    ALL_CATS = await api.get('/categories');
  } catch (e) {
    console.error('Error cargando categorías:', e);
    showToast('Error al conectar con el servidor.', 'error');
  }
}

function openDropdown()  { searchDropdown.classList.add('open'); }
function closeDropdown() { searchDropdown.classList.remove('open'); }

function renderDropdown(query) {
  const q = query.trim().toLowerCase();
  const matches = q
    ? ALL_CATS.filter(c => (c.nombre || '').toLowerCase().includes(q))
    : ALL_CATS;

  if (!matches.length) {
    searchDropdown.innerHTML = `<div class="dd-empty">No se encontraron categorías.</div>`;
    openDropdown();
    return;
  }

  searchDropdown.innerHTML = matches.slice(0, 8).map(cat => {
    const isSel = cat.id === selectedId;
    return `
      <div class="dd-event-item ${isSel ? 'selected' : ''}" onclick="selectCategory(${cat.id})">
        <div class="dd-event-left">
          <div class="dd-event-name">${escHtml(cat.nombre)}</div>
        </div>
      </div>`;
  }).join('');

  openDropdown();
}

function selectCategory(id) {
  const cat = ALL_CATS.find(c => c.id === id);
  if (!cat) return;
  selectedId = id;

  searchInput.value = cat.nombre;
  searchClear.classList.add('visible');
  closeDropdown();
  renderActionCard(cat);
}

window.selectCategory = selectCategory;

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

function renderActionCard(cat) {
  actionSection.innerHTML = `
    <div class="action-card">

      <div class="event-preview">
        <div class="event-preview-icon" style="background:#1a1c19; font-size:20px;">
          🗂️
        </div>
        <div class="event-preview-info">
          <div class="event-preview-name">${escHtml(cat.nombre)}</div>
          <div class="event-preview-meta">
            Los eventos asociados quedarán sin categoría asignada.
          </div>
        </div>
      </div>

      <hr class="action-divider">

      <div class="warning-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <p>Esta acción es <strong>permanente</strong>. Al eliminar la categoría <strong>"${escHtml(cat.nombre)}"</strong>, los eventos que la tengan asignada quedarán sin categoría (<code>NULL</code>).</p>
      </div>

      <div class="action-buttons">
        <button class="btn btn-ghost" onclick="clearSearch()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          Cancelar
        </button>
        <button class="btn btn-inactivar" id="deleteBtn" onclick="deleteCategory()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6"/>
            <path d="M14 11v6"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
          Eliminar categoría
        </button>
      </div>

    </div>`;
}

async function deleteCategory() {
  const cat = ALL_CATS.find(c => c.id === selectedId);
  if (!cat) return;

  const btn = document.getElementById('deleteBtn');
  if (btn) btn.disabled = true;

  try {
    await api.delete('/categories/' + selectedId);

    ALL_CATS = ALL_CATS.filter(c => c.id !== selectedId);
    showToast(`Categoría "${cat.nombre}" eliminada correctamente`);
    clearSearch();
  } catch (err) {
    console.error(err);
    showToast('Error al eliminar la categoría.', 'error');
    if (btn) btn.disabled = false;
  }
}

window.deleteCategory = deleteCategory;

async function init() {
  await loadData();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}