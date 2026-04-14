import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../css/styles.css";
import api from "../services/api.js";
import { Auth } from "../services/auth.js";

// ── Constantes ───────────────────────────────────────────────

const PAGE_SIZE = 10;

const CATEGORY_COLORS = {
  Música:  { bg: "#1a1a2e", emoji: "🎵" },
  Teatro:  { bg: "#1e1a2e", emoji: "🎭" },
  Deporte: { bg: "#1a2e1e", emoji: "⚽" },
  Arte:    { bg: "#2e1a1a", emoji: "🎨" },
  Tech:    { bg: "#1a2028", emoji: "💻" },
  Comedia: { bg: "#2e2a1a", emoji: "😂" },
};

const SORT_FNS = {
  default: null,
  date: (a, b) => {
    const now = Date.now();
    return Math.abs(a._ts - now) - Math.abs(b._ts - now);
  },
  alpha: (a, b) =>
    (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase(), "es"),
  category: (a, b) => {
    const byCat = (a.category || "")
      .toLowerCase()
      .localeCompare((b.category || "").toLowerCase(), "es");
    if (byCat !== 0) return byCat;
    return (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase(), "es");
  },
};

const SORT_LABELS = {
  default:  "Ordenar",
  date:     "Por fecha",
  alpha:    "A → Z",
  category: "Por categoría",
};

// ── Helpers ──────────────────────────────────────────────────

function mapEvent(ev, idx) {
  return {
    _idx: idx,
    _ts:  ev.fecha ? new Date(ev.fecha).getTime() : 0,
    id:   ev.id,
    name: ev.nombre,
    date: ev.fecha
      ? new Date(ev.fecha).toLocaleDateString("es-CO", {
          year: "numeric", month: "short", day: "numeric",
        })
      : "Sin fecha",
    price:    ev.valor ? `$${Number(ev.valor).toLocaleString("es-CO")}` : "Gratis",
    category: ev.categoria || "Sin categoría",
    image_url: ev.imagen_url,
  };
}

function getUserFromToken() {
  const payload = Auth.getPayload();
  if (!payload) return null;
  const name =
    payload.nombre || payload.name || payload.username ||
    payload.user_name || payload.sub || "Usuario";
  const email = payload.email || payload.mail || "Sin correo";
  return { name, email };
}

function getSorted(events, sortKey) {
  const fn = SORT_FNS[sortKey];
  return fn ? [...events].sort(fn) : [...events];
}

// ── Subcomponentes ───────────────────────────────────────────

function EventCard({ ev }) {
  const info    = CATEGORY_COLORS[ev.category] || { bg: "#1a1c19", emoji: "🎪" };
  const isGratis = ev.price === "Gratis";

  return (
    <Link
      className="event-card"
      to={`/event?id=${encodeURIComponent(ev.id)}`}
      aria-label={`Ver detalle de ${ev.name}`}
    >
      <div className="card-img-placeholder" style={{ background: info.bg }}>
        <span style={{ fontSize: 32, zIndex: 1, position: "relative" }}>{info.emoji}</span>
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(circle at 30% 40%,rgba(198,241,53,.08) 0%,transparent 70%)",
        }} />
      </div>
      <div className="card-body">
        <div className="card-category">{ev.category}</div>
        <div className="card-name">{ev.name}</div>
        <div className="card-meta">
          <div className="card-date">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8"  y1="2" x2="8"  y2="6" />
              <line x1="3"  y1="10" x2="21" y2="10" />
            </svg>
            {ev.date}
          </div>
          <div className={`card-price${isGratis ? " free" : ""}`}>
            {isGratis ? "✦ GRATIS" : ev.price}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Componente principal ─────────────────────────────────────

export default function PublicEvents() {
  const navigate = useNavigate();
  const [allEvents, setAllEvents]       = useState([]);
  const [sortKey, setSortKey]           = useState("default");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadError, setLoadError]       = useState(false);
  const [userDropOpen, setUserDropOpen] = useState(false);
  const [sortDropOpen, setSortDropOpen] = useState(false);

  const user      = Auth.isLoggedIn() ? getUserFromToken() : null;
  const initial   = user?.name?.trim().charAt(0).toUpperCase() || "U";

  const userBtnRef = useRef(null);
  const sortWrapRef = useRef(null);

  // ── Fetch inicial ────────────────────────────────────────
  useEffect(() => {
    async function loadEvents() {
      try {
        const events = await api.get("/events");
        const mapped = events
          .filter((e) => e.activo !== false)
          .map(mapEvent);
        setAllEvents(mapped);
      } catch (err) {
        console.error("Error cargando eventos:", err);
        setLoadError(true);
      }
    }
    loadEvents();
  }, []);

  // ── Cierre de dropdowns al hacer clic fuera ──────────────
  useEffect(() => {
    function handleOutsideClick(e) {
      if (userBtnRef.current && !userBtnRef.current.contains(e.target)) {
        setUserDropOpen(false);
      }
      if (sortWrapRef.current && !sortWrapRef.current.contains(e.target)) {
        setSortDropOpen(false);
      }
    }
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  // ── Derivados ────────────────────────────────────────────
  const sorted  = getSorted(allEvents, sortKey);
  const visible = sorted.slice(0, visibleCount);
  const total   = sorted.length;
  const shown   = Math.min(visibleCount, total);
  const hasMore = shown < total;

  // ── Handlers ─────────────────────────────────────────────
  const toggleSort = useCallback((e) => {
    e.stopPropagation();
    setSortDropOpen((prev) => !prev);
  }, []);

  const applySort = useCallback((type) => {
    setSortKey(type);
    setVisibleCount(PAGE_SIZE);
    setSortDropOpen(false);
  }, []);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  }, []);

  const handleLogout = useCallback((e) => {
    e.stopPropagation();
    Auth.logout();
    navigate("/");
  }, [navigate]);

  // ── Render ────────────────────────────────────────────────
  return (
    <main className="main public-main">

      {/* Page header */}
      <div className="page-header">
        <h1 className="page-title">Eventos<span>.</span></h1>

        <div className="header-actions">

          {/* Botón login / menú usuario */}
          {!user ? (
            <Link to="/login" className="login-btn" id="loginBtn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              Iniciar sesión
            </Link>
          ) : (
            <div
              className={`user-btn${userDropOpen ? " open" : ""}`}
              id="userBtn"
              ref={userBtnRef}
              onClick={(e) => { e.stopPropagation(); setUserDropOpen((p) => !p); }}
            >
              <div className="user-avatar">
                <span className="user-initial" id="userInitial">{initial}</span>
              </div>
              <span className="user-name" id="userName">{user.name}</span>
              <svg className="user-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>

              {userDropOpen && (
                <div className="user-dropdown" id="userDropdown">
                  <div className="user-dropdown-header">
                    <span className="ud-name" id="udName">{user.name}</span>
                  </div>
                  <hr className="ud-sep" />
                  <Link
                    to="/saved-events"
                    className="ud-item ud-saved"
                    id="savedBtn"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                    Mis guardados
                  </Link>
                  <Link
                  to="/my-purchases"
                  className="ud-item ud-saved"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 9a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v1a2 2 0 0 0 0 4v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-1a2 2 0 0 0 0-4V9z"/>
                  </svg>
                  Mis compras
                </Link>
                  <hr className="ud-sep" />
                  <button className="ud-item ud-logout" id="logoutBtn" onClick={handleLogout}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Botón ordenar */}
          <div className="sort-wrap" id="sortWrap" ref={sortWrapRef}>
            <button
              className={`sort-btn${sortDropOpen ? " open" : ""}${sortKey !== "default" ? " has-filter" : ""}`}
              id="sortBtn"
              onClick={toggleSort}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3"  y1="6"  x2="21" y2="6" />
                <line x1="6"  y1="12" x2="18" y2="12" />
                <line x1="9"  y1="18" x2="15" y2="18" />
              </svg>
              <span id="sortLabel">{SORT_LABELS[sortKey]}</span>
              <div className="sort-dot"></div>
              <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {sortDropOpen && (
              <div className="sort-dropdown open" id="sortDrop">
                <div className="dd-label">Ordenar por</div>

                {/* Por defecto */}
                <div
                  className={`dd-item${sortKey === "default" ? " active" : ""}`}
                  id="opt-default"
                  onClick={() => applySort("default")}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="8"  y1="6"  x2="21" y2="6" />
                    <line x1="8"  y1="12" x2="21" y2="12" />
                    <line x1="8"  y1="18" x2="21" y2="18" />
                    <line x1="3"  y1="6"  x2="3.01" y2="6" />
                    <line x1="3"  y1="12" x2="3.01" y2="12" />
                    <line x1="3"  y1="18" x2="3.01" y2="18" />
                  </svg>
                  Por defecto
                  <svg className="dd-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>

                <hr className="dd-sep" />

                {/* Próximo a vencer */}
                <div
                  className={`dd-item${sortKey === "date" ? " active" : ""}`}
                  id="opt-date"
                  onClick={() => applySort("date")}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8"  y1="2" x2="8"  y2="6" />
                    <line x1="3"  y1="10" x2="21" y2="10" />
                  </svg>
                  Próximo a vencer
                  <svg className="dd-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>

                {/* Alfabético */}
                <div
                  className={`dd-item${sortKey === "alpha" ? " active" : ""}`}
                  id="opt-alpha"
                  onClick={() => applySort("alpha")}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="4 7 4 4 20 4 20 7" />
                    <line x1="9"  y1="20" x2="15" y2="20" />
                    <line x1="12" y1="4"  x2="12" y2="20" />
                  </svg>
                  Alfabético (A → Z)
                  <svg className="dd-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>

                {/* Por categoría */}
                <div
                  className={`dd-item${sortKey === "category" ? " active" : ""}`}
                  id="opt-category"
                  onClick={() => applySort("category")}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 7h7M3 12h7M3 17h7" />
                    <rect x="13" y="5"  width="8" height="4" rx="1" />
                    <rect x="13" y="10" width="8" height="4" rx="1" />
                    <rect x="13" y="15" width="8" height="4" rx="1" />
                  </svg>
                  Por categoría
                  <svg className="dd-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>
            )}
          </div>
          {/* /Botón ordenar */}

        </div>
      </div>

      {/* Grid de eventos */}
      <div className="events-grid" id="grid">
        {visible.map((ev) => (
          <EventCard key={ev.id} ev={ev} />
        ))}
      </div>

      {/* Load more */}
      <div className="load-more-wrap">
        <div style={{ textAlign: "center" }}>
          <button
            className="load-more-btn"
            id="loadMoreBtn"
            onClick={loadMore}
            disabled={!hasMore}
          >
            <span>{hasMore ? "Visualizar más" : "Sin más eventos"}</span>
            <span style={{ fontSize: 18, lineHeight: 1 }}>↓</span>
          </button>
          <div className="count-badge" id="countBadge">
            {loadError
              ? "Error al cargar eventos"
              : total > 0
              ? `Mostrando ${shown} de ${total} eventos`
              : ""}
          </div>
        </div>
      </div>

    </main>
  );
}