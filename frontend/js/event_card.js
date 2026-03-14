import api from './api.js';
import { Auth } from './auth.js';

const stateLoading = document.getElementById('stateLoading');
const stateError = document.getElementById('stateError');
const detailContent = document.getElementById('detailContent');
const errorMsg = document.getElementById('errorMsg');

const heroImg = document.getElementById('heroImg');
const heroPlaceholder = document.getElementById('heroPlaceholder');
const heroCategory = document.getElementById('heroCategory');
const heroTitle = document.getElementById('heroTitle');
const heroDateText = document.getElementById('heroDateText');
const heroPriceText = document.getElementById('heroPriceText');
const detailDesc = document.getElementById('detailDescription');

const btnSave = document.getElementById('btnSave');
const btnSaveText = document.getElementById('btnSaveText');
const saveHint = document.getElementById('saveHint');

const params = new URLSearchParams(window.location.search);
const eventId = params.get('id');

let saveLoading = false;
let saveState = false;

function show(el) {
  el.classList.remove('hidden');
}

function hide(el) {
  el.classList.add('hidden');
}

function formatDate(isoString) {
  if (!isoString) return 'Sin fecha';
  try {
    return new Date(isoString).toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return isoString;
  }
}

function formatPrice(value) {
  if (!value && value !== 0) return 'Sin precio';
  if (Number(value) === 0) return 'Gratis';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
}

function setSaveVisual(saved) {
  if (!btnSave || !btnSaveText) return;

  if (saved) {
    btnSave.classList.add('saved');
    btnSaveText.textContent = 'Guardado';
    if (saveHint) saveHint.textContent = 'Este evento esta en tus guardados';
  } else {
    btnSave.classList.remove('saved');
    btnSaveText.textContent = 'Guardar';
    if (saveHint) saveHint.textContent = Auth.isLoggedIn()
      ? 'Haz clic para guardar este evento'
      : 'Inicia sesion para guardar este evento';
  }
}

async function initSaveState() {
  if (!eventId) return;

  if (!Auth.isLoggedIn()) {
    saveState = false;
    setSaveVisual(false);
    return;
  }

  try {
    const data = await api.get(`/users/saved-events/${eventId}/status`, Auth.authOptions());
    saveState = Boolean(data?.isSaved);
    setSaveVisual(saveState);
  } catch (err) {
    console.error('Error al consultar estado de guardado:', err);
    saveState = false;
    setSaveVisual(false);
  }
}

async function toggleSave() {
  if (!eventId || saveLoading) return;

  if (!Auth.isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }

  saveLoading = true;

  try {
    const data = await api.post(`/events/${eventId}/save`, {}, Auth.authOptions());
    saveState = Boolean(data?.isSaved);
    setSaveVisual(saveState);
  } catch (err) {
    console.error('Error al guardar evento:', err);
    if (saveHint) {
      saveHint.textContent = err?.status === 404
        ? 'El evento no existe o fue eliminado'
        : 'No se pudo actualizar el guardado';
    }
  } finally {
    saveLoading = false;
  }
}

function populateDOM(ev) {
  document.title = `EventPro - ${ev.nombre ?? 'Evento'}`;

  const imgUrl = ev.imagen_url ?? ev.imagen ?? ev.imagen_promotional ?? null;
  if (imgUrl) {
    heroImg.src = imgUrl;
    heroImg.alt = ev.nombre ?? 'Imagen del evento';
    heroImg.onload = () => {
      show(heroImg);
      hide(heroPlaceholder);
    };
    heroImg.onerror = () => {
      hide(heroImg);
      show(heroPlaceholder);
    };
  } else {
    hide(heroImg);
    show(heroPlaceholder);
  }

  const catName = ev.categoria?.nombre ?? ev.categoria_nombre ?? ev.categoria ?? 'Sin categoria';
  heroCategory.textContent = catName;
  heroTitle.textContent = ev.nombre ?? ev.nombre_evento ?? 'Sin nombre';

  const fechaRaw = ev.fecha ?? ev.fecha_evento ?? ev.fecha_inicio ?? null;
  heroDateText.textContent = formatDate(fechaRaw);

  const precioRaw = ev.valor ?? ev.precio ?? ev.costo ?? ev.precio_entrada ?? null;
  heroPriceText.textContent = formatPrice(precioRaw);

  const desc = ev.descripcion ?? ev.descripcion_evento ?? ev.detalle ?? 'Sin descripcion.';
  detailDesc.textContent = desc;
}

function showError(msg) {
  hide(stateLoading);
  show(stateError);
  errorMsg.textContent = msg;
}

async function loadEvent() {
  if (!eventId) {
    showError('No se especifico ningun evento en la URL (falta el parametro ?id=).');
    return;
  }

  try {
    const data = await api.get(`/events/${eventId}`);
    const ev = data?.data ?? data?.evento ?? data;

    populateDOM(ev);
    hide(stateLoading);
    show(detailContent);

    await initSaveState();
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
    showError('No se pudo conectar con el servidor. Intenta mas tarde.');
  }
}

window.toggleSave = toggleSave;
loadEvent();
