import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../css/purchases.css";
import api from "../lib/api.js";
import { Auth } from "../lib/auth.js";
import Sidebar from "./Sidebar.jsx";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("es-CO", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function formatPrice(value) {
  if (!value && value !== 0) return "—";
  if (Number(value) === 0) return "Gratis";
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", minimumFractionDigits: 0,
  }).format(value);
}

// ── Tarjeta de compra ─────────────────────────────────────────────────────────

function PurchaseCard({ purchase }) {
  const {
    evento_nombre,
    tipo_entrada_nombre,
    cantidad,
    total,
    fecha_compra,
    estado,
  } = purchase;

  return (
    <div className="purchase-card">
      {/* Ícono */}
      <div className="purchase-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M2 9a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v1a2 2 0 0 0 0 4v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-1a2 2 0 0 0 0-4V9z"/>
        </svg>
      </div>

      {/* Info */}
      <div className="purchase-info">
        <span className="purchase-event">{evento_nombre ?? "Sin nombre"}</span>
        <div className="purchase-meta">
          {/* Tipo de entrada */}
          <span className="purchase-badge tipo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            {tipo_entrada_nombre ?? "—"}
          </span>

          {/* Cantidad */}
          <span className="purchase-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
            </svg>
            {cantidad} {cantidad === 1 ? "entrada" : "entradas"}
          </span>

          {/* Fecha */}
          <span className="purchase-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8"  y1="2" x2="8"  y2="6"/>
              <line x1="3"  y1="10" x2="21" y2="10"/>
            </svg>
            {formatDate(fecha_compra)}
          </span>

          {/* Estado */}
          <span className={`purchase-estado ${estado}`}>
            {estado === "completada" ? "✓ Completada" : "✕ Cancelada"}
          </span>
        </div>
      </div>

      {/* Total */}
      <div className="purchase-right">
        <span className="purchase-total">{formatPrice(total)}</span>
        <span className="purchase-qty">
          {formatPrice(total / cantidad)} × {cantidad}
        </span>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function PurchaseHistory() {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState({ visible: false, msg: "", type: "success" });

  const showToast = useCallback((msg, type = "success") => {
    setToast({ visible: true, msg, type });
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 3200);
  }, []);

  useEffect(() => {
    if (!Auth.isLoggedIn()) {
      navigate("/login");
      return;
    }

    async function init() {
      try {
        const data = await api.get("/purchases", Auth.authOptions());
        setPurchases(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err?.status === 401) {
          Auth.logout();
          navigate("/login");
        } else {
          showToast("Error al cargar el historial de compras.", "error");
        }
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [navigate, showToast]);

  if (!Auth.isLoggedIn()) return null;

  const totalGastado = purchases
    .filter((p) => p.estado === "completada")
    .reduce((acc, p) => acc + Number(p.total), 0);

  return (
    <>
      <Sidebar activeItem="compras" />

      <main className="main">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">
              Mis <span>Compras</span>
            </h1>
            <div className="breadcrumb">
              <Link to="/">Inicio</Link>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              Historial de compras
            </div>
          </div>
          <div className="counter">
            <strong>{loading ? "—" : purchases.length}</strong>{" "}
            {purchases.length === 1 ? "compra" : "compras"} ·{" "}
            <strong>{loading ? "—" : formatPrice(totalGastado)}</strong> en total
          </div>
        </div>

        {/* Cargando */}
        {loading && (
          <div className="state-box">
            <div className="spinner-lg"></div>
            <span>Cargando historial…</span>
          </div>
        )}

        {/* Sin compras */}
        {!loading && purchases.length === 0 && (
          <div className="state-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M2 9a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v1a2 2 0 0 0 0 4v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-1a2 2 0 0 0 0-4V9z"/>
            </svg>
            <p>Aún no has comprado ninguna entrada.</p>
            <Link to="/" style={{
              marginTop: "8px",
              padding: "9px 20px",
              border: "1px solid #2a2d29",
              borderRadius: "8px",
              fontSize: "13px",
              color: "#7a7f72",
            }}>
              Ver eventos disponibles
            </Link>
          </div>
        )}

        {/* Lista */}
        {!loading && purchases.length > 0 && (
          <div className="purchase-list">
            {purchases.map((purchase) => (
              <PurchaseCard key={purchase.id} purchase={purchase} />
            ))}
          </div>
        )}
      </main>

      {/* Toast */}
      <div className={`toast${toast.type === "error" ? " error" : ""}${toast.visible ? " show" : ""}`}>
        <span className="toast-dot"></span>
        <span>{toast.msg}</span>
      </div>
    </>
  );
}