import api from './api.js';

/* ══════════════════════════════════════════════════
   detalle.js  — EventPro · Detalle de Evento
   ══════════════════════════════════════════════════

   ┌─ AJUSTA AQUÍ ─────────────────────────────────────┐
   │  BASE_URL  → URL base de tu API en Render          │
   │  Campos del evento marcados con 👉 a lo largo      │
   │  del archivo para que los cambies fácilmente       │
   └───────────────────────────────────────────────────┘
*/

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
const interestBar    = document.getElementById('interestBar');
const btnInterest    = document.getElementById('btnInterest');
const btnInterestText= document.getElementById('btnInterestText');
const interestHint   = document.getElementById('interestHint');

// ── Leer parámetro ?id= de la URL ──────────────────────
const params = new URLSearchParams(window.location.search);
const eventId = params.get('id');  // e.g. detalle.html?id=3  →  "3"

// ── Helpers ────────────────────────────────────────────
function show(el)  { el.classList.remove('hidden'); }
function hide(el)  { el.classList.add('hidden');    }

/**
 * Formatea una fecha ISO a texto legible en español.
 * 👉 Si tu API devuelve la fecha en otro formato, ajusta aquí.
 */
function formatDate(isoString) {
  if (!isoString) return 'Sin fecha';
  try {
    return new Date(isoString).toLocaleDateString('es-CO', {
      weekday: 'long',
      year:    'numeric',
      month:   'long',
      day:     'numeric',
    });
  } catch {
    return isoString; // fallback: mostrar crudo
  }
}

/**
 * Formatea el precio a moneda colombiana.
 * 👉 Cambia 'COP' y 'es-CO' si usas otra moneda/localidad.
 */
function formatPrice(value) {
  if (!value && value !== 0) return 'Sin precio';
  if (Number(value) === 0)   return 'Gratis';
  return new Intl.NumberFormat('es-CO', {
    style:    'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
}

/** Anima la barra de interés según el contador. */
function animateBar(count) {
  // Escala: 100 interesados = barra llena (ajusta el tope si quieres)
  const TOPE = 100;
  const pct  = Math.min((count / TOPE) * 100, 100);
  setTimeout(() => { interestBar.style.width = pct + '%'; }, 150);
}

// ── Estado de interés (localStorage para no repetir clics) ──
const STORAGE_KEY = `eventpro_interest_${eventId}`;
let alreadyClicked = localStorage.getItem(STORAGE_KEY) === 'true';

// ── Cargar evento ──────────────────────────────────────
async function loadEvent() {
  if (!eventId) {
    showError('No se especificó ningún evento en la URL (falta el parámetro ?id=).');
    return;
  }

  try {
    const data = await api.get(`/events/${eventId}`);

    // La API puede devolver { data: {...} } o directamente el objeto
    // 👉 Ajusta según la estructura real de tu respuesta
    const ev = data.data ?? data.evento ?? data;

    populateDOM(ev);
    hide(stateLoading);
    show(detailContent);

    // Si ya hizo clic antes, muestra el botón en estado "done"
    if (alreadyClicked) setDoneState(false);

  } catch (err) {
    console.error('Error al cargar el evento:', err);
    if (err?.status === 404) {
      showError('El evento no fue encontrado.');
      return;
    }
    if (err?.status) {
      showError(`Error del servidor (${err.status}).`);
      return;
    }
    showError('No se pudo conectar con el servidor. Intenta más tarde.');
  }
}

// ── Inyectar datos en el DOM ───────────────────────────
function populateDOM(ev) {
  // ── Título del documento
  document.title = `EventPro — ${ev.nombre ?? 'Evento'}`;  // 👉 campo: nombre

  // ── Imagen
  // 👉 Ajusta el campo: imagen_url / imagen / imagen_promotional / foto
  const imgUrl = ev.imagen_url ?? ev.imagen ?? ev.imagen_promotional ?? null;
  if (imgUrl) {
    heroImg.src = imgUrl;
    heroImg.alt = ev.nombre ?? 'Imagen del evento';
    heroImg.onload  = () => { show(heroImg); hide(heroPlaceholder); };
    heroImg.onerror = () => { hide(heroImg); show(heroPlaceholder); };
  } else {
    hide(heroImg);
    show(heroPlaceholder);
  }

  // ── Categoría
  // 👉 Ajusta el campo: categoria / categoria_nombre / categoria.nombre / cat.nombre
  const catName = ev.categoria?.nombre
    ?? ev.categoria_nombre
    ?? ev.categoria
    ?? 'Sin categoría';
  heroCategory.textContent = catName;

  // ── Nombre del evento
  // 👉 Ajusta el campo: nombre / nombre_evento
  heroTitle.textContent = ev.nombre ?? ev.nombre_evento ?? 'Sin nombre';

  // ── Fecha
  // 👉 Ajusta el campo: fecha / fecha_evento / fecha_inicio
  const fechaRaw = ev.fecha ?? ev.fecha_evento ?? ev.fecha_inicio ?? null;
  heroDateText.textContent = formatDate(fechaRaw);

  // ── Precio
  // 👉 Ajusta el campo: valor / precio / costo / precio_entrada
  const precioRaw = ev.valor ?? ev.precio ?? ev.costo ?? ev.precio_entrada ?? null;
  heroPriceText.textContent = formatPrice(precioRaw);

  // ── Descripción
  // 👉 Ajusta el campo: descripcion / descripcion_evento / detalle
  const desc = ev.descripcion ?? ev.descripcion_evento ?? ev.detalle ?? 'Sin descripción.';
  detailDesc.textContent = desc;

  // ── Contador de interesados
  // 👉 Ajusta el campo: interesados / contador_interes / interes / num_interesados
  const count = Number(ev.interesados ?? ev.contador_interes ?? ev.interes ?? ev.num_interesados ?? 0);
  interestCount.textContent = count.toLocaleString('es-CO');
  animateBar(count);
}

// ── Botón "Estoy interesado" (RF-06) ──────────────────
async function markInterest() {
  if (btnInterest.disabled) return;

  btnInterest.disabled = true;

  try {
    const data = await api.patch(`/events/${eventId}/interes`, { incrementar: true });

    // 👉 Actualiza el contador con la respuesta del backend
    //    Ajusta el campo: interesados / contador_interes / interes / count
    const nuevo = Number(
      data?.interesados ?? data?.contador_interes ?? data?.interes ?? data?.count ?? null
    );

    if (!isNaN(nuevo)) {
      interestCount.textContent = nuevo.toLocaleString('es-CO');
      animateBar(nuevo);
    } else {
      // Si el backend no devuelve el nuevo valor, incrementa localmente
      const actual = parseInt(interestCount.textContent.replace(/\D/g, '')) || 0;
      interestCount.textContent = (actual + 1).toLocaleString('es-CO');
      animateBar(actual + 1);
    }

    // Guardar en localStorage para no spam
    localStorage.setItem(STORAGE_KEY, 'true');
    alreadyClicked = true;

    setDoneState(true); // feedback visual

  } catch (err) {
    console.error('Error al registrar interés:', err);
    // Feedback de error al usuario
    btnInterestText.textContent = 'Error al registrar. Intenta de nuevo.';
    btnInterest.classList.add('error');
    setTimeout(() => {
      btnInterestText.textContent = 'Estoy interesado';
      btnInterest.classList.remove('error');
      btnInterest.disabled = false;
    }, 2500);
  }
}

/**
 * Cambia visualmente el botón al estado "ya interesé".
 * @param {boolean} animate  — si true, aplica la animación de latido
 */
function setDoneState(animate) {
  btnInterest.classList.add('done');
  btnInterestText.textContent = '¡Gracias por tu interés!';
  interestHint.textContent    = 'Ya registramos tu interés en este evento ✓';

  if (animate) {
    // Animación de latido en el corazón
    const heart = btnInterest.querySelector('.heart-icon');
    heart?.classList.add('beat');
    setTimeout(() => heart?.classList.remove('beat'), 600);
  }
}

// ── Mostrar estado de error ─────────────────────────────
function showError(msg) {
  hide(stateLoading);
  show(stateError);
  errorMsg.textContent = msg;
}

// ── Animación de latido (CSS añadida vía JS para no contaminar el CSS) ──
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

// ── Arrancar ───────────────────────────────────────────
window.markInterest = markInterest; // exponer para onclick en HTML
loadEvent();