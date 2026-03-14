import api from './api.js';
import { Auth } from './auth.js';

// ── Estado ───────────────────────────────────────────
let allPopularity = [];
let filtered      = [];
let currentPage   = 1;
const PAGE_SIZE   = 8;

// ── Utilidades ───────────────────────────────────────
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.classList.remove('show', 'error');
  if (isError) t.classList.add('error');
  document.getElementById('toastMsg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

// ── Carga principal ──────────────────────────────────
async function loadPopularityReport() {
  try {
    const data = await api.get('/events/reports/popularity', Auth.authOptions());

    allPopularity = Array.isArray(data?.events) ? data.events : [];
    applyFilters();
    buildStats();
  } catch (err) {
    console.error(err);
    showToast('No se pudieron cargar los datos del reporte.', true);
    document.getElementById('fullBody').innerHTML = `<tr><td colspan="3"><div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg><p>Error al conectar con el servidor</p></div></td></tr>`;
  }
}

// ── Tarjetas de estadísticas ──────────────────────────
function buildStats() {
  const top = allPopularity[0];
  document.getElementById('statTop').textContent      = top && Number(top.saved_count) > 0 ? top.event_name : '—';
  document.getElementById('statTopCount').textContent = top && Number(top.saved_count) > 0
    ? `${top.saved_count} guardado${top.saved_count != 1 ? 's' : ''}` : '';
}

// ── Tabla completa + paginación ───────────────────────
function applyFilters() {
  filtered    = [...allPopularity];
  currentPage = 1;
  renderFullTable();
}

function renderFullTable() {
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total/PAGE_SIZE));
  const start = (currentPage-1)*PAGE_SIZE;
  const slice = filtered.slice(start, start+PAGE_SIZE);

  document.getElementById('totalCount').textContent =
    `${total} evento${total!==1?'s':''}`;
  document.getElementById('pageInfo').textContent =
    total ? `Mostrando ${start+1}–${Math.min(start+PAGE_SIZE,total)} de ${total}` : '0 eventos';

  const tbody = document.getElementById('fullBody');
  const maxCount = Number(allPopularity[0]?.saved_count) || 1;

  if (!slice.length) {
    tbody.innerHTML = `<tr><td colspan="3"><div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg><p>Sin resultados para la búsqueda</p></div></td></tr>`;
  } else {
    tbody.innerHTML = slice.map(e => {
      const cnt = Number(e.saved_count);
      return `
        <tr>
          <td class="name" title="${e.event_name}">${e.event_name}</td>
          <td><span class="cat-tag">${e.category_name}</span></td>
          <td>
            <div class="bar-wrap">
              <div class="bar-bg"><div class="bar-fill" style="width:${Math.round(cnt/maxCount*100)}%"></div></div>
              <span class="count-pill">${cnt}</span>
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  // Botones de paginación
  const pb = document.getElementById('pageBtns');
  pb.innerHTML = '';

  const mkBtn = (label, page, extra='') => {
    const b = document.createElement('button');
    b.className = `page-btn${extra}`;
    b.textContent = label;
    if (page === null) b.disabled = true;
    else b.onclick = () => { currentPage = page; renderFullTable(); };
    return b;
  };

  pb.appendChild(mkBtn('←', currentPage>1 ? currentPage-1 : null));

  const range = [];
  for (let p=1; p<=pages; p++) {
    if (p===1||p===pages||Math.abs(p-currentPage)<=1) range.push(p);
    else if (range[range.length-1]!=='…') range.push('…');
  }
  range.forEach(p => {
    if (p==='…') pb.appendChild(mkBtn('…', null));
    else pb.appendChild(mkBtn(p, p, p===currentPage?' current':''));
  });

  pb.appendChild(mkBtn('→', currentPage<pages ? currentPage+1 : null));
}

// ── Event listeners ──────────────────────────────────
document.getElementById('refreshBtn').addEventListener('click', () => {
  showToast('Actualizando datos…');
  loadPopularityReport();
});

// ── Init ─────────────────────────────────────────────
if (!Auth.isLoggedIn()) {
  window.location.href = 'login.html';
} else {
  loadPopularityReport();
}