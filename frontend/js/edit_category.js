import api from "./api.js";
import { Auth } from "./auth.js";

Auth.requireAdmin();

let ALL_CATS   = [];
let selectedId = null;

const searchInput    = document.getElementById('searchInput');
const searchDropdown = document.getElementById('searchDropdown');
const searchBox      = document.getElementById('searchBox');
const searchClear    = document.getElementById('searchClear');
const formSection    = document.getElementById('formSection');

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
  renderForm(cat);
}

window.selectCategory = selectCategory;

function clearSearch() {
  searchInput.value = '';
  searchClear.classList.remove('visible');
  selectedId = null;
  formSection.innerHTML = '';
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

function validate() {
  let ok = true;

  const field = document.getElementById('field-nombre');
  const input = document.getElementById('cat-nombre');
  if (!field || !input) return false;

  const err    = field.querySelector('.err-msg');
  const nombre = input.value.trim();
  const cond   = nombre.length > 0 && nombre.length <= 100;

  if (!cond) {
    field.classList.add('has-error');
    input.classList.add('invalid');
    if (err) err.textContent = 'El nombre es obligatorio y no puede superar 100 caracteres.';
    ok = false;
  } else {
    field.classList.remove('has-error');
    input.classList.remove('invalid');
  }

  return ok;
}

function renderForm(cat) {
  formSection.innerHTML = `
    <div class="selected-badge">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      ${escHtml(cat.nombre)}
    </div>

    <form id="editForm" novalidate>
      <div class="form-card">

        <div class="section-title">Información de la categoría</div>

        <div class="form-grid">

          <div class="field full" id="field-nombre">
            <label>Nombre de la categoría <span class="req">*</span></label>
            <input
              type="text"
              id="cat-nombre"
              maxlength="100"
              value="${escHtml(cat.nombre || '')}"
            >
            <span class="err-msg"></span>
          </div>

        </div>

        <hr class="divider">

        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="clearSearch()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            Cancelar
          </button>
          <button type="submit" class="btn btn-primary" id="submitBtn">
            <div class="spinner"></div>
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Sobrescribir categoría</span>
          </button>
        </div>

      </div>
    </form>`;

  formSection.classList.add('form-section-enter');

  document.getElementById('editForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (!validate()) {
      showToast('Corrige los errores antes de continuar.', 'error');
      return;
    }

    const btn = document.getElementById('submitBtn');
    btn.classList.add('loading');

    try {
      const data = { nombre: document.getElementById('cat-nombre').value.trim() };

      await api.put('/categories/' + selectedId, data);

      const idx = ALL_CATS.findIndex(c => c.id === selectedId);
      if (idx !== -1) ALL_CATS[idx].nombre = data.nombre;

      searchInput.value = data.nombre;
      showToast('Categoría actualizada correctamente');

    } catch (err) {
      if (err?.status === 409 || err?.message?.toLowerCase().includes('unique')) {
        const field = document.getElementById('field-nombre');
        const input = document.getElementById('cat-nombre');
        const errEl = field?.querySelector('.err-msg');
        field?.classList.add('has-error');
        input?.classList.add('invalid');
        if (errEl) errEl.textContent = 'Ya existe una categoría con ese nombre.';
        showToast('Nombre de categoría duplicado.', 'error');
      } else {
        showToast('Error al guardar los cambios.', 'error');
        console.error(err);
      }
    } finally {
      btn.classList.remove('loading');
    }
  });

  document.getElementById('cat-nombre').addEventListener('input', function () {
    const f = this.closest('.field');
    if (f) { f.classList.remove('has-error'); this.classList.remove('invalid'); }
  });
}

async function init() {
  await loadData();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}