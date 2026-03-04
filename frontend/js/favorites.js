import api from "./api.js";
import { Auth } from "./auth.js";

Auth.requireAdmin();

let ALL_FAVS = [];

const favList      = document.getElementById('favList');
const counter      = document.getElementById('counter');
const stateLoading = document.getElementById('stateLoading');
const stateEmpty   = document.getElementById('stateEmpty');

// ── Toast ────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  document.getElementById('toastMsg').textContent = msg;
  t.className = 'toast' + (type === 'error' ? ' error' : '');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}

// ── Helpers ──────────────────────────────────────────────────
function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatValor(valor) {
  if (!valor || Number(valor) === 0) return 'Gratis';
  return `$${Number(valor).toLocaleString('es-CO')}`;
}

// ── Render ───────────────────────────────────────────────────
function renderList(list) {
  stateLoading.classList.add('hidden');

  if (!list.length) {
    stateEmpty.classList.remove('hidden');
    counter.innerHTML = '<strong>0</strong> favoritos';
    return;
  }

  stateEmpty.classList.add('hidden');
  counter.innerHTML = `<strong>${list.length}</strong> favorito${list.length !== 1 ? 's' : ''}`;

  favList.innerHTML = list.map(fav => {
    // Mapeo directo a los campos reales del endpoint
    const id    = fav.favorito_id;
    const name  = escHtml(fav.evento_nombre  ?? 'Sin nombre');
    const user  = escHtml(fav.usuario_nombre ?? '');
    const email = escHtml(fav.usuario_email  ?? '');
    const date  = formatDate(fav.evento_fecha ?? fav.fecha_agregado);
    const valor = formatValor(fav.evento_valor);

    return `
      <div class="fav-row" data-id="${id}">
        <div class="fav-row-thumb">🗓️</div>
        <div class="fav-row-info">
          <div class="fav-row-name">${name}</div>
          <div class="fav-row-meta">
            <span class="fav-badge">${valor}</span>
            <span class="fav-row-date">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              ${user}
            </span>
            <span class="fav-row-date">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8"  y1="2" x2="8"  y2="6"/>
                <line x1="3"  y1="10" x2="21" y2="10"/>
              </svg>
              ${date ?? '—'}
            </span>
          </div>
        </div>
        <div class="fav-row-email">${email}</div>
      </div>`;
  }).join('');
}

// ── Init ─────────────────────────────────────────────────────
async function init() {
  try {
    ALL_FAVS = await api.get('/users/favorites/all', Auth.authOptions());
    renderList(ALL_FAVS);
  } catch (err) {
    console.error('Error cargando favoritos:', err);
    stateLoading.classList.add('hidden');
    if (err?.status === 401 || err?.message?.includes('401')) {
      Auth.logout();
    } else {
      showToast('Error al cargar los favoritos.', 'error');
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}