import api from './api.js';

// ── Estado ───────────────────────────────────────────
let allFavorites = [];
let filtered     = [];
let currentPage  = 1;
const PAGE_SIZE  = 8;
let activeFilter = 'all';
let searchQuery  = '';

// ── Utilidades ───────────────────────────────────────
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.classList.remove('show', 'error');
  if (isError) t.classList.add('error');
  document.getElementById('toastMsg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

const initials = (n = '') =>
  n.split(' ').slice(0,2).map(w => w[0]||'').join('').toUpperCase() || '?';

function fmtDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  return isNaN(d) ? str : d.toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' });
}

// Helpers para leer campos con distintos nombres de API
const evName  = f => f.eventName    || f.event_name    || f.event?.name    || f.event?.nombre    || 'Sin nombre';
const catName = f => f.categoryName || f.category_name || f.event?.category?.name
                  || f.event?.categoria?.nombre || 'General';
const usName  = f => f.userName     || f.user_name     || f.user?.name     || f.user?.nombre     || 'Usuario';
const usEmail = f => f.userEmail    || f.user_email    || f.user?.email    || '';
const usId    = f => f.userId       || f.user_id       || f.user?.id       || '';
const evId    = f => f.eventId      || f.event_id      || f.event?.id      || '';

// ── Carga principal ──────────────────────────────────
async function loadFavorites() {
  try {
    const data = await api.get('/users/favorites');

    allFavorites = Array.isArray(data) ? data
                 : Array.isArray(data?.data) ? data.data : [];

    applyFilters();
    buildStats();
    buildRankTable();
    buildBarChart();
  } catch (err) {
    console.error(err);
    showToast('No se pudieron cargar los favoritos.', true);
    const errHtml = `<tr><td colspan="4"><div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg><p>Error al conectar con el servidor</p></div></td></tr>`;
    document.getElementById('rankBody').innerHTML = errHtml;
    document.getElementById('fullBody').innerHTML = errHtml;
  }
}

// ── Tarjetas de estadísticas ──────────────────────────
function buildStats() {
  const total  = allFavorites.length;
  const events = new Set(allFavorites.map(evId)).size;
  const users  = new Set(allFavorites.map(usId)).size;

  const counts = {};
  allFavorites.forEach(f => { const n = evName(f); counts[n] = (counts[n]||0)+1; });
  const top = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];

  document.getElementById('statTotal').textContent  = total.toLocaleString('es-CO');
  document.getElementById('statEvents').textContent = events.toLocaleString('es-CO');
  document.getElementById('statUsers').textContent  = users.toLocaleString('es-CO');
  document.getElementById('statTop').textContent    = top ? top[0] : '—';
  document.getElementById('statTopCount').textContent = top
    ? `${top[1]} favorito${top[1]!==1?'s':''}` : '';
}

// ── Tabla de ranking ─────────────────────────────────
function buildRankTable() {
  const counts = {}, cats = {};
  allFavorites.forEach(f => {
    const n = evName(f);
    counts[n] = (counts[n]||0)+1;
    cats[n]   = catName(f);
  });

  let sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  if (activeFilter === 'top') sorted = sorted.slice(0,5);

  const tbody = document.getElementById('rankBody');
  if (!sorted.length) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/><path d="M8 15h8M9 9h.01M15 9h.01"/>
      </svg><p>No hay favoritos registrados</p></div></td></tr>`;
    return;
  }
  const max = sorted[0][1];
  tbody.innerHTML = sorted.map(([name, cnt], i) => `
    <tr>
      <td><span class="rank-num ${i<3?'top':''}">${i+1}</span></td>
      <td class="name" title="${name}">${name}</td>
      <td><span class="cat-tag">${cats[name]}</span></td>
      <td>
        <div class="bar-wrap">
          <div class="bar-bg"><div class="bar-fill" style="width:${Math.round(cnt/max*100)}%"></div></div>
          <span class="count-pill">${cnt}</span>
        </div>
      </td>
    </tr>`).join('');
}

// ── Gráfico de barras CSS ─────────────────────────────
function buildBarChart() {
  const counts = {};
  allFavorites.forEach(f => { const n = evName(f); counts[n]=(counts[n]||0)+1; });
  const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const max    = sorted[0]?.[1] || 1;
  const chart  = document.getElementById('barChart');

  if (!sorted.length) {
    chart.innerHTML = '<div style="color:var(--text-muted);font-size:12px;margin:auto;">Sin datos</div>';
    return;
  }
  chart.innerHTML = sorted.map(([name, cnt], i) => {
    const h     = Math.max(4, Math.round(cnt/max*90));
    const short = name.length > 8 ? name.slice(0,7)+'…' : name;
    return `
      <div class="bar-col">
        <div class="bar-col-fill ${i===0?'highlight':''}"
             style="height:${h}px" title="${name}: ${cnt} favoritos">
          <span class="bar-col-label">${short}</span>
        </div>
      </div>`;
  }).join('');
}

// ── Tabla completa + paginación ───────────────────────
function applyFilters() {
  let data = [...allFavorites];

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    data = data.filter(f =>
      evName(f).toLowerCase().includes(q) ||
      usName(f).toLowerCase().includes(q)
    );
  }

  if (activeFilter === 'top') {
    const counts = {};
    allFavorites.forEach(f => { const n=evName(f); counts[n]=(counts[n]||0)+1; });
    const top5 = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5).map(e=>e[0]);
    data = data.filter(f => top5.includes(evName(f)));
  }

  filtered    = data;
  currentPage = 1;
  renderFullTable();
}

function renderFullTable() {
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total/PAGE_SIZE));
  const start = (currentPage-1)*PAGE_SIZE;
  const slice = filtered.slice(start, start+PAGE_SIZE);

  document.getElementById('totalCount').textContent =
    `${total} registro${total!==1?'s':''}`;
  document.getElementById('pageInfo').textContent =
    total ? `Mostrando ${start+1}–${Math.min(start+PAGE_SIZE,total)} de ${total}` : '0 registros';

  const tbody = document.getElementById('fullBody');
  if (!slice.length) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg><p>Sin resultados para la búsqueda</p></div></td></tr>`;
  } else {
    tbody.innerHTML = slice.map(f => {
      const name  = evName(f);
      const cat   = catName(f);
      const uname = usName(f);
      const email = usEmail(f);
      const date  = fmtDate(f.createdAt||f.created_at||f.fecha||'');
      return `
        <tr>
          <td>
            <div class="user-cell">
              <div class="avatar">${initials(uname)}</div>
              <div>
                <div class="user-name">${uname}</div>
                ${email?`<div class="user-email">${email}</div>`:''}
              </div>
            </div>
          </td>
          <td class="name" title="${name}">${name}</td>
          <td><span class="cat-tag">${cat}</span></td>
          <td>${date}</td>
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

// ── Exportar CSV ─────────────────────────────────────
function exportCSV() {
  if (!allFavorites.length) { showToast('No hay datos para exportar.', true); return; }
  const rows = [['Usuario','Email','Evento','Categoría','Fecha']];
  allFavorites.forEach(f => rows.push([
    usName(f), usEmail(f), evName(f), catName(f),
    f.createdAt||f.created_at||''
  ]));
  const csv  = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url  = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'),{href:url,download:'favoritos_eventpro.csv'}).click();
  URL.revokeObjectURL(url);
  showToast('CSV descargado correctamente.');
}

// ── Event listeners ──────────────────────────────────
document.getElementById('searchInput').addEventListener('input', e => {
  searchQuery = e.target.value.trim();
  applyFilters();
});

document.querySelectorAll('.filter-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-chip').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    applyFilters();
    buildRankTable();
  });
});

document.getElementById('exportBtn').addEventListener('click', exportCSV);
document.getElementById('refreshBtn').addEventListener('click', () => {
  showToast('Actualizando datos…');
  loadFavorites();
});

// ── Init ─────────────────────────────────────────────
loadFavorites();