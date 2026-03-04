import api from './api.js';
import { Auth } from './auth.js';

const savedUserName = document.getElementById('savedUserName');
const savedInitial = document.getElementById('savedInitial');
const savedSubtitle = document.getElementById('savedSubtitle');
const savedList = document.getElementById('savedList');
const emptyState = document.getElementById('emptyState');

let favorites = [];

function getUserName() {
  const payload = Auth.getPayload();
  return payload?.nombre || payload?.name || payload?.username || payload?.sub || 'Usuario';
}

function setHeaderUser() {
  const name = getUserName();
  const initial = name.trim().charAt(0).toUpperCase() || 'U';

  if (savedUserName) savedUserName.textContent = name;
  if (savedInitial) savedInitial.textContent = initial;
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function updateState() {
  const count = favorites.length;

  if (savedSubtitle) {
    savedSubtitle.textContent = `${count} evento${count !== 1 ? 's' : ''} guardado${count !== 1 ? 's' : ''}`;
  }

  if (count === 0) {
    savedList?.classList.add('hidden');
    emptyState?.classList.remove('hidden');
    return;
  }

  savedList?.classList.remove('hidden');
  emptyState?.classList.add('hidden');
}

function renderFavorites() {
  if (!savedList) return;

  savedList.innerHTML = '';

  favorites.forEach((fav, index) => {
    const li = document.createElement('li');
    li.className = 'saved-item';
    li.id = `saved-item-${fav.evento_id}`;
    li.style.animationDelay = `${index * 50}ms`;

    const eventId = fav.evento_id;
    const eventName = fav.evento_nombre || `Evento #${eventId}`;

    li.innerHTML = `
      <div class="saved-item-left">
        <span class="saved-num">${String(index + 1).padStart(2, '0')}</span>
        <span class="saved-name">${escHtml(eventName)}</span>
      </div>
      <div class="saved-item-right">
        <a href="event_card.html?id=${encodeURIComponent(eventId)}" class="btn-view">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span>Ver evento</span>
        </a>
        <button class="btn-remove" title="Quitar de guardados" data-event-id="${eventId}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>`;

    savedList.appendChild(li);
  });

  savedList.querySelectorAll('.btn-remove').forEach((button) => {
    button.addEventListener('click', async (event) => {
      const target = event.currentTarget;
      const eventId = target?.getAttribute('data-event-id');
      if (!eventId) return;
      await removeFavorite(Number(eventId));
    });
  });

  updateState();
}

async function loadFavorites() {
  if (savedSubtitle) savedSubtitle.textContent = 'Cargando eventos…';

  try {
    const data = await api.get('/users/favorites', Auth.authOptions());
    favorites = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Error cargando favoritos:', err);
    favorites = [];
    if (savedSubtitle) savedSubtitle.textContent = 'No se pudieron cargar los guardados';
  }

  renderFavorites();
}

async function removeFavorite(eventId) {
  try {
    await api.delete(`/users/favorites/${eventId}`, Auth.authOptions());
    favorites = favorites.filter((fav) => Number(fav.evento_id) !== Number(eventId));
    renderFavorites();
  } catch (err) {
    console.error('Error eliminando favorito:', err);
  }
}

async function init() {
  if (!Auth.isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }

  setHeaderUser();
  await loadFavorites();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
