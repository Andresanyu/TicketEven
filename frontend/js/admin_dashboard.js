import { Auth } from './auth.js';

// Protect route: requires active session and admin role.
Auth.requireAdmin('./login.html');

const dateEl = document.getElementById('dashDate');
if (dateEl) {
  dateEl.textContent = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const payload = Auth.getPayload() || {};
const name = payload.nombre || payload.name || payload.username || payload.sub || 'Administrador';
const initial = name.trim().charAt(0).toUpperCase();

const headerName = document.getElementById('headerName');
const sidebarName = document.getElementById('sidebarName');
const sidebarAvatar = document.getElementById('sidebarAvatar');

if (headerName) headerName.textContent = name;
if (sidebarName) sidebarName.textContent = name;
if (sidebarAvatar) sidebarAvatar.textContent = initial;
