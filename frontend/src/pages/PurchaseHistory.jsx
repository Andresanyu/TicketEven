import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../css/purchases.css";
import api from "../services/api.js";
import { Auth } from "../services/auth.js";

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

// ── Modal de boleta ───────────────────────────────────────────

function TicketModal({ purchaseId, onClose }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await api.get(`/purchases/${purchaseId}`, Auth.authOptions());
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError("No se pudo cargar la boleta.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [purchaseId]);

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handlePrint() {
    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Boleta EventPro · ${data.evento_nombre}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
        <style>
          *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            background: #fff;
            font-family: 'DM Sans', sans-serif;
            display: flex;
            justify-content: center;
            padding: 40px 20px;
          }
          .ticket {
            width: 400px;
            border: 1px solid #ddd;
            border-radius: 16px;
            overflow: hidden;
          }
          .ticket-header {
            background: #c6f135;
            padding: 22px 28px 18px;
          }
          .ticket-header-label {
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: rgba(17,18,16,.5);
            margin-bottom: 4px;
          }
          .ticket-event-name {
            font-family: 'Syne', sans-serif;
            font-size: 22px;
            font-weight: 800;
            color: #111210;
            line-height: 1.2;
            letter-spacing: -.4px;
          }
          .ticket-perforation {
            border-top: 2px dashed #ddd;
          }
          .ticket-body {
            padding: 20px 28px;
          }
          .ticket-row {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
          }
          .ticket-row:last-child { border-bottom: none; }
          .ticket-label {
            font-size: 11px;
            font-weight: 600;
            letter-spacing: .5px;
            text-transform: uppercase;
            color: #999;
          }
          .ticket-value {
            font-family: 'Syne', sans-serif;
            font-size: 14px;
            font-weight: 700;
            color: #111;
            text-align: right;
          }
          .ticket-value.accent { color: #8aab1f; font-size: 18px; }
          .ticket-value.estado {
            font-size: 12px;
            border-radius: 20px;
            padding: 2px 10px;
            color: ${data.estado === "completada" ? "#5a7a00" : "#c0392b"};
            background: ${data.estado === "completada" ? "#f0ffd0" : "#fdecea"};
            border: 1px solid ${data.estado === "completada" ? "#c6f135" : "#e05c5c"};
          }
          .ticket-qr {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            padding: 20px 28px;
            border-top: 1px solid #eee;
          }
          .ticket-qr img { width: 160px; height: 160px; }
          .ticket-qr-id {
            font-family: 'Syne', sans-serif;
            font-size: 10px;
            letter-spacing: 1.5px;
            color: #aaa;
            text-transform: uppercase;
          }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="ticket-header">
            <p class="ticket-header-label">EventPro · Boleta de compra</p>
            <h2 class="ticket-event-name">${data.evento_nombre}</h2>
          </div>
          <div class="ticket-perforation"></div>
          <div class="ticket-body">
            <div class="ticket-row">
              <span class="ticket-label">Tipo de entrada</span>
              <span class="ticket-value">${data.tipo_entrada_nombre}</span>
            </div>
            <div class="ticket-row">
              <span class="ticket-label">Fecha del evento</span>
              <span class="ticket-value">${formatDate(data.fecha_evento)}</span>
            </div>
            <div class="ticket-row">
              <span class="ticket-label">Cantidad</span>
              <span class="ticket-value">${data.cantidad} ${data.cantidad === 1 ? "entrada" : "entradas"}</span>
            </div>
            <div class="ticket-row">
              <span class="ticket-label">Total pagado</span>
              <span class="ticket-value accent">${formatPrice(data.total)}</span>
            </div>
            <div class="ticket-row">
              <span class="ticket-label">Estado</span>
              <span class="ticket-value estado">
                ${data.estado === "completada" ? "✓ Completada" : "✕ Cancelada"}
              </span>
            </div>
          </div>
          <div class="ticket-qr">
            <img src="${data.qr_code}" alt="QR de la compra" />
            <span class="ticket-qr-id">EVENTPRO-COMPRA-${data.id}-USUARIO-${data.usuario_id}</span>
          </div>
        </div>
        <script>
          document.fonts.ready.then(() => window.print());
        </script>
      </body>
      </html>
    `;

    const win = window.open("", "_blank", "width=520,height=780");
    win.document.write(html);
    win.document.close();
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-ticket" role="dialog" aria-modal="true" aria-label="Boleta de compra">

        {loading && (
          <div className="ticket-loading">
            <div className="ticket-spinner" />
            <span>Generando boleta…</span>
          </div>
        )}

        {error && (
          <div className="ticket-loading">
            <span style={{ color: "var(--red)" }}>{error}</span>
            <button className="btn-ticket secondary" style={{ marginTop: 8 }} onClick={onClose}>
              Cerrar
            </button>
          </div>
        )}

        {!loading && !error && data && (
          <>
            <div className="ticket-header">
              <p className="ticket-header-label">EventPro · Boleta de compra</p>
              <h2 className="ticket-event-name">{data.evento_nombre}</h2>
            </div>

            <div className="ticket-perforation" />

            <div className="ticket-body">
              <div className="ticket-row">
                <span className="ticket-label">Tipo de entrada</span>
                <span className="ticket-value">{data.tipo_entrada_nombre}</span>
              </div>
              <div className="ticket-row">
                <span className="ticket-label">Fecha del evento</span>
                <span className="ticket-value">{formatDate(data.fecha_evento)}</span>
              </div>
              <div className="ticket-row">
                <span className="ticket-label">Cantidad</span>
                <span className="ticket-value">
                  {data.cantidad} {data.cantidad === 1 ? "entrada" : "entradas"}
                </span>
              </div>
              <div className="ticket-row">
                <span className="ticket-label">Total pagado</span>
                <span className="ticket-value accent">{formatPrice(data.total)}</span>
              </div>
              <div className="ticket-row">
                <span className="ticket-label">Estado</span>
                <span className={`ticket-value estado-${data.estado}`}>
                  {data.estado === "completada" ? "✓ Completada" : "✕ Cancelada"}
                </span>
              </div>
            </div>

            <div className="ticket-qr-section">
              <img src={data.qr_code} alt="Código QR de la compra" />
              <span className="ticket-qr-id">
                EVENTPRO-COMPRA-{data.id}-USUARIO-{data.usuario_id}
              </span>
            </div>

            <div className="ticket-footer">
              <button className="btn-ticket primary" onClick={handlePrint}>
                Imprimir / Descargar
              </button>
              <button className="btn-ticket secondary modal-close-btn" onClick={onClose}>
                Cerrar
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

// ── Tarjeta de compra ─────────────────────────────────────────

function PurchaseItem({ purchase, index, onVerBoleta }) {
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
            {/* Botón Ver boleta */}
            <button className="btn-boleta" onClick={() => onVerBoleta(purchase.id)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 9a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v1a2 2 0 0 0 0 4v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-1a2 2 0 0 0 0-4V9z"/>
              </svg>
              Ver boleta
            </button>
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
  const [purchases, setPurchases]         = useState([]);
  const [userName, setUserName]           = useState("…");
  const [initial, setInitial]             = useState("U");
  const [subtitle, setSubtitle]           = useState("Cargando compras…");
  const [loading, setLoading]             = useState(true);
  const [activeTicketId, setActiveTicketId] = useState(null); // id de la compra cuya boleta está abierta

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
              <PurchaseItem
                key={purchase.id}
                purchase={purchase}
                index={index}
                onVerBoleta={setActiveTicketId}
              />
            ))}
          </ul>
        )}

      </main>

      {/* Modal de boleta — montado fuera del main para el overlay correcto */}
      {activeTicketId !== null && (
        <TicketModal
          purchaseId={activeTicketId}
          onClose={() => setActiveTicketId(null)}
        />
      )}
    </>
  );
}

// ── Util ──────────────────────────────────────────────────────

function buildSubtitle(count) {
  if (count === 0) return "No tienes compras registradas";
  return `${count} compra${count !== 1 ? "s" : ""} registrada${count !== 1 ? "s" : ""}`;
}