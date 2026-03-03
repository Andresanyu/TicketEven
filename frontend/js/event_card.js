import api from './api.js';

// ── Elementos del DOM ─────────────────────────────────
const stateLoading   = document.getElementById('stateLoading');
const stateError     = document.getElementById('stateError');
const detailContent  = document.getElementById('detailContent');
const errorMsg       = document.getElementById('errorMsg');

const heroImg        = document.getElementById('heroImg');
const heroPlaceholder= document.getElementById('heroPlaceholder');
const heroCategory   = document.getElementById('heroCategory');
const heroTitle      = document.getElementById('heroTitle');
const heroDateText   = document.getElementById('heroDateText');
const heroPriceText  = document.getElementById('heroPriceText');
const detailDesc     = document.getElementById('detailDescription');
const interestCount  = document.getElementById('interestCount');
const btnInterest    = document.getElementById('btnInterest');
const btnInterestText= document.getElementById('btnInterestText');
const interestHint   = document.getElementById('interestHint');
const btnSave        = document.getElementById('btnSave');
const btnSaveText    = document.getElementById('btnSaveText');

// ── Leer parámetro ?id= de la URL ──────────────────────
const params  = new URLSearchParams(window.location.search);
const eventId = params.get('id');

// ── Helpers ────────────────────────────────────────────
function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden');    }

function formatDate(isoString) {
  if (!isoString) return 'Sin fecha';
  try {
    return new Date(isoString).toLocaleDateString('es-CO', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch { return isoString; }
}

function formatPrice(value) {
  if (!value && value !== 0) return 'Sin precio';
  if (Number(value) === 0)   return 'Gratis';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
  }).format(value);
}

// ── Cargar evento ──────────────────────────────────────
async function loadEvent() {
  if (!eventId) {
    showError('No se especificó ningún evento en la URL (falta el parámetro ?id=).');
    return;
  }

  try {
    const data = await api.get(`/events/${eventId}`);
    const ev   = data.data ?? data.evento ?? data;

    populateDOM(ev);
    hide(stateLoading);
    show(detailContent);

    // Restaurar estado de guardado al cargar
    initSaveState();

  } catch (err) {
    console.error('Error al cargar el evento:', err);
    if (err?.status === 404) { showError('El evento no fue encontrado.'); return; }
    if (err?.status)         { showError(`Error del servidor (${err.status}).`); return; }
    showError('No se pudo conectar con el servidor. Intenta más tarde.');
  }
}

// ── Inyectar datos en el DOM ───────────────────────────
function populateDOM(ev) {
  document.title = `EventPro — ${ev.nombre ?? 'Evento'}`;

  // Imagen
  const imgUrl = ev.imagen_url ?? ev.imagen ?? ev.imagen_promotional ?? null;
  if (imgUrl) {
    heroImg.src = imgUrl;
    heroImg.alt = ev.nombre ?? 'Imagen del evento';
    heroImg.onload  = () => { show(heroImg); hide(heroPlaceholder); };
    heroImg.onerror = () => { hide(heroImg); show(heroPlaceholder); };
  } else {
    hide(heroImg); show(heroPlaceholder);
  }

  // Campos de texto
  const catName = ev.categoria?.nombre ?? ev.categoria_nombre ?? ev.categoria ?? 'Sin categoría';
  heroCategory.textContent = catName;
  heroTitle.textContent    = ev.nombre ?? ev.nombre_evento ?? 'Sin nombre';

  const fechaRaw  = ev.fecha ?? ev.fecha_evento ?? ev.fecha_inicio ?? null;
  heroDateText.textContent = formatDate(fechaRaw);

  const precioRaw = ev.valor ?? ev.precio ?? ev.costo ?? ev.precio_entrada ?? null;
  heroPriceText.textContent = formatPrice(precioRaw);

  const desc = ev.descripcion ?? ev.descripcion_evento ?? ev.detalle ?? 'Sin descripción.';
  detailDesc.textContent = desc;

  // Contador de interesados
  const count = Number(ev.interesados ?? ev.contador_interes ?? ev.interes ?? ev.num_interesados ?? 0);
  if (interestCount) interestCount.textContent = count.toLocaleString('es-CO');
}

// ── Botón "Estoy interesado" (RF-06) ──────────────────
let sending = false;

async function markInterest() {
  if (!eventId || !btnInterest || sending) return;
  sending = true;

  const heart = btnInterest.querySelector('.heart-icon');
  heart?.classList.add('beat');
  setTimeout(() => heart?.classList.remove('beat'), 500);

  try {
    const data = await api.patch(`/events/${eventId}/interes`, { incrementar: true });

    const nuevo = Number(
      data?.interesados ?? data?.contador_interes ?? data?.interes ?? data?.count ?? null
    );

    if (!isNaN(nuevo)) {
      if (interestCount) interestCount.textContent = nuevo.toLocaleString('es-CO');
    } else {
      const actual = parseInt((interestCount?.textContent || '').replace(/\D/g, '')) || 0;
      if (interestCount) interestCount.textContent = (actual + 1).toLocaleString('es-CO');
    }

    if (interestHint) interestHint.textContent = '¡Interés registrado correctamente!';

  } catch (err) {
    console.error('Error al registrar interés:', err);
    if (btnInterestText) btnInterestText.textContent = 'Error. Intenta de nuevo.';
    setTimeout(() => {
      if (btnInterestText) btnInterestText.textContent = 'Estoy interesado';
      if (interestHint)    interestHint.textContent    = 'Haz clic para registrar tu interés en este evento';
    }, 2000);
  } finally {
    sending = false;
  }
}

// ══════════════════════════════════════════
// GUARDAR EVENTO (toggle con localStorage)
// ══════════════════════════════════════════
const SAVE_KEY = `eventpro_saved_${eventId}`;

/** Lee el localStorage y pinta el botón según el estado guardado. */
function initSaveState() {
  if (!btnSave || !btnSaveText) return;
  const saved = localStorage.getItem(SAVE_KEY) === 'true';
  setSaveVisual(saved);
}

/** Actualiza clases y texto del botón. */
function setSaveVisual(saved) {
  if (!btnSave || !btnSaveText) return;
  if (saved) {
    btnSave.classList.add('saved');
    btnSaveText.textContent = 'Evento guardado';
  } else {
    btnSave.classList.remove('saved');
    btnSaveText.textContent = 'Guardar evento';
  }
}

/** Toggle: guarda o quita del guardado. */
function toggleSave() {
  if (!eventId) return;
  const isSaved = localStorage.getItem(SAVE_KEY) === 'true';
  const newState = !isSaved;
  localStorage.setItem(SAVE_KEY, String(newState));
  setSaveVisual(newState);
}

// ── Estado de error ────────────────────────────────────
function showError(msg) {
  hide(stateLoading);
  show(stateError);
  errorMsg.textContent = msg;
}

// ── Animación de latido ────────────────────────────────
(function injectBeatCSS() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes beat {
      0%   { transform: scale(1); }
      30%  { transform: scale(1.35); }
      60%  { transform: scale(.95); }
      100% { transform: scale(1); }
    }
    .heart-icon.beat { animation: beat .5s ease; }
  `;
  document.head.appendChild(style);
})();

// ── Exponer globales y arrancar ────────────────────────
window.markInterest = markInterest;
window.toggleSave   = toggleSave;
loadEvent();