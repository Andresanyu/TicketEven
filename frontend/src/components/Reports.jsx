import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../css/reports.css";
import api from "../lib/api.js";
import { Auth } from "../lib/auth.js";
import Sidebar from "./Sidebar.jsx";

// ── Constantes ───────────────────────────────────────────────

const PAGE_SIZE = 8;

// ── Subcomponentes ───────────────────────────────────────────

function Toast({ toast }) {
  return (
    <div
      className={`toast${toast.visible ? " show" : ""}${toast.isError ? " error" : ""}`}
      id="toast"
    >
      <div className="toast-dot" />
      <span id="toastMsg">{toast.msg}</span>
    </div>
  );
}

function BarRow({ ev, maxCount }) {
  const cnt = Number(ev.saved_count);
  const pct = Math.round((cnt / maxCount) * 100);
  return (
    <tr>
      <td className="name" title={ev.event_name}>{ev.event_name}</td>
      <td><span className="cat-tag">{ev.category_name}</span></td>
      <td>
        <div className="bar-wrap">
          <div className="bar-bg">
            <div className="bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="count-pill">{cnt}</span>
        </div>
      </td>
    </tr>
  );
}

function PaginationButtons({ currentPage, totalPages, onPageChange }) {
  const range = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1) {
      range.push(p);
    } else if (range[range.length - 1] !== "…") {
      range.push("…");
    }
  }

  return (
    <div className="page-btns" id="pageBtns">
      <button
        className="page-btn"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >←</button>

      {range.map((p, i) =>
        p === "…" ? (
          <button key={`ellipsis-${i}`} className="page-btn" disabled>…</button>
        ) : (
          <button
            key={p}
            className={`page-btn${p === currentPage ? " current" : ""}`}
            onClick={() => onPageChange(p)}
          >{p}</button>
        )
      )}

      <button
        className="page-btn"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >→</button>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────

export default function Reports() {
  const navigate = useNavigate();
  const [popularity, setPopularity] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [toast, setToast] = useState({ visible: false, msg: "", isError: false });
  const [fetchError, setFetchError] = useState(false);

  const toastTimer = useRef(null);

  // ── Toast ────────────────────────────────────────────────
  const showToast = useCallback((msg, isError = false) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, msg, isError });
    toastTimer.current = setTimeout(
      () => setToast((prev) => ({ ...prev, visible: false })),
      3500
    );
  }, []);

  // ── Fetch ────────────────────────────────────────────────
  const loadReport = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const data = await api.get("/events/reports/popularity", Auth.authOptions());
      const events = Array.isArray(data?.events) ? data.events : [];
      setPopularity(events);
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
      setFetchError(true);
      showToast("No se pudieron cargar los datos del reporte.", true);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!Auth.isLoggedIn()) {
      navigate("/login");
      return;
    }
    loadReport();
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, [loadReport, navigate]);

  if (!Auth.isLoggedIn()) {
    return null;
  }

  // ── Derivados ────────────────────────────────────────────
  const top      = popularity[0] ?? null;
  const topCount = top ? Number(top.saved_count) : 0;
  const maxCount = topCount || 1;

  const total      = popularity.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start      = (currentPage - 1) * PAGE_SIZE;
  const slice      = popularity.slice(start, start + PAGE_SIZE);

  const pageInfoText = total
    ? `Mostrando ${start + 1}–${Math.min(start + PAGE_SIZE, total)} de ${total}`
    : "0 eventos";

  // ── Render ───────────────────────────────────────────────
  return (
    <>
      <Sidebar activeItem="reportes" />

      <main className="main">

        {/* Page header */}
        <header className="page-header">
          <div className="page-header-left">
            <p className="page-eyebrow">
              <Link to="/admin-dashboard" className="breadcrumb-link">Panel</Link>
              <span className="breadcrumb-sep">›</span>
              Reportes
            </p>
            <h1 className="page-title">
              Reportes de Popularidad<span className="title-dot">.</span>
            </h1>
          </div>
          <button
            className="btn-secondary"
            id="refreshBtn"
            onClick={() => {
              showToast("Actualizando datos…");
              loadReport();
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 .49-4.12" />
            </svg>
            Actualizar
          </button>
        </header>

        {/* Stat card */}
        <div className="stats-row">
          <div className="stat-card red">
            <div className="stat-label">Evento más popular</div>
            <div className="stat-value" id="statTop" style={{ fontSize: 16, lineHeight: 1.3 }}>
              {loading ? "—" : top && topCount > 0 ? top.event_name : "—"}
            </div>
            <div className="stat-sub" id="statTopCount">
              {!loading && top && topCount > 0
                ? `${topCount} guardado${topCount !== 1 ? "s" : ""}`
                : ""}
            </div>
          </div>
        </div>

        {/* Tabla completa */}
        <div className="grid-full panel">
          <div className="panel-header">
            <div className="panel-title">Todos los guardados</div>
            <span id="totalCount" style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {loading ? "— registros" : `${total} evento${total !== 1 ? "s" : ""}`}
            </span>
          </div>

          <table className="fav-table">
            <thead>
              <tr>
                <th>Evento</th>
                <th>Categoría</th>
                <th>Guardados</th>
              </tr>
            </thead>
            <tbody id="fullBody">
              {loading ? (
                <tr className="loading-row">
                  <td colSpan="3">
                    <span className="spinner-sm" />
                    Cargando popularidad…
                  </td>
                </tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan="3">
                    <div className="empty-state">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8"  x2="12"    y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <p>Error al conectar con el servidor</p>
                    </div>
                  </td>
                </tr>
              ) : slice.length === 0 ? (
                <tr>
                  <td colSpan="3">
                    <div className="empty-state">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                      </svg>
                      <p>Sin resultados para la búsqueda</p>
                    </div>
                  </td>
                </tr>
              ) : (
                slice.map((ev, i) => (
                  <BarRow key={ev.event_name + i} ev={ev} maxCount={maxCount} />
                ))
              )}
            </tbody>
          </table>

          <div className="panel-footer">
            <span className="page-info" id="pageInfo">
              {loading ? "—" : pageInfoText}
            </span>
            {!loading && !fetchError && total > 0 && (
              <PaginationButtons
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </div>
        </div>

      </main>

      <Toast toast={toast} />
    </>
  );
}