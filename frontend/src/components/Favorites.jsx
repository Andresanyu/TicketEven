import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../css/favorites.css";
import api from "../lib/api.js";
import { Auth } from "../lib/auth.js";
import Sidebar from "./Sidebar.jsx";

// ── Helpers ──────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return d.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatValor(valor) {
  if (!valor || Number(valor) === 0) return "Gratis";
  return `$${Number(valor).toLocaleString("es-CO")}`;
}

// ── Subcomponentes ───────────────────────────────────────────

function FavRow({ fav }) {
  const name  = fav.evento_nombre  ?? "Sin nombre";
  const user  = fav.usuario_nombre ?? "";
  const email = fav.usuario_email  ?? "";
  const date  = formatDate(fav.evento_fecha ?? fav.fecha_agregado);
  const valor = formatValor(fav.evento_valor);

  return (
    <div className="fav-row" data-id={fav.favorito_id}>
      <div className="fav-row-thumb">🗓️</div>
      <div className="fav-row-info">
        <div className="fav-row-name">{name}</div>
        <div className="fav-row-meta">
          <span className="fav-badge">{valor}</span>
          <span className="fav-row-date">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {user}
          </span>
          <span className="fav-row-date">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8"  y1="2" x2="8"  y2="6" />
              <line x1="3"  y1="10" x2="21" y2="10" />
            </svg>
            {date ?? "—"}
          </span>
        </div>
      </div>
      <div className="fav-row-email">{email}</div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────

export default function Favorites() {
  const navigate = useNavigate();
  const [favs, setFavs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState({ visible: false, msg: "", type: "success" });

  // ── Toast ──────────────────────────────────────────────────
  const showToast = useCallback((msg, type = "success") => {
    setToast({ visible: true, msg, type });
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 3200);
  }, []);

  // ── Fetch ──────────────────────────────────────────────────
  useEffect(() => {
    if (!Auth.isLoggedIn()) {
      navigate("/login");
      return;
    }
    if (Auth.getRol() !== "admin") {
      navigate("/");
      return;
    }

    async function init() {
      try {
        const data = await api.get("/users/favorites/all", Auth.authOptions());
        setFavs(data);
      } catch (err) {
        console.error("Error cargando favoritos:", err);
        if (err?.status === 401 || err?.message?.includes("401")) {
          Auth.logout();
          navigate("/login");
        } else {
          showToast("Error al cargar los favoritos.", "error");
        }
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [showToast, navigate]);

  if (!Auth.isLoggedIn() || Auth.getRol() !== "admin") {
    return null;
  }

  // ── Contador ───────────────────────────────────────────────
  const counterLabel = loading
    ? "—"
    : `${favs.length} favorito${favs.length !== 1 ? "s" : ""}`;

  // ── Render ─────────────────────────────────────────────────
  return (
    <>
      <Sidebar activeItem="favoritos" />

      <main className="main">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">
              Eventos <span>Favoritos</span>
            </h1>
            <div className="breadcrumb">
              <Link to="/">Inicio</Link>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              Favoritos
            </div>
          </div>
          <div
            className="counter"
            id="counter"
            dangerouslySetInnerHTML={{
              __html: loading
                ? "—"
                : `<strong>${favs.length}</strong> favorito${favs.length !== 1 ? "s" : ""}`,
            }}
          />
        </div>

        {/* Estado: cargando */}
        {loading && (
          <div className="state-box" id="stateLoading">
            <div className="spinner-lg"></div>
            <span>Cargando favoritos…</span>
          </div>
        )}

        {/* Estado: sin datos */}
        {!loading && favs.length === 0 && (
          <div className="state-box" id="stateEmpty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <p>Aún no hay eventos marcados como favoritos.</p>
          </div>
        )}

        {/* Lista */}
        {!loading && favs.length > 0 && (
          <div className="fav-list" id="favList">
            {favs.map((fav) => (
              <FavRow key={fav.favorito_id} fav={fav} />
            ))}
          </div>
        )}
      </main>

      {/* Toast */}
      <div
        className={`toast${toast.type === "error" ? " error" : ""}${toast.visible ? " show" : ""}`}
        id="toast"
      >
        <span className="toast-dot"></span>
        <span id="toastMsg">{toast.msg}</span>
      </div>
    </>
  );
}