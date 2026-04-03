import api from "./api.js";
import { Auth } from "./auth.js";

const CATEGORY_COLORS = {
  'Música':  { bg: '#1a1a2e', emoji: '🎵' },
  'Teatro':  { bg: '#1e1a2e', emoji: '🎭' },
  'Deporte': { bg: '#1a2e1e', emoji: '⚽' },
  'Arte':    { bg: '#2e1a1a', emoji: '🎨' },
  'Tech':    { bg: '#1a2028', emoji: '💻' },
  'Comedia': { bg: '#2e2a1a', emoji: '😂' },
};

let ALL_EVENTS  = [];
let BASE_EVENTS = [];

const PAGE_SIZE = 10;
let currentFilter = 'Todos';
let page     = 0;
let filtered = [];

const SORT_FNS = {
  default: null,
  date: (a, b) => {
    const now = Date.now();
    return Math.abs(a._ts - now) - Math.abs(b._ts - now);
  },
  alpha: (a, b) =>
    (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase(), 'es'),
  category: (a, b) => {
    const byCategory = (a.category || '').toLowerCase().localeCompare((b.category || '').toLowerCase(), 'es');
    if (byCategory !== 0) return byCategory;
    return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase(), 'es');
  },
};

const SORT_LABELS = {
  default:  'Ordenar',
  date:     'Por fecha',
  alpha:    'A → Z',
  category: 'Por categoría',
};

function getUserDataFromToken() {
  const payload = Auth.getPayload();
  if (!payload) return null;

  const name = payload.nombre || payload.name || payload.username || payload.user_name || payload.sub || "Usuario";
  const email = payload.email || payload.mail || "Sin correo";
  return { name, email };
}

function initializeAuthHeader() {
  const loginBtn = document.getElementById("loginBtn");
  const userBtn = document.getElementById("userBtn");
  const userName = document.getElementById("userName");
  const userInitial = document.getElementById("userInitial");
  const udName = document.getElementById("udName");
  const udEmail = document.getElementById("udEmail");
  const logoutBtn = document.getElementById("logoutBtn");

  if (!loginBtn || !userBtn) return;

  const loggedIn = Auth.isLoggedIn();

  loginBtn.hidden = loggedIn;
  loginBtn.style.display = loggedIn ? "none" : "inline-flex";

  userBtn.hidden = !loggedIn;
  userBtn.style.display = loggedIn ? "inline-flex" : "none";

  if (!loggedIn) return;

  const user = getUserDataFromToken() || { name: "Usuario", email: "Sin correo" };
  const initial = user.name.trim().charAt(0).toUpperCase() || "U";

  if (userName) userName.textContent = user.name;
  if (userInitial) userInitial.textContent = initial;
  if (udName) udName.textContent = user.name;
  if (udEmail) udEmail.textContent = user.email;

  userBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    userBtn.classList.toggle("open");
  });

  document.addEventListener("click", (event) => {
    if (!userBtn.contains(event.target)) {
      userBtn.classList.remove("open");
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      Auth.logout();
    });
  }
}

export async function loadEvents() {
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

export function toggleSort() {
  const btn  = document.getElementById('sortBtn');
  const drop = document.getElementById('sortDrop');
  if (!btn || !drop) return;
  const open = drop.classList.toggle('open');
  btn.classList.toggle('open', open);
}

document.addEventListener('click', e => {
  const wrap = document.getElementById('sortWrap');
  const drop = document.getElementById('sortDrop');
  const btn  = document.getElementById('sortBtn');
  if (wrap && !wrap.contains(e.target) && drop && btn) {
    drop.classList.remove('open');
    btn.classList.remove('open');
  }
});

export function applySort(type) {
  ['default', 'date', 'alpha', 'category'].forEach(id => {
    const opt = document.getElementById('opt-' + id);
    if (opt) opt.classList.toggle('active', id === type);
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

export function _applySort(type) {
  const fn = SORT_FNS[type] || null;
  BASE_EVENTS = fn ? ALL_EVENTS.slice().sort(fn) : ALL_EVENTS.slice();
  page = 0;
  const grid = document.getElementById('grid');
  if (grid) grid.innerHTML = '';
  filtered = getFiltered();
  loadMore();
}

export function filterCategory(cat, btn) {
  currentFilter = cat;
  page = 0;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
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

function buildCard(ev, idx) {
  const info     = CATEGORY_COLORS[ev.category] || { bg: '#1a1c19', emoji: '🎪' };
  const isGratis = ev.price === 'Gratis';
  const delay    = (idx % PAGE_SIZE) * 40;
  const detailHref = `event_card.html?id=${encodeURIComponent(ev.id)}`;

  return `
    <a class="event-card" href="${detailHref}" style="animation-delay:${delay}ms" aria-label="Ver detalle de ${ev.name}">
      <div class="card-img-placeholder" style="background:${info.bg};">
        <span style="font-size:32px;z-index:1;position:relative">${info.emoji}</span>
        <div style="position:absolute;inset:0;background:radial-gradient(circle at 30% 40%,rgba(198,241,53,.08) 0%,transparent 70%)"></div>
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

export function loadMore() {
  filtered = getFiltered();
  const start = page * PAGE_SIZE;
  const chunk = filtered.slice(start, start + PAGE_SIZE);

  const grid = document.getElementById('grid');
  if (grid) chunk.forEach((ev, i) => grid.insertAdjacentHTML('beforeend', buildCard(ev, i)));

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
  document.addEventListener('DOMContentLoaded', () => {
    initializeAuthHeader();
    loadEvents();
  });
} else {
  initializeAuthHeader();
  loadEvents();
}