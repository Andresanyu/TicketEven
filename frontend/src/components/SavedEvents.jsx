import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "./api.js";
import { Auth } from "./auth.js";

// ── Helper ───────────────────────────────────────────────────

function getUserName() {
  const payload = Auth.getPayload();
  return (
    payload?.nombre || payload?.name ||
    payload?.username || payload?.sub || "Usuario"
  );
}

// ── Subcomponente ────────────────────────────────────────────

function SavedItem({ fav, index, onRemove }) {
  const eventId   = fav.evento_id;
  const eventName = fav.evento_nombre || `Evento #${eventId}`;

  return (
    <li
      className="saved-item"
      id={`saved-item-${eventId}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="saved-item-left">
        <span className="saved-num">{String(index + 1).padStart(2, "0")}</span>
        <span className="saved-name">{eventName}</span>
      </div>
      <div className="saved-item-right">
        <Link
          to={`/event?id=${encodeURIComponent(eventId)}`}
          className="btn-view"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span>Ver evento</span>
        </Link>
        <button
          className="btn-remove"
          title="Quitar de guardados"
          onClick={() => onRemove(eventId)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6"  x2="6"  y2="18" />
            <line x1="6"  y1="6"  x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </li>
  );
}

// ── Componente principal ─────────────────────────────────────

export default function SavedEvents() {
  const [savedEvents, setSavedEvents] = useState([]);
  const [userName, setUserName]       = useState("…");
  const [initial, setInitial]         = useState("U");
  const [subtitle, setSubtitle]       = useState("Cargando eventos…");
  const [loading, setLoading]         = useState(true);

  // ── Fetch ──────────────────────────────────────────────────
  const loadSavedEvents = useCallback(async () => {
    setSubtitle("Cargando eventos…");
    setLoading(true);
    try {
      const data = await api.get("/users/saved-events", Auth.authOptions());
      const events = Array.isArray(data) ? data : [];
      setSavedEvents(events);
      setSubtitle(buildSubtitle(events.length));
    } catch (err) {
      console.error("Error cargando guardados:", err);
      setSavedEvents([]);
      setSubtitle("No se pudieron cargar los guardados");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!Auth.isLoggedIn()) {
      window.location.href = "/login";
      return;
    }

    const name = getUserName();
    setUserName(name);
    setInitial(name.trim().charAt(0).toUpperCase() || "U");

    loadSavedEvents();
  }, [loadSavedEvents]);

  // Sincroniza el subtítulo cuando cambia la lista
  useEffect(() => {
    if (!loading) setSubtitle(buildSubtitle(savedEvents.length));
  }, [savedEvents.length, loading]);

  // ── Optimistic remove ──────────────────────────────────────
  const handleRemove = useCallback(async (eventId) => {
    // 1. Actualizar UI de inmediato
    setSavedEvents((prev) =>
      prev.filter((fav) => Number(fav.evento_id) !== Number(eventId))
    );

    // 2. Confirmar con la API (silencioso si falla — la UI ya actuó)
    try {
      await api.delete(`/users/saved-events/${eventId}`, Auth.authOptions());
    } catch (err) {
      console.error("Error eliminando guardado:", err);
      // Revertir si la API rechaza
      loadSavedEvents();
    }
  }, [loadSavedEvents]);

  // ── Derivados ──────────────────────────────────────────────
  const isEmpty = !loading && savedEvents.length === 0;

  // ── Render ─────────────────────────────────────────────────
  return (
    <>
      {/* Navbar */}
      <nav className="navbar">
        <Link to="/" className="nav-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          EventPro
        </Link>
        <Link to="/" className="nav-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Volver a eventos
        </Link>
      </nav>

      <main className="saved-wrap">

        {/* Cabecera */}
        <div className="saved-header">
          <div className="saved-header-left">
            <div className="saved-avatar" id="savedAvatar">
              <span id="savedInitial">{initial}</span>
            </div>
            <div className="saved-header-info">
              <h1 className="saved-title">
                Guardados de <span id="savedUserName">{userName}</span>
              </h1>
              <p className="saved-subtitle" id="savedSubtitle">{subtitle}</p>
            </div>
          </div>
        </div>

        {/* Estado vacío */}
        {isEmpty && (
          <div className="empty-state" id="emptyState">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="empty-title">Aún no tienes eventos guardados</p>
            <p className="empty-hint">Explora los eventos y guarda los que más te gusten.</p>
            <Link to="/" className="btn-explore">Ver todos los eventos</Link>
          </div>
        )}

        {/* Lista */}
        {!isEmpty && (
          <ul className="saved-list" id="savedList">
            {savedEvents.map((fav, index) => (
              <SavedItem
                key={fav.evento_id}
                fav={fav}
                index={index}
                onRemove={handleRemove}
              />
            ))}
          </ul>
        )}

      </main>
    </>
  );
}

// ── Util ─────────────────────────────────────────────────────

function buildSubtitle(count) {
  return `${count} evento${count !== 1 ? "s" : ""} guardado${count !== 1 ? "s" : ""}`;
}