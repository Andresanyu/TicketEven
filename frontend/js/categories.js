import api from './api.js';
import { Auth } from './auth.js';

Auth.requireAdmin('./login.html');

const state = {
  categories: [],
  filtered: [],
  modalMode: 'create',
  editingId: null,
  deletingId: null,
};

const els = {
  sidebarName: document.getElementById('sidebarName'),
  sidebarAvatar: document.getElementById('sidebarAvatar'),
  searchInput: document.getElementById('searchInput'),
  tableCount: document.getElementById('tableCount'),
  tableBody: document.getElementById('catTbody'),
  tableEmpty: document.getElementById('tableEmpty'),
  btnNueva: document.getElementById('btnNueva'),
  modalBackdrop: document.getElementById('modalBackdrop'),
  modalTitle: document.getElementById('modalTitle'),
  modalId: document.getElementById('modalId'),
  modalNombre: document.getElementById('modalNombre'),
  modalEstado: document.getElementById('modalEstado'),
  btnGuardar: document.getElementById('btnGuardar'),
  btnGuardarText: document.getElementById('btnGuardarText'),
  btnCloseModal: document.getElementById('btnCloseModal'),
  btnCancelarModal: document.getElementById('btnCancelarModal'),
  fieldNombre: document.getElementById('field-nombre'),
  errNombre: document.getElementById('err-nombre'),
  confirmBackdrop: document.getElementById('confirmBackdrop'),
  confirmMsg: document.getElementById('confirmMsg'),
  btnConfirmAction: document.getElementById('btnConfirmAction'),
  btnCloseConfirm: document.getElementById('btnCloseConfirm'),
  btnCancelarConfirm: document.getElementById('btnCancelarConfirm'),
};

function showToast(msg) {
  window.alert(msg);
}

function normalizeCategory(raw) {
  return {
    id: Number(raw?.id),
    nombre: String(raw?.nombre ?? '').trim(),
    activo: raw?.activo !== false,
  };
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function clearFieldError() {
  if (els.fieldNombre) els.fieldNombre.classList.remove('has-error');
  if (els.errNombre) els.errNombre.textContent = '';
}

function showFieldError(message) {
  if (els.fieldNombre) els.fieldNombre.classList.add('has-error');
  if (els.errNombre) els.errNombre.textContent = message;
}

function setSaving(on) {
  if (!els.btnGuardar) return;
  els.btnGuardar.disabled = on;
  els.btnGuardar.classList.toggle('loading', on);
}

function renderCount() {
  if (!els.tableCount) return;
  const total = state.filtered.length;
  els.tableCount.textContent = `${total} categoria${total !== 1 ? 's' : ''}`;
}

function renderEmpty() {
  if (!els.tableEmpty) return;
  els.tableEmpty.classList.toggle('hidden', state.filtered.length > 0);
}

function renderTable() {
  if (!els.tableBody) return;

  if (!state.filtered.length) {
    els.tableBody.innerHTML = '';
    renderCount();
    renderEmpty();
    return;
  }

  els.tableBody.innerHTML = state.filtered
    .map((cat) => {
      const statusClass = cat.activo ? 'badge-active' : 'badge-inactive';
      const statusText = cat.activo ? 'Activo' : 'Inactivo';
      return `
        <tr class="cat-row" data-id="${cat.id}" data-name="${escapeHtml(cat.nombre)}" data-activo="${cat.activo}">
          <td class="cell-id">#${String(cat.id).padStart(2, '0')}</td>
          <td class="cell-name"><span class="cat-dot"></span>${escapeHtml(cat.nombre)}</td>
          <td class="cell-status"><span class="badge ${statusClass}">${statusText}</span></td>
          <td class="cell-actions">
            <button class="btn-icon btn-edit" type="button" title="Editar" data-action="edit" data-id="${cat.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="btn-icon btn-delete" type="button" title="Inactivar / Eliminar" data-action="delete" data-id="${cat.id}">
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
  renderEmpty();
}

function applyFilter() {
  const query = (els.searchInput?.value ?? '').trim().toLowerCase();
  if (!query) {
    state.filtered = [...state.categories];
  } else {
    state.filtered = state.categories.filter((cat) => cat.nombre.toLowerCase().includes(query));
  }
  renderTable();
}

async function loadCategories() {
  try {
    const data = await api.get('/categories', Auth.authOptions());
    state.categories = Array.isArray(data) ? data.map(normalizeCategory) : [];
    applyFilter();
  } catch (err) {
    console.error(err);
    showToast('No se pudieron cargar las categorias.');
  }
}

function openModalForCreate() {
  state.modalMode = 'create';
  state.editingId = null;

  if (els.modalId) els.modalId.value = '';
  if (els.modalNombre) els.modalNombre.value = '';
  if (els.modalEstado) els.modalEstado.value = 'true';
  if (els.modalTitle) els.modalTitle.textContent = 'Nueva Categoria';
  if (els.btnGuardarText) els.btnGuardarText.textContent = 'Guardar';

  clearFieldError();
  els.modalBackdrop?.classList.remove('hidden');
  setTimeout(() => els.modalNombre?.focus(), 60);
}

function openModalForEdit(categoryId) {
  const id = Number(categoryId);
  const cat = state.categories.find((item) => item.id === id);
  if (!cat) return;

  state.modalMode = 'edit';
  state.editingId = id;

  if (els.modalId) els.modalId.value = String(id);
  if (els.modalNombre) els.modalNombre.value = cat.nombre;
  if (els.modalEstado) els.modalEstado.value = String(cat.activo);
  if (els.modalTitle) els.modalTitle.textContent = 'Editar Categoria';
  if (els.btnGuardarText) els.btnGuardarText.textContent = 'Guardar cambios';

  clearFieldError();
  els.modalBackdrop?.classList.remove('hidden');
  setTimeout(() => els.modalNombre?.focus(), 60);
}

function closeModal() {
  els.modalBackdrop?.classList.add('hidden');
  setSaving(false);
}

function openConfirmForDelete(categoryId) {
  const id = Number(categoryId);
  const cat = state.categories.find((item) => item.id === id);
  if (!cat) return;

  state.deletingId = id;
  if (els.confirmMsg) {
    els.confirmMsg.textContent = `Deseas eliminar la categoria "${cat.nombre}"? Esta accion no se puede deshacer.`;
  }
  els.confirmBackdrop?.classList.remove('hidden');
}

function closeConfirm() {
  state.deletingId = null;
  els.confirmBackdrop?.classList.add('hidden');
}

async function submitModal() {
  const nombre = (els.modalNombre?.value ?? '').trim();

  if (!nombre) {
    showFieldError('El nombre es obligatorio.');
    return;
  }

  if (nombre.length > 100) {
    showFieldError('Maximo 100 caracteres.');
    return;
  }

  clearFieldError();
  setSaving(true);

  try {
    if (state.modalMode === 'edit' && state.editingId) {
      await api.put(`/categories/${state.editingId}`, { nombre }, Auth.authOptions());
      showToast('Categoria actualizada correctamente.');
    } else {
      await api.post('/categories', { nombre }, Auth.authOptions());
      showToast('Categoria creada correctamente.');
    }

    closeModal();
    await loadCategories();
  } catch (err) {
    if (err?.status === 409) {
      showFieldError('Ya existe una categoria con ese nombre.');
    } else {
      console.error(err);
      showToast('No fue posible guardar la categoria.');
    }
  } finally {
    setSaving(false);
  }
}

async function deleteCategory() {
  if (!state.deletingId) return;

  try {
    await api.delete(`/categories/${state.deletingId}`, Auth.authOptions());
    closeConfirm();
    showToast('Categoria eliminada correctamente.');
    await loadCategories();
  } catch (err) {
    console.error(err);
    closeConfirm();
    showToast('No fue posible eliminar la categoria.');
  }
}

function initAdminIdentity() {
  const payload = Auth.getPayload() || {};
  const name = payload.nombre || payload.name || payload.username || payload.sub || 'Administrador';
  if (els.sidebarName) els.sidebarName.textContent = name;
  if (els.sidebarAvatar) els.sidebarAvatar.textContent = name.trim().charAt(0).toUpperCase();
}

function handleTableClick(event) {
  const trigger = event.target.closest('button[data-action][data-id]');
  if (!trigger) return;

  const action = trigger.dataset.action;
  const id = Number(trigger.dataset.id);
  if (!id) return;

  if (action === 'edit') {
    openModalForEdit(id);
    return;
  }

  if (action === 'delete') {
    if (window.confirm('Deseas inactivar/eliminar esta categoria?')) {
      state.deletingId = id;
      deleteCategory();
    }
  }
}

function bindEvents() {
  els.btnNueva?.addEventListener('click', openModalForCreate);
  els.btnGuardar?.addEventListener('click', submitModal);
  els.btnCloseModal?.addEventListener('click', closeModal);
  els.btnCancelarModal?.addEventListener('click', closeModal);
  els.modalBackdrop?.addEventListener('click', (event) => {
    if (event.target === els.modalBackdrop) closeModal();
  });

  els.btnCloseConfirm?.addEventListener('click', closeConfirm);
  els.btnCancelarConfirm?.addEventListener('click', closeConfirm);
  els.btnConfirmAction?.addEventListener('click', deleteCategory);
  els.confirmBackdrop?.addEventListener('click', (event) => {
    if (event.target === els.confirmBackdrop) closeConfirm();
  });

  els.modalNombre?.addEventListener('input', clearFieldError);
  els.searchInput?.addEventListener('input', applyFilter);
  els.tableBody?.addEventListener('click', handleTableClick);

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    closeModal();
    closeConfirm();
  });
}

bindEvents();
initAdminIdentity();
loadCategories();
