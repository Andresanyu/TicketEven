import { Link, useNavigate } from "react-router-dom";
import { Auth } from "../services/auth.js";

// Sidebar.jsx
// ─────────────────────────────────────────────────────────────
// Uso:
//   <Sidebar activeItem="inicio" />
//   <Sidebar activeItem="eventos" adminName="Carlos" adminInitial="C" />
//
// activeItem acepta: "inicio" | "eventos" | "categorias" | "reportes" | "aforo"
// ─────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  {
    key:   "inicio",
    label: "Inicio",
    href:  "/admin-dashboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3"  y="3"  width="7" height="7" rx="1" />
        <rect x="14" y="3"  width="7" height="7" rx="1" />
        <rect x="3"  y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    key:   "eventos",
    label: "Eventos",
    href:  "/events",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2"  x2="16" y2="6"  />
        <line x1="8"  y1="2"  x2="8"  y2="6"  />
        <line x1="3"  y1="10" x2="21" y2="10" />
        <line x1="12" y1="14" x2="12" y2="18" />
        <line x1="10" y1="16" x2="14" y2="16" />
      </svg>
    ),
  },
  {
    key:   "categorias",
    label: "Categorías",
    href:  "/categories",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 7h7M3 12h7M3 17h7" />
        <rect x="13" y="5"  width="8" height="4" rx="1" />
        <rect x="13" y="10" width="8" height="4" rx="1" />
        <rect x="13" y="15" width="8" height="4" rx="1" />
      </svg>
    ),
  },
  {
    key:   "reportes",
    label: "Reportes",
    href:  "/reports",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4"  />
        <line x1="6"  y1="20" x2="6"  y2="14" />
        <polyline points="2 20 22 20" />
      </svg>
    ),
  },
  {
    key:   "aforo",
    label: "Aforo",
    href:  "/capacity-report",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

export default function Sidebar({
  activeItem   = "inicio",
  adminName    = "Administrador",
  adminInitial = "A",
}) {
  const navigate = useNavigate();

  function handleLogout() {
    Auth.logout();
    navigate("/login");
  }

  return (
    <aside className="sidebar">

      {/* ── Logo ── */}
      <div className="sidebar-logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        EventPro
      </div>

      {/* ── Navegación ── */}
      <nav className="sidebar-nav">
        <span className="nav-section-label">Principal</span>

        {NAV_ITEMS.map(({ key, label, href, icon }) => {
          const isActive = activeItem === key;
          return (
            <Link
              key={key}
              to={href}
              className={`nav-item${isActive ? " active" : ""}`}
            >
              {icon}
              {label}
              {isActive && <span className="nav-active-bar" />}
            </Link>
          );
        })}
      </nav>

      {/* ── Footer con datos del admin ── */}
      <div className="sidebar-footer">
        <div className="sidebar-admin">
          <div className="admin-avatar" id="sidebarAvatar">
            {adminInitial}
          </div>
          <div className="admin-info">
            <span className="admin-name" id="sidebarName">
              {adminName}
            </span>
            <span className="admin-role">Admin</span>
          </div>
        </div>
        <button type="button" className="sidebar-logout-btn" onClick={handleLogout}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Cerrar sesión
        </button>
      </div>

    </aside>
  );
}