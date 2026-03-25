// Sidebar.jsx
// ─────────────────────────────────────────────────────────────
// Uso:
//   <Sidebar activeItem="inicio" />
//   <Sidebar activeItem="eventos" adminName="Carlos" adminInitial="C" />
//
// activeItem acepta: "inicio" | "eventos" | "categorias" | "reportes"
// ─────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  {
    key:   "inicio",
    label: "Inicio",
    href:  "admin_dashboard.html",
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
    href:  "events.html",
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
    href:  "categories.html",
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
    href:  "reports.html",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4"  />
        <line x1="6"  y1="20" x2="6"  y2="14" />
        <polyline points="2 20 22 20" />
      </svg>
    ),
  },
];

export default function Sidebar({
  activeItem   = "inicio",
  adminName    = "Administrador",
  adminInitial = "A",
}) {
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
            <a
              key={key}
              href={href}
              className={`nav-item${isActive ? " active" : ""}`}
            >
              {icon}
              {label}
              {isActive && <span className="nav-active-bar" />}
            </a>
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
      </div>

    </aside>
  );
}