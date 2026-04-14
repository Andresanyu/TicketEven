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
import { Link, useNavigate } from "react-router-dom";
import "../../css/admin_dashboard.css";
import { Auth }  from "../services/auth.js";
import Sidebar   from "../components/Sidebar.jsx";

// ── Tarjetas de navegación rápida ────────────────────────────
// Array de datos para que el JSX no quede repetitivo
const CARDS = [
  {
    key:      "eventos",
    href:     "/events",
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
    href:     "/categories",
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
    href:     "/reports",
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
  const navigate = useNavigate();

  // ── Nombre del admin y su inicial (desde el JWT) ──────────
  const [adminName,    setAdminName]    = useState("Administrador");
  const [adminInitial, setAdminInitial] = useState("A");
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState(false);

  // ── Fecha formateada en español ───────────────────────────
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    if (!Auth.isLoggedIn()) {
      navigate("/login");
      return;
    }
    if (Auth.getRol() !== "admin") {
      navigate("/");
      return;
    }

    setCurrentDate(
      new Date().toLocaleDateString("es-CO", {
        weekday: "long",
        year:    "numeric",
        month:   "long",
        day:     "numeric",
      })
    );

    const payload = Auth.getPayload() || {};
    const name    = payload.nombre || payload.name || payload.username || payload.sub || "Administrador";
    const initial = name.trim().charAt(0).toUpperCase() || "A";

    setAdminName(name);
    setAdminInitial(initial);
  }, [navigate]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:4001/api/admin/metrics', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Error');
        const data = await res.json();
        setMetrics(data);
        setMetricsError(false);
      } catch {
        setMetricsError(true);
      } finally {
        setMetricsLoading(false);
      }
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!Auth.isLoggedIn() || Auth.getRol() !== "admin") {
    return null;
  }

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

        <section className="metrics-section">
          <p className="cards-label">Métricas globales</p>
          <div className="metrics-grid">
            <div className="metric-card" style={{ "--delay": "0ms" }}>
              <div className="metric-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="7" width="20" height="14" rx="2"/>
                  <path d="M16 7V5a2 2 0 0 0-4 0v2"/>
                  <line x1="12" y1="12" x2="12" y2="16"/>
                  <line x1="10" y1="14" x2="14" y2="14"/>
                </svg>
              </div>
              <div className="metric-body">
                <span className="metric-value">
                  {metricsLoading ? "—" : metrics?.total_tickets ?? "—"}
                </span>
                <span className="metric-label">Boletas emitidas</span>
              </div>
            </div>

            <div className="metric-card" style={{ "--delay": "60ms" }}>
              <div className="metric-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                  <circle cx="12" cy="16" r="2" fill="currentColor" stroke="none" opacity=".4"/>
                </svg>
              </div>
              <div className="metric-body">
                <span className="metric-value">
                  {metricsLoading ? "—" : metrics?.active_events ?? "—"}
                </span>
                <span className="metric-label">Eventos activos</span>
              </div>
            </div>

            <div className="metric-card" style={{ "--delay": "120ms" }}>
              <div className="metric-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  <line x1="9" y1="14" x2="15" y2="14"/>
                </svg>
              </div>
              <div className="metric-body">
                <span className="metric-value">
                  {metricsLoading ? "—" : metrics?.past_events ?? "—"}
                </span>
                <span className="metric-label">Eventos pasados</span>
              </div>
            </div>

            <div className="metric-card" style={{ "--delay": "180ms" }}>
              <div className="metric-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div className="metric-body">
                <span className="metric-value">
                  {metricsLoading ? "—" : metrics?.total_users ?? "—"}
                </span>
                <span className="metric-label">Usuarios registrados</span>
              </div>
            </div>
          </div>
          {metricsError && (
            <p className="metrics-error">No se pudieron cargar las métricas</p>
          )}
        </section>

        {/* Grid de tarjetas */}
        <section className="cards-section">
          <p className="cards-label">Accesos rápidos</p>

          <div className="cards-grid">
            {CARDS.map(({ key, href, delay, title, subtitle, icon }) => (
              <Link
                key={key}
                to={href}
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
              </Link>
            ))}
          </div>
        </section>

      </div>
    </>
  );
}