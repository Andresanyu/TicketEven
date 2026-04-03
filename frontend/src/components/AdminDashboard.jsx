// AdminDashboard.jsx
// ─────────────────────────────────────────────────────────────
// Migración de admin_dashboard.html + admin_dashboard.js a React.
// Mantiene clases CSS idénticas al original.
//
// Requiere:
//   - ./auth.js   (Auth.requireAdmin, Auth.getPayload)
//   - ./Sidebar.jsx
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { Auth }  from "./auth.js";   // 👉 ajusta la ruta si cambia
import Sidebar   from "./Sidebar.jsx";

// Guardia de admin (igual que el JS original)
Auth.requireAdmin("./login.html");

// ── Tarjetas de navegación rápida ────────────────────────────
// Array de datos para que el JSX no quede repetitivo
const CARDS = [
  {
    key:      "eventos",
    href:     "events.html",
    delay:    "0ms",
    title:    "Gestión de Eventos",
    subtitle: "Administra, crea y edita los eventos del sistema",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
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
    key:      "categorias",
    href:     "categories.html",
    delay:    "80ms",
    title:    "Gestión de Categorías",
    subtitle: "Administra las categorías para clasificar eventos",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 7h7M3 12h7M3 17h7" />
        <rect x="13" y="5"  width="8" height="4" rx="1" />
        <rect x="13" y="10" width="8" height="4" rx="1" />
        <rect x="13" y="15" width="8" height="4" rx="1" />
      </svg>
    ),
  },
  {
    key:      "reportes",
    href:     "reports.html",
    delay:    "160ms",
    title:    "Reportes de Popularidad",
    subtitle: "Visualiza qué eventos son los más guardados por los usuarios",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4"  />
        <line x1="6"  y1="20" x2="6"  y2="14" />
        <polyline points="2 20 22 20" />
        <circle cx="18" cy="8" r="2" fill="currentColor" stroke="none" opacity=".3" />
        <circle cx="12" cy="2" r="2" fill="currentColor" stroke="none" opacity=".3" />
      </svg>
    ),
  },
];

// ── Ícono de flecha (compartido por todas las tarjetas) ───────
function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════
export default function AdminDashboard() {

  // ── Nombre del admin y su inicial (desde el JWT) ──────────
  const [adminName,    setAdminName]    = useState("Administrador");
  const [adminInitial, setAdminInitial] = useState("A");

  // ── Fecha formateada en español ───────────────────────────
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    // ── Fecha (equivale al bloque dateEl del JS original) ──
    setCurrentDate(
      new Date().toLocaleDateString("es-CO", {
        weekday: "long",
        year:    "numeric",
        month:   "long",
        day:     "numeric",
      })
    );

    // ── Identidad del admin (equivale al bloque payload del JS original) ──
    const payload = Auth.getPayload() || {};
    const name    = payload.nombre || payload.name || payload.username || payload.sub || "Administrador";
    const initial = name.trim().charAt(0).toUpperCase() || "A";

    setAdminName(name);
    setAdminInitial(initial);
  }, []); // [] → ejecuta solo al montar, igual que el JS original que corre una sola vez

  // ── Render ────────────────────────────────────────────────
  return (
    <>
      {/*
        Sidebar global reutilizable.
        Si en tu router ya renderizas <Sidebar /> en un layout padre,
        elimina esta línea y déjalo únicamente en el layout.
      */}
      <Sidebar activeItem="inicio" adminName={adminName} adminInitial={adminInitial} />

      {/* ── Contenido principal ── */}
      <div className="main">

        {/* Header */}
        <header className="dash-header">
          <div className="dash-header-left">
            <p className="dash-eyebrow">Panel de Control</p>
            <h1 className="dash-title">
              Bienvenido, <span id="headerName">{adminName}</span>
              <span className="title-dot">.</span>
            </h1>
          </div>
          <div className="dash-header-right">
            {/* Fecha — id mantenido por compatibilidad con CSS/QA existente */}
            <div className="dash-date" id="dashDate">
              {currentDate}
            </div>
          </div>
        </header>

        {/* Separador decorativo */}
        <div className="dash-divider" />

        {/* Grid de tarjetas */}
        <section className="cards-section">
          <p className="cards-label">Accesos rápidos</p>

          <div className="cards-grid">
            {CARDS.map(({ key, href, delay, title, subtitle, icon }) => (
              <a
                key={key}
                href={href}
                className="dash-card"
                style={{ "--delay": delay }}
              >
                <div className="card-glow" />

                <div className="card-icon-wrap">
                  {icon}
                </div>

                <div className="card-content">
                  <h2 className="card-title">{title}</h2>
                  <p className="card-subtitle">{subtitle}</p>
                </div>

                <div className="card-arrow">
                  <ArrowIcon />
                </div>
              </a>
            ))}
          </div>
        </section>

      </div>
    </>
  );
}