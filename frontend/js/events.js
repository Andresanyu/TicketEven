import api from './api.js';
import { Auth } from './auth.js';

Auth.requireAdmin('./login.html');

const state = {
  events: [],
  filtered: [],
  categories: [],
  modalMode: 'create',
  editingId: null,
};

const els = {
  sidebarName: document.getElementById('sidebarName'),
  sidebarAvatar: document.getElementById('sidebarAvatar'),
  searchInput: document.getElementById('searchInput'),
  tableCount: document.getElementById('tableCount'),
  tableBody: document.getElementById('evTbody'),
  tableEmpty: document.getElementById('tableEmpty'),
  btnNuevo: document.getElementById('btnNuevo'),
  modalBackdrop: document.getElementById('modalBackdrop'),
  modalEyebrow: document.getElementById('modalEyebrow'),
  modalTitle: document.getElementById('modalTitle'),
  modalId: document.getElementById('modalId'),
  modalTitulo: document.getElementById('modalTitulo'),
  modalDescripcion: document.getElementById('modalDescripcion'),
  modalFecha: document.getElementById('modalFecha'),
  modalHora: document.getElementById('modalHora'),
  modalCategoria: document.getElementById('modalCategoria'),
  modalImagen: document.getElementById('modalImagen'),
  modalValor: document.getElementById('modalValor'),
  modalEstado: document.getElementById('modalEstado'),
  btnGuardar: document.getElementById('btnGuardar'),
  btnGuardarText: document.getElementById('btnGuardarText'),
  btnCloseModal: document.getElementById('btnCloseModal'),
  btnCancelarModal: document.getElementById('btnCancelarModal'),
  fieldTitulo: document.getElementById('field-titulo'),
  errTitulo: document.getElementById('err-titulo'),
  fieldFecha: document.getElementById('field-fecha'),
  errFecha: document.getElementById('err-fecha'),
  fieldCategoria: document.getElementById('field-categoria'),
  errCategoria: document.getElementById('err-categoria'),
  imgPreview: document.getElementById('imgPreview'),
  imgHint: document.getElementById('imgHint'),
};

const todayIso = () => new Date().toISOString().split('T')[0];

const SWAL_BASE = {
  background: '#121212',
  color: '#eaeaea',
  confirmButtonColor: '#c6f135',
  customClass: {
    popup: 'swal2-dark-popup',
    title: 'swal2-dark-title',
    htmlContainer: 'swal2-dark-text',
    confirmButton: 'swal2-dark-confirm',
    cancelButton: 'swal2-dark-cancel',
  },
};

function notifySuccess(title) {
  return window.Swal.fire({
    ...SWAL_BASE,
    icon: 'success',
    title,
  });
}

function notifyError(title, text = '') {
  return window.Swal.fire({
    ...SWAL_BASE,
    icon: 'error',
    title,
    text,
  });
}

async function askConfirm(title, text) {
  const result = await window.Swal.fire({
    ...SWAL_BASE,
    icon: 'warning',
    title,
    text,
    showCancelButton: true,
    confirmButtonText: 'Confirmar',
    cancelButtonText: 'Cancelar',
    cancelButtonColor: '#2f3431',
  });

  return Boolean(result.isConfirmed);
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getAdminIdentity() {
  const payload = Auth.getPayload() || {};
  const name = payload.nombre || payload.name || payload.username || payload.sub || 'Administrador';
  return {
    name,
    initial: name.trim().charAt(0).toUpperCase() || 'A',
  };
}

function setAdminIdentity() {
  const { name, initial } = getAdminIdentity();
  if (els.sidebarName) els.sidebarName.textContent = name;
  if (els.sidebarAvatar) els.sidebarAvatar.textContent = initial;
}

function clearFieldError(fieldEl, errorEl) {
  fieldEl?.classList.remove('has-error');
  if (errorEl) errorEl.textContent = '';
}

function setFieldError(fieldEl, errorEl, message) {
  fieldEl?.classList.add('has-error');
  if (errorEl) errorEl.textContent = message;
}

function clearValidationErrors() {
  clearFieldError(els.fieldTitulo, els.errTitulo);
  clearFieldError(els.fieldFecha, els.errFecha);
  clearFieldError(els.fieldCategoria, els.errCategoria);
}

function renderImagePreview(url) {
  if (!els.imgPreview || !els.imgHint) return;

  const cleanUrl = String(url || '').trim();
  if (!cleanUrl) {
    els.imgPreview.src = '';
    els.imgPreview.classList.add('hidden');
    els.imgHint.classList.remove('hidden');
    return;
  }

  els.imgPreview.src = cleanUrl;
  els.imgPreview.onload = () => {
    els.imgPreview.classList.remove('hidden');
    els.imgHint.classList.add('hidden');
  };
  els.imgPreview.onerror = () => {
    els.imgPreview.src = '';
    els.imgPreview.classList.add('hidden');
    els.imgHint.classList.remove('hidden');
  };
}

function splitFecha(fechaIso) {
  if (!fechaIso) return { date: '', time: '' };
  const d = new Date(fechaIso);
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');

  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}` };
}

function formatFecha(fechaIso) {
  if (!fechaIso) return { date: 'Sin fecha', time: '—' };
  const d = new Date(fechaIso);
  if (Number.isNaN(d.getTime())) return { date: 'Sin fecha', time: '—' };

  return {
    date: d.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }),
  };
}

function normalizeEvent(raw) {
  return {
    id: Number(raw?.id),
    nombre: String(raw?.nombre ?? '').trim(),
    fecha: raw?.fecha ? String(raw.fecha) : null,
    categoria: String(raw?.categoria ?? 'Sin categoria'),
    categoria_id: raw?.categoria_id ? Number(raw.categoria_id) : null,
    valor: raw?.valor == null ? null : Number(raw.valor),
    descripcion: String(raw?.descripcion ?? '').trim(),
    imagen_url: String(raw?.imagen_url ?? '').trim(),
    activo: raw?.activo !== false,
  };
}

function renderCount() {
  if (!els.tableCount) return;
  const total = state.filtered.length;
  els.tableCount.textContent = `${total} evento${total !== 1 ? 's' : ''}`;
}

function renderEmptyState() {
  els.tableEmpty?.classList.toggle('hidden', state.filtered.length > 0);
}

function renderTable() {
  if (!els.tableBody) return;

  if (!state.filtered.length) {
    els.tableBody.innerHTML = '';
    renderCount();
    renderEmptyState();
    return;
  }

  els.tableBody.innerHTML = state.filtered
    .map((ev) => {
      const fecha = formatFecha(ev.fecha);
      const statusClass = ev.activo ? 'badge-active' : 'badge-inactive';
      const statusText = ev.activo ? 'Activo' : 'Inactivo';

      return `
        <tr class="ev-row" data-id="${ev.id}" data-name="${escapeHtml(ev.nombre)}">
          <td class="cell-id">#${String(ev.id).padStart(2, '0')}</td>
          <td class="cell-name">
            <span class="ev-dot"></span>
            <span class="ev-name-text">${escapeHtml(ev.nombre)}</span>
          </td>
          <td class="cell-date">
            <span class="date-primary">${escapeHtml(fecha.date)}</span>
            <span class="date-time">${escapeHtml(fecha.time)}</span>
          </td>
          <td class="cell-cat"><span class="cat-tag">${escapeHtml(ev.categoria || 'Sin categoria')}</span></td>
          <td class="cell-status"><span class="badge ${statusClass}">${statusText}</span></td>
          <td class="cell-actions">
            <button class="btn-icon btn-edit" type="button" title="Editar" data-action="edit" data-id="${ev.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="btn-icon btn-delete" type="button" title="Inactivar" data-action="disable" data-id="${ev.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
              </svg>
            </button>
          </td>
        </tr>`;
    })
    .join('');

  renderCount();
  renderEmptyState();
}

function applyFilter() {
  const query = String(els.searchInput?.value ?? '').trim().toLowerCase();
  if (!query) {
    state.filtered = [...state.events];
  } else {
    state.filtered = state.events.filter((ev) => ev.nombre.toLowerCase().includes(query));
  }

  renderTable();
}

function toEventPayload() {
  const titulo = String(els.modalTitulo?.value ?? '').trim();
  const descripcion = String(els.modalDescripcion?.value ?? '').trim();
  const fecha = String(els.modalFecha?.value ?? '').trim();
  const hora = String(els.modalHora?.value ?? '').trim();
  const categoriaIdRaw = String(els.modalCategoria?.value ?? '').trim();
  const imagenUrl = String(els.modalImagen?.value ?? '').trim();
  const valorRaw = String(els.modalValor?.value ?? '').trim();
  const activo = String(els.modalEstado?.value ?? 'true') === 'true';

  return {
    nombre: titulo,
    categoria_id: categoriaIdRaw ? Number(categoriaIdRaw) : null,
    fecha: fecha ? `${fecha}T${hora || '00:00'}:00` : null,
    valor: valorRaw === '' ? null : Number(valorRaw),
    descripcion: descripcion || null,
    imagen_url: imagenUrl || null,
    activo,
  };
}

function validateForm(payload) {
  clearValidationErrors();

  let valid = true;

  if (!payload.nombre) {
    setFieldError(els.fieldTitulo, els.errTitulo, 'El titulo es obligatorio.');
    valid = false;
  }

  if (!payload.fecha) {
    setFieldError(els.fieldFecha, els.errFecha, 'La fecha es obligatoria.');
    valid = false;
  } else {
    const selectedDate = String(payload.fecha).split('T')[0];
    const today = todayIso();
    if (selectedDate < today) {
      setFieldError(els.fieldFecha, els.errFecha, 'No se permiten eventos en fechas pasadas.');
      valid = false;
    }
  }

  if (!payload.categoria_id) {
    setFieldError(els.fieldCategoria, els.errCategoria, 'Selecciona una categoria.');
    valid = false;
  }

  if (payload.valor != null && Number.isNaN(payload.valor)) {
    valid = false;
  }

  return valid;
}

function setSaving(on) {
  if (!els.btnGuardar) return;
  els.btnGuardar.disabled = on;
  els.btnGuardar.classList.toggle('loading', on);
}

function resetForm() {
  if (els.modalId) els.modalId.value = '';
  if (els.modalTitulo) els.modalTitulo.value = '';
  if (els.modalDescripcion) els.modalDescripcion.value = '';
  if (els.modalFecha) els.modalFecha.value = '';
  if (els.modalHora) els.modalHora.value = '';
  if (els.modalCategoria) els.modalCategoria.value = '';
  if (els.modalImagen) els.modalImagen.value = '';
  if (els.modalValor) els.modalValor.value = '';
  if (els.modalEstado) els.modalEstado.value = 'true';
  renderImagePreview('');
  clearValidationErrors();
}

function openCreateModal() {
  state.modalMode = 'create';
  state.editingId = null;

  resetForm();

  if (els.modalFecha) {
    els.modalFecha.min = todayIso();
  }

  if (els.modalEyebrow) els.modalEyebrow.textContent = 'Nuevo';
  if (els.modalTitle) els.modalTitle.textContent = 'Nuevo Evento';
  if (els.btnGuardarText) els.btnGuardarText.textContent = 'Guardar Evento';

  els.modalBackdrop?.classList.remove('hidden');
  setTimeout(() => els.modalTitulo?.focus(), 60);
}

function openEditModal(eventId) {
  const id = Number(eventId);
  const eventData = state.events.find((ev) => ev.id === id);
  if (!eventData) return;

  state.modalMode = 'edit';
  state.editingId = id;

  const split = splitFecha(eventData.fecha);

  if (els.modalId) els.modalId.value = String(id);
  if (els.modalTitulo) els.modalTitulo.value = eventData.nombre;
  if (els.modalDescripcion) els.modalDescripcion.value = eventData.descripcion || '';
  if (els.modalFecha) {
    els.modalFecha.value = split.date;
    els.modalFecha.min = '';
  }
  if (els.modalHora) els.modalHora.value = split.time;
  if (els.modalCategoria) {
    const selectedId = eventData.categoria_id || state.categories.find((c) => c.nombre === eventData.categoria)?.id;
    els.modalCategoria.value = selectedId ? String(selectedId) : '';
  }
  if (els.modalImagen) els.modalImagen.value = eventData.imagen_url || '';
  if (els.modalValor) els.modalValor.value = eventData.valor == null ? '' : String(eventData.valor);
  if (els.modalEstado) els.modalEstado.value = String(eventData.activo);
  renderImagePreview(eventData.imagen_url);

  clearValidationErrors();
  if (els.modalEyebrow) els.modalEyebrow.textContent = `Editando #${String(id).padStart(2, '0')}`;
  if (els.modalTitle) els.modalTitle.textContent = 'Editar Evento';
  if (els.btnGuardarText) els.btnGuardarText.textContent = 'Guardar cambios';

  els.modalBackdrop?.classList.remove('hidden');
  setTimeout(() => els.modalTitulo?.focus(), 60);
}

function closeModal() {
  els.modalBackdrop?.classList.add('hidden');
  setSaving(false);
}

async function saveEvent() {
  const payload = toEventPayload();

  if (payload.valor != null && Number.isNaN(payload.valor)) {
    await notifyError('Valor invalido', 'El valor debe ser numerico.');
    return;
  }

  if (!validateForm(payload)) {
    if (String(payload.fecha || '').split('T')[0] < todayIso()) {
      await notifyError('Fecha invalida', 'No se pueden crear eventos en fechas pasadas.');
    }
    return;
  }

  setSaving(true);

  try {
    if (state.modalMode === 'edit' && state.editingId) {
      await api.put(`/events/${state.editingId}`, payload, Auth.authOptions());
      await notifySuccess('Evento actualizado correctamente');
    } else {
      await api.post('/events', payload, Auth.authOptions());
      await notifySuccess('Evento creado correctamente');
    }

    closeModal();
    await loadEvents();
  } catch (err) {
    console.error(err);
    await notifyError('Error al guardar', err?.message || 'No fue posible guardar el evento.');
  } finally {
    setSaving(false);
  }
}

async function disableEvent(eventId) {
  const id = Number(eventId);
  if (!id) return;

  const ok = await askConfirm('Inactivar evento', 'El evento se marcara como inactivo y dejara de mostrarse como activo.');
  if (!ok) return;

  try {
    await api.patch(`/events/${id}`, { activo: false }, Auth.authOptions());
    await notifySuccess('El evento ha sido inactivado');
    await loadEvents();
  } catch (err) {
    console.error(err);
    await notifyError('Error al inactivar', err?.message || 'No fue posible inactivar el evento.');
  }
}

async function loadCategories() {
  try {
    const data = await api.get('/categories', Auth.authOptions());
    state.categories = Array.isArray(data)
      ? data.map((c) => ({ id: Number(c.id), nombre: String(c.nombre || '').trim() })).filter((c) => c.id > 0)
      : [];

    if (!els.modalCategoria) return;
    els.modalCategoria.innerHTML = '<option value="">— Selecciona una categoría —</option>';

    state.categories.forEach((cat) => {
      const option = document.createElement('option');
      option.value = String(cat.id);
      option.textContent = cat.nombre;
      els.modalCategoria.appendChild(option);
    });
  } catch (err) {
    console.error(err);
    await notifyError('Error de categorias', 'No se pudieron cargar las categorias.');
  }
}

async function loadEvents() {
  try {
    const data = await api.get('/events', Auth.authOptions());
    state.events = Array.isArray(data) ? data.map(normalizeEvent) : [];
    applyFilter();
  } catch (err) {
    console.error(err);
    await notifyError('Error de eventos', 'No se pudieron cargar los eventos.');
  }
}

function handleTableClick(event) {
  const trigger = event.target.closest('button[data-action][data-id]');
  if (!trigger) return;

  const action = trigger.dataset.action;
  const id = Number(trigger.dataset.id);
  if (!id) return;

  if (action === 'edit') {
    openEditModal(id);
    return;
  }

  if (action === 'disable') {
    disableEvent(id);
  }
}

function bindEvents() {
  els.btnNuevo?.addEventListener('click', openCreateModal);
  els.btnCloseModal?.addEventListener('click', closeModal);
  els.btnCancelarModal?.addEventListener('click', closeModal);
  els.btnGuardar?.addEventListener('click', saveEvent);

  els.modalBackdrop?.addEventListener('click', (event) => {
    if (event.target === els.modalBackdrop) closeModal();
  });

  els.searchInput?.addEventListener('input', applyFilter);
  els.tableBody?.addEventListener('click', handleTableClick);

  els.modalTitulo?.addEventListener('input', () => clearFieldError(els.fieldTitulo, els.errTitulo));
  els.modalFecha?.addEventListener('input', () => clearFieldError(els.fieldFecha, els.errFecha));
  els.modalCategoria?.addEventListener('input', () => clearFieldError(els.fieldCategoria, els.errCategoria));

  els.modalImagen?.addEventListener('input', () => renderImagePreview(els.modalImagen?.value));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
  });
}

bindEvents();
setAdminIdentity();

async function init() {
  await loadCategories();
  await loadEvents();
}

init();
