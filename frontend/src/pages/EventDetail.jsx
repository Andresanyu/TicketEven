import { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import "../../css/event_card.css";
import api from "../services/api.js";
import { Auth } from "../services/auth.js";

function formatDate(isoString) {
  if (!isoString) return "Sin fecha";
  try {
    return new Date(isoString).toLocaleDateString("es-CO", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
  } catch { return isoString; }
}

function formatPrice(value) {
  if (!value && value !== 0) return "Sin precio";
  if (Number(value) === 0) return "Gratis";
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", minimumFractionDigits: 0,
  }).format(value);
}

// ── Modal de compra ──────────────────────────────────────────────────────────
function PurchaseModal({ entradas, eventName, onClose, onSuccess }) {
  const navigate = useNavigate();
  const [selectedId, setSelectedId]   = useState(null);
  const [cantidad, setCantidad]       = useState(1);
  const [loading, setLoading]         = useState(false);
  const [feedback, setFeedback]       = useState(null); // { ok, msg }

  const selected = entradas.find((e) => e.id === selectedId);
  const total    = selected ? selected.precio * cantidad : 0;
  const maxQty   = selected ? Math.min(selected.aforo, 10) : 10;

  const handleConfirm = async () => {
    if (!Auth.isLoggedIn()) { navigate("/login"); return; }
    if (!selected) return;

    setLoading(true);
    try {
      await api.post("/purchases", {
        evento_tipo_entrada_id: selected.id,
        cantidad,
      }, Auth.authOptions());

      setFeedback({ ok: true, msg: `Compraste ${cantidad} entrada(s) para ${eventName}. ¡Disfruta el evento!` });
      onSuccess();
    } catch (err) {
      const msg =
        err?.status === 403 ? "El evento no está activo." :
        err?.status === 409 ? "No hay suficiente aforo disponible." :
        err?.status === 401 ? "Debes iniciar sesión para comprar." :
        err?.data?.error ?? "No se pudo completar la compra. Intenta de nuevo.";
      setFeedback({ ok: false, msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">

        {/* Feedback final */}
        {feedback ? (
          <>
            <div className="modal-feedback">
              <div className={`modal-feedback-icon ${feedback.ok ? "success" : "error"}`}>
                {feedback.ok ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                )}
              </div>
              <p className="modal-feedback-title">{feedback.ok ? "¡Compra exitosa!" : "Error en la compra"}</p>
              <p className="modal-feedback-msg">{feedback.msg}</p>
            </div>
            <button className="btn-confirm" onClick={onClose}>Cerrar</button>
          </>
        ) : (
          <>
            {/* Encabezado */}
            <div>
              <p className="modal-title">Confirmar compra</p>
              <p className="modal-subtitle">{eventName}</p>
            </div>

            {/* Tipos de entrada */}
            <div className="modal-entries">
              <p className="modal-qty-label">Selecciona tu entrada</p>
              {entradas.map((entrada) => {
                const sinAforo = entrada.aforo === 0;
                return (
                  <div
                    key={entrada.id}
                    className={`modal-entry-option
                      ${selectedId === entrada.id ? "selected" : ""}
                      ${sinAforo ? "disabled" : ""}`}
                    onClick={() => !sinAforo && setSelectedId(entrada.id)}
                  >
                    <div className="entry-option-left">
                      <span className="entry-option-name">{entrada.nombre}</span>
                      <span className="entry-option-aforo">
                        {sinAforo ? "Sin disponibilidad" : `${entrada.aforo} disponibles`}
                      </span>
                    </div>
                    <span className="entry-option-price">{formatPrice(entrada.precio)}</span>
                  </div>
                );
              })}
            </div>

            {/* Cantidad */}
            {selected && (
              <div className="modal-qty">
                <p className="modal-qty-label">Cantidad</p>
                <div className="qty-control">
                  <button className="qty-btn" onClick={() => setCantidad((c) => Math.max(1, c - 1))} disabled={cantidad <= 1}>−</button>
                  <span className="qty-value">{cantidad}</span>
                  <button className="qty-btn" onClick={() => setCantidad((c) => Math.min(maxQty, c + 1))} disabled={cantidad >= maxQty}>+</button>
                </div>
              </div>
            )}

            {/* Total */}
            {selected && (
              <div className="modal-total">
                <span className="modal-total-label">Total a pagar</span>
                <span className="modal-total-value">{formatPrice(total)}</span>
              </div>
            )}

            {/* Acciones */}
            <div className="modal-actions">
              <button className="btn-cancel" onClick={onClose}>Cancelar</button>
              <button
                className="btn-confirm"
                onClick={handleConfirm}
                disabled={!selected || loading}
              >
                {loading ? "Procesando…" : "Confirmar compra"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function EventDetail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get("id");

  const [event, setEvent]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [saved, setSaved]           = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveHint, setSaveHint]     = useState(
    Auth.isLoggedIn() ? "Haz clic para guardar este evento" : "Inicia sesión para guardar este evento"
  );
  const [imgError, setImgError]     = useState(false);
  const [showPurchase, setShowPurchase] = useState(false); // 👈

  useEffect(() => {
    if (!eventId) {
      setError("No se especificó ningún evento en la URL (falta el parámetro ?id=).");
      setLoading(false);
      return;
    }

    async function loadEvent() {
      try {
        const data = await api.get(`/events/${eventId}`);
        const ev = data?.data ?? data?.evento ?? data;
        document.title = `EventPro - ${ev.nombre ?? "Evento"}`;
        setEvent(ev);
        setLoading(false);
        await initSaveState();
      } catch (err) {
        if (err?.status === 404) setError("El evento no fue encontrado.");
        else if (err?.status) setError(`Error del servidor (${err.status}).`);
        else setError("No se pudo conectar con el servidor. Intenta más tarde.");
        setLoading(false);
      }
    }

    async function initSaveState() {
      if (!Auth.isLoggedIn()) { setSaved(false); return; }
      try {
        const data = await api.get(`/users/saved-events/${eventId}/status`, Auth.authOptions());
        const isSaved = Boolean(data?.isSaved);
        setSaved(isSaved);
        setSaveHint(isSaved ? "Este evento está en tus guardados" : "Haz clic para guardar este evento");
      } catch { setSaved(false); }
    }

    loadEvent();
  }, [eventId]);

  const toggleSave = useCallback(async () => {
    if (!eventId || saveLoading) return;
    if (!Auth.isLoggedIn()) { navigate("/login"); return; }
    setSaveLoading(true);
    try {
      const data = await api.post(`/events/${eventId}/save`, {}, Auth.authOptions());
      const isSaved = Boolean(data?.isSaved);
      setSaved(isSaved);
      setSaveHint(isSaved ? "Este evento está en tus guardados" : "Haz clic para guardar este evento");
    } catch (err) {
      setSaveHint(err?.status === 404 ? "El evento no existe o fue eliminado" : "No se pudo actualizar el guardado");
    } finally {
      setSaveLoading(false);
    }
  }, [eventId, saveLoading, navigate]);

  // Refresca el evento tras una compra exitosa (actualiza aforo)
  const handlePurchaseSuccess = useCallback(async () => {
    try {
      const data = await api.get(`/events/${eventId}`);
      const ev = data?.data ?? data?.evento ?? data;
      setEvent(ev);
    } catch { /* silencioso */ }
  }, [eventId]);

  const imgUrl   = event ? event.imagen_url ?? event.imagen ?? null : null;
  const catName  = event ? event.categoria?.nombre ?? event.categoria_nombre ?? event.categoria ?? "Sin categoría" : "";
  const fechaRaw = event ? event.fecha ?? null : null;
  const precioRaw = event ? event.valor ?? event.precio ?? null : null;
  const desc     = event ? event.descripcion ?? "Sin descripción." : "";
  const entradas = event?.entradas ?? [];
  const eventoActivo = event?.activo === true;

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="nav-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
          </svg>
          EventPro
        </Link>
        <Link to="/" className="nav-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Volver a eventos
        </Link>
      </nav>

      {loading && (
        <div className="state-wrap">
          <div className="spinner-ring"></div>
          <p>Cargando evento…</p>
        </div>
      )}

      {!loading && error && (
        <div className="state-wrap">
          <div className="state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p>{error}</p>
          <Link to="/" className="btn-outline">Ver todos los eventos</Link>
        </div>
      )}

      {!loading && !error && event && (
        <main className="detail-wrap">
          <section className="hero">
            <div className="hero-media">
              {imgUrl && !imgError ? (
                <img src={imgUrl} alt={event.nombre} className="hero-img" onError={() => setImgError(true)} />
              ) : (
                <div className="hero-placeholder">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
              )}
              <div className="hero-overlay"></div>
            </div>

            <div className="hero-info">
              <span className="badge-cat">{catName}</span>
              <h1 className="hero-title">{event.nombre ?? "Sin nombre"}</h1>
              <div className="hero-chips">
                <div className="chip">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span>{formatDate(fechaRaw)}</span>
                </div>
                <div className="chip">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                  <span>{formatPrice(precioRaw)}</span>
                </div>
              </div>
            </div>
          </section>

          <div className="detail-body">
            <article className="detail-article">
              <div className="article-label">Sobre este evento</div>
              <p className="detail-description">{desc}</p>
            </article>

            {entradas.length > 0 && (
              <section className="entries-section">
                <div className="article-label">Tipos de entrada</div>
                <div className="entries-list">
                  {entradas.map((entrada) => (
                    <div className="entry-row" key={entrada.id ?? entrada.tipo_entrada_id}>
                      <span className="entry-name">{entrada.nombre}</span>
                      <span className="entry-aforo">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                          <circle cx="9" cy="7" r="4"/>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                        {entrada.aforo} disponibles
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Panel lateral */}
            <aside className="save-panel">
              {/* Botón comprar */}
              {eventoActivo && entradas.length > 0 && (
                <button
                  className="btn-confirm"
                  style={{ borderRadius: "10px", padding: "13px", marginBottom: "4px" }}
                  onClick={() => {
                    if (!Auth.isLoggedIn()) { navigate("/login"); return; }
                    setShowPurchase(true);
                  }}
                >
                  Comprar entrada
                </button>
              )}

              {!eventoActivo && (
                <div style={{
                  padding: "12px 16px",
                  background: "rgba(224,92,92,.08)",
                  border: "1px solid rgba(224,92,92,.2)",
                  borderRadius: "10px",
                  fontSize: "13px",
                  color: "#e05c5c",
                  textAlign: "center"
                }}>
                  Este evento no está disponible
                </div>
              )}

              {/* Botón guardar */}
              <button
                className={`btn-save${saved ? " saved" : ""}`}
                onClick={toggleSave}
                disabled={saveLoading}
              >
                <svg className="save-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
                <span>{saved ? "Guardado" : "Guardar"}</span>
              </button>
              <p className="save-hint">{saveHint}</p>
            </aside>
          </div>
        </main>
      )}

      {/* Modal de compra */}
      {showPurchase && event && (
        <PurchaseModal
          entradas={entradas}
          eventName={event.nombre}
          onClose={() => setShowPurchase(false)}
          onSuccess={handlePurchaseSuccess}
        />
      )}
    </>
  );
}