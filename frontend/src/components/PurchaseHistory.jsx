import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../css/purchases.css";
import api from "../lib/api.js";
import { Auth } from "../lib/auth.js";

// ── Helpers ───────────────────────────────────────────────────

function getUserName() {
  const payload = Auth.getPayload();
  return (
    payload?.nombre || payload?.name ||
    payload?.username || payload?.sub || "Usuario"
  );
}

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

// ── Tarjeta de compra ─────────────────────────────────────────

function PurchaseItem({ purchase, index }) {
  const {
    evento_nombre,
    tipo_entrada_nombre,
    cantidad,
    total,
    fecha_compra,
    estado,
  } = purchase;

  return (
    <li
      className="purchase-item"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="purchase-item-left">
        <span className="purchase-num">{String(index + 1).padStart(2, "0")}</span>
        <div className="purchase-info">
          <span className="purchase-name">{evento_nombre ?? "Sin nombre"}</span>
          <div className="purchase-meta">
            <span className="purchase-badge tipo">{tipo_entrada_nombre ?? "—"}</span>
            <span className="purchase-badge">{cantidad} {cantidad === 1 ? "entrada" : "entradas"}</span>
            <span className="purchase-badge">{formatDate(fecha_compra)}</span>
            <span className={`purchase-estado ${estado}`}>
              {estado === "completada" ? "✓ Completada" : "✕ Cancelada"}
            </span>
          </div>
        </div>
      </div>
      <div className="purchase-item-right">
        <span className="purchase-total">{formatPrice(total)}</span>
        <span className="purchase-unit">{formatPrice(total / cantidad)} × {cantidad}</span>
      </div>
    </li>
  );
}

// ── Componente principal ──────────────────────────────────────

export default function PurchaseHistory() {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState([]);
  const [userName, setUserName]   = useState("…");
  const [initial, setInitial]     = useState("U");
  const [subtitle, setSubtitle]   = useState("Cargando compras…");
  const [loading, setLoading]     = useState(true);

  const loadPurchases = useCallback(async () => {
    setSubtitle("Cargando compras…");
    setLoading(true);
    try {
      const data = await api.get("/purchases", Auth.authOptions());
      const list = Array.isArray(data) ? data : [];
      setPurchases(list);
      setSubtitle(buildSubtitle(list.length));
    } catch (err) {
      console.error("Error cargando compras:", err);
      setPurchases([]);
      setSubtitle("No se pudieron cargar las compras");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!Auth.isLoggedIn()) {
      navigate("/login");
      return;
    }

    const name = getUserName();
    setUserName(name);
    setInitial(name.trim().charAt(0).toUpperCase() || "U");

    loadPurchases();
  }, [loadPurchases, navigate]);

  useEffect(() => {
    if (!loading) setSubtitle(buildSubtitle(purchases.length));
  }, [purchases.length, loading]);

  if (!Auth.isLoggedIn()) return null;

  const isEmpty      = !loading && purchases.length === 0;
  const totalGastado = purchases
    .filter((p) => p.estado === "completada")
    .reduce((acc, p) => acc + Number(p.total), 0);

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

      <main className="purchase-wrap">

        {/* Cabecera */}
        <div className="purchase-header">
          <div className="purchase-header-left">
            <div className="purchase-avatar">
              <span>{initial}</span>
            </div>
            <div className="purchase-header-info">
              <h1 className="purchase-title">
                Compras de <span>{userName}</span>
              </h1>
              <p className="purchase-subtitle">{subtitle}</p>
            </div>
          </div>
          {!loading && purchases.length > 0 && (
            <div className="purchase-summary">
              Total gastado: <strong>{formatPrice(totalGastado)}</strong>
            </div>
          )}
        </div>

        {/* Estado vacío */}
        {isEmpty && (
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M2 9a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v1a2 2 0 0 0 0 4v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-1a2 2 0 0 0 0-4V9z"/>
              </svg>
            </div>
            <p className="empty-title">Aún no tienes compras</p>
            <p className="empty-hint">Explora los eventos y compra tus entradas favoritas.</p>
            <Link to="/" className="btn-explore">Ver todos los eventos</Link>
          </div>
        )}

        {/* Lista */}
        {!isEmpty && (
          <ul className="purchase-list">
            {purchases.map((purchase, index) => (
              <PurchaseItem key={purchase.id} purchase={purchase} index={index} />
            ))}
          </ul>
        )}

      </main>
    </>
  );
}

// ── Util ──────────────────────────────────────────────────────

function buildSubtitle(count) {
  if (count === 0) return "No tienes compras registradas";
  return `${count} compra${count !== 1 ? "s" : ""} registrada${count !== 1 ? "s" : ""}`;
}