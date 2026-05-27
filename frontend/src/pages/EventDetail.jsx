import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import "../../css/event_card.css";
import api from "../services/api.js";
import { Auth } from "../services/auth.js";
import purchaseService from "../services/purchaseService.js";
import { useIaResponseSocket } from "../hooks/useIaResponseSocket.js";
import { getSocketConnection } from "../services/socketClient.js";

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

function normalizeSocketText(payload) {
  if (typeof payload === 'string') {
    return payload.trim();
  }

  if (!payload || typeof payload !== 'object') {
    return '';
  }

  return String(
    payload.mensaje ??
      payload.message ??
      payload.texto ??
      payload.text ??
      payload.estado_mensaje ??
      payload.step ??
      ''
  ).trim();
}

// ── Modal de compra ──────────────────────────────────────────────────────────
function PurchaseModal({ entradas, eventName, eventoActivo, onClose, onSuccess }) {
  const navigate = useNavigate();
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [transactionText, setTransactionText] = useState('');
  const [transactionPhase, setTransactionPhase] = useState('idle');
  const [transactionPayload, setTransactionPayload] = useState(null);
  const [feedback, setFeedback]     = useState(null);
  const {
    iaPayload,
    iaMessage,
    resetIaMessage,
  } = useIaResponseSocket(transactionOpen);
  const [quantities, setQuantities] = useState({});
  const [step, setStep] = useState(1);
  const [cardData, setCardData] = useState({
    pan_number: "",
    cvv: "",
    nombre_titular: "",
    franquicia: "",
  });
  const [cardErrors, setCardErrors] = useState({});
  const [loading, setLoading]       = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const franquiciaRef = useRef(null);
  const panInputRef = useRef(null);
  const cvvInputRef = useRef(null);
  const holderInputRef = useRef(null);

  useEffect(() => {
    const init = {};
    (entradas || []).forEach((ent) => { init[ent.id] = 0; });
    setQuantities(init);
  }, [entradas]);

  useEffect(() => {
    const socket = getSocketConnection();

    const handlePaymentStep = (payload) => {
      if (!transactionOpen) {
        return;
      }

      const nextText = normalizeSocketText(payload);
      if (nextText) {
        setTransactionText(nextText);
      }
    };

    socket.on('payment_step', handlePaymentStep);

    return () => {
      socket.off('payment_step', handlePaymentStep);
    };
  }, [transactionOpen]);

  useEffect(() => {
    if (!transactionOpen || !iaPayload) {
      return;
    }

    const finalText = String(iaMessage ?? iaPayload?.respuesta ?? iaPayload?.message ?? '').trim();
    if (finalText) {
      setTransactionText(finalText);
    }
    setTransactionPayload(iaPayload);
    setTransactionPhase('final');
    setLoading(false);
    setIsProcessing(false);
  }, [transactionOpen, iaPayload, iaMessage]);

  const total = (entradas || []).reduce((sum, ent) => {
    const q = Number(quantities[ent.id] || 0);
    return sum + (Number(ent.precio || 0) * q);
  }, 0);

  const totalQty = (entradas || []).reduce(
    (s, ent) => s + (Number(quantities[ent.id] || 0)), 0
  );

  const isSuccessAiResponse = String(transactionPayload?.estado ?? iaPayload?.estado ?? '').toLowerCase() === 'aprobado' || String(transactionPayload?.tipo_evento ?? iaPayload?.tipo_evento ?? '').toLowerCase() === 'pago_exitoso';
  const isFinalTransaction = transactionPhase === 'final';
  const isFailedTransaction = isFinalTransaction && !isSuccessAiResponse;

  const firstSelectedEntry = (entradas || []).find((ent) => Number(quantities[ent.id] || 0) > 0) || null;
  const selectedTypes = (entradas || []).filter((ent) => Number(quantities[ent.id] || 0) > 0);
  const selectedTypeLabel =
    selectedTypes.length === 1
      ? selectedTypes[0].nombre
      : selectedTypes.length > 1
      ? `${selectedTypes.length} tipos de entrada`
      : "Sin selección";

  const resetModalState = () => {
    setStep(1);
    setCardData({ pan_number: "", cvv: "", nombre_titular: "", franquicia: "" });
    setCardErrors({});
    setFeedback(null);
    setTransactionOpen(false);
    setTransactionText('');
    setTransactionPhase('idle');
    setTransactionPayload(null);
    setIsProcessing(false);
    setLoading(false);
    resetIaMessage();
  };

  const handleClose = () => {
    resetModalState();
    onClose();
  };

  const handleContinueToPayment = () => {
    if (!Auth.isLoggedIn()) { navigate("/login"); return; }
    if (!eventoActivo) {
      setFeedback({ ok: false, msg: "El evento no está activo." });
      return;
    }
    if (totalQty <= 0) return;
    setFeedback(null);
    setStep(2);
  };

  const validateCardData = () => {
    const nextErrors = {};
    const franquicia = String(cardData.franquicia || "").trim();
    const cleanedPan = String(cardData.pan_number || "").replace(/\s+/g, "");
    const cvv = String(cardData.cvv || "");
    const holder = String(cardData.nombre_titular || "").trim();

    if (!franquicia) {
      nextErrors.franquicia = "Selecciona una franquicia";
    }

    if (!/^\d{16}$/.test(cleanedPan)) {
      nextErrors.pan_number = "Número de tarjeta inválido";
    }

    if (!/^\d{3}$/.test(cvv)) {
      nextErrors.cvv = "CVV inválido";
    }

    if (!holder) {
      nextErrors.nombre_titular = "Ingresa el nombre del titular";
    }

    setCardErrors(nextErrors);

    if (nextErrors.franquicia) {
      franquiciaRef.current?.focus();
      return false;
    }

    if (nextErrors.pan_number) {
      panInputRef.current?.focus();
      return false;
    }
    if (nextErrors.cvv) {
      cvvInputRef.current?.focus();
      return false;
    }
    if (nextErrors.nombre_titular) {
      holderInputRef.current?.focus();
      return false;
    }

    return true;
  };

  const handleBackToSelection = () => {
    setFeedback(null);
    setStep(1);
    resetIaMessage();
  };

  const handlePanChange = (value) => {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 16);
    const formatted = digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
    setCardData((prev) => ({ ...prev, pan_number: formatted }));
    if (cardErrors.pan_number) {
      setCardErrors((prev) => ({ ...prev, pan_number: undefined }));
    }
  };

  const handleCvvChange = (value) => {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 3);
    setCardData((prev) => ({ ...prev, cvv: digits }));
    if (cardErrors.cvv) {
      setCardErrors((prev) => ({ ...prev, cvv: undefined }));
    }
  };

  const handleHolderChange = (value) => {
    setCardData((prev) => ({ ...prev, nombre_titular: value }));
    if (cardErrors.nombre_titular) {
      setCardErrors((prev) => ({ ...prev, nombre_titular: undefined }));
    }
  };

  const handleFranquiciaChange = (value) => {
    setCardData((prev) => ({ ...prev, franquicia: value }));
    if (cardErrors.franquicia) {
      setCardErrors((prev) => ({ ...prev, franquicia: undefined }));
    }
  };

  const handlePay = async () => {
    if (!Auth.isLoggedIn()) { navigate("/login"); return; }
    if (!eventoActivo)      { setFeedback({ ok: false, msg: "El evento no está activo." }); return; }
    if (totalQty <= 0)       return;
    if (!validateCardData()) return;

    // Control de duplicidad: deshabilitar botón
    setIsProcessing(true);
    setLoading(true);
    setFeedback(null);
    setTransactionOpen(true);
    setTransactionPhase('loading');
    setTransactionPayload(null);
    setTransactionText('El pago está siendo procesado por la pasarela de pagos.');
    
    try {
      const payloadTarjeta = {
        pan_number: String(cardData.pan_number || "").replace(/\s+/g, ""),
        cvv: String(cardData.cvv || ""),
        nombre_titular: String(cardData.nombre_titular || "").trim(),
        franquicia: String(cardData.franquicia || ""),
      };

      for (const ent of entradas) {
        const qty = Number(quantities[ent.id] || 0);
        if (!qty) continue;
        await purchaseService.createPurchase({
          evento_tipo_entrada_id: ent.id,
          cantidad: qty,
          tarjeta: payloadTarjeta,
        });
      }
      
      onSuccess();
    } catch (err) {
      console.error('Pago HTTP rechazado o indisponible; la UI esperará el evento final del socket.', err);
    } finally {
      setLoading(false);
    }
  };

  const inputBaseStyle = {
    background: "var(--bg-card-2)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "10px 14px",
    color: "var(--text-primary)",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    width: "100%",
    outline: "none",
  };

  const fieldLabelStyle = {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    color: "var(--text-muted)",
    marginBottom: 6,
    display: "block",
  };

  const errorTextStyle = {
    fontSize: 12,
    color: "var(--red)",
    marginTop: 4,
  };

  const transactionIsSuccess = isSuccessAiResponse;
  const transactionIsFinal = transactionPhase === 'final';
  const transactionIsFailure = transactionIsFinal && !transactionIsSuccess;
  const modalStyle = {
    maxWidth: transactionOpen ? '620px' : '460px',
    transition: 'max-width 0.35s ease',
  };

  const transactionCardStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
    padding: 24,
    borderRadius: 18,
    border: transactionIsSuccess
      ? '1px solid rgba(198,241,53,0.28)'
      : transactionIsFailure
      ? '1px solid rgba(247,113,113,0.3)'
      : '1px solid rgba(255,255,255,0.08)',
    background: transactionIsSuccess
      ? 'linear-gradient(180deg, rgba(198,241,53,0.10), rgba(198,241,53,0.05))'
      : transactionIsFailure
      ? 'linear-gradient(180deg, rgba(247,113,113,0.12), rgba(247,113,113,0.05))'
      : 'rgba(255,255,255,0.03)',
  };

  const transactionIconStyle = {
    width: 44,
    height: 44,
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '0 0 auto',
    color: transactionIsSuccess ? 'var(--accent)' : transactionIsFailure ? 'var(--red)' : 'var(--text-primary)',
    border: transactionIsSuccess
      ? '1px solid rgba(198,241,53,0.35)'
      : transactionIsFailure
      ? '1px solid rgba(247,113,113,0.35)'
      : '1px solid rgba(255,255,255,0.10)',
    background: transactionIsSuccess
      ? 'rgba(198,241,53,0.08)'
      : transactionIsFailure
      ? 'rgba(247,113,113,0.08)'
      : 'rgba(255,255,255,0.04)',
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && (!transactionOpen || transactionIsFinal)) {
          handleClose();
        }
      }}
    >
      <div className="modal" style={modalStyle}>
        {transactionOpen ? (
          <div style={transactionCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={transactionIconStyle}>
                {transactionIsSuccess ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="22" height="22">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : transactionIsFailure ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                ) : (
                  <span
                    className="transaction-spinner"
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      border: '2px solid currentColor',
                      borderTopColor: 'transparent',
                      display: 'inline-block',
                    }}
                  />
                )}
              </span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '1.2px',
                    textTransform: 'uppercase',
                    color: transactionIsSuccess ? 'var(--accent-dim)' : transactionIsFailure ? 'var(--red)' : 'var(--text-muted)',
                  }}
                >
                  {transactionIsSuccess ? 'Pago aprobado' : transactionIsFailure ? 'Pago rechazado' : 'Procesando pago'}
                </p>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>
                  {eventName}
                </p>
              </div>
            </div>

            <p
              style={{
                margin: 0,
                color: 'var(--text-primary)',
                fontSize: 15,
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
              }}
            >
                  {transactionText || 'El pago está siendo procesado por la pasarela de pagos.'}
            </p>

            {transactionIsFinal ? (
              <div className="modal-actions">
                <button className="btn-confirm" onClick={handleClose}>
                  Cerrar
                </button>
              </div>
            ) : (
              <div className="modal-actions">
                <button className="btn-confirm" disabled>
                  Procesando...
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div>
              <p className="modal-title">{step === 1 ? "Confirmar compra" : "Datos de pago"}</p>
              <p className="modal-subtitle">{eventName}</p>
            </div>

            {feedback && !feedback.ok && (
              <div className="modal-feedback" style={{ marginBottom: 8 }}>
                <div className="modal-feedback-icon error">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <p className="modal-feedback-title">No se puede continuar</p>
                <p className="modal-feedback-msg">{feedback.msg}</p>
              </div>
            )}

            {step === 1 ? (
              <>
                <div className="modal-entries" style={{ gap: "14px" }}>
                  <p className="modal-qty-label">Selecciona tus entradas</p>

                  {(entradas || []).map((entrada) => {
                    const cap = Math.min(Number(entrada.aforo || 0), 10);
                    const qty = Number(quantities[entrada.id] || 0);
                    const sinAforo = entrada.aforo === 0;

                    return (
                      <div
                        key={entrada.id}
                        className={`modal-entry-option${sinAforo ? " disabled" : ""}`}
                        style={{ padding: "18px 16px" }}
                      >
                        <div className="entry-option-left">
                          <span className="entry-option-name">{entrada.nombre}</span>
                          <span className="entry-option-aforo">
                            {sinAforo ? "Sin disponibilidad" : `${entrada.aforo} disponibles`}
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span className="entry-option-price">{formatPrice(entrada.precio)}</span>

                          <div className="qty-control">
                            <button
                              className="qty-btn"
                              onClick={() =>
                                setQuantities((prev) => ({
                                  ...prev,
                                  [entrada.id]: Math.max(0, (Number(prev[entrada.id] || 0) - 1)),
                                }))
                              }
                              disabled={qty <= 0 || sinAforo}
                            >−</button>
                            <span className="qty-value">{qty}</span>
                            <button
                              className="qty-btn"
                              onClick={() =>
                                setQuantities((prev) => ({
                                  ...prev,
                                  [entrada.id]: Math.min(cap, (Number(prev[entrada.id] || 0) + 1)),
                                }))
                              }
                              disabled={qty >= cap || sinAforo}
                            >+</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {totalQty > 0 && (
                  <div className="modal-total">
                    <span className="modal-total-label">Total a pagar</span>
                    <span className="modal-total-value">{formatPrice(total)}</span>
                  </div>
                )}

                <div className="modal-actions">
                  <button className="btn-cancel" onClick={handleClose}>Cancelar</button>
                  <button
                    className="btn-confirm"
                    onClick={handleContinueToPayment}
                    disabled={loading || totalQty <= 0 || !eventoActivo}
                  >
                    Continuar al pago
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="modal-total" style={{ alignItems: "flex-start", gap: 6 }}>
                  <span className="modal-total-label">
                    Tipo: {selectedTypeLabel}   Cantidad: {totalQty}
                  </span>
                  <span className="modal-total-value">Total: {formatPrice(total)}</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

                  <div>
                    <label style={fieldLabelStyle}>Franquicia</label>
                    <select
                      ref={franquiciaRef}
                      value={cardData.franquicia}
                      onChange={(e) => handleFranquiciaChange(e.target.value)}
                      style={{
                        ...inputBaseStyle,
                        borderColor: cardErrors.franquicia ? "var(--red)" : "var(--border)",
                      }}
                      onFocus={(e) => {
                        if (!cardErrors.franquicia) e.currentTarget.style.borderColor = "var(--accent)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = cardErrors.franquicia ? "var(--red)" : "var(--border)";
                      }}
                    >
                      <option value="">Seleccione una franquicia</option>
                      <option value="VISA">VISA</option>
                      <option value="MASTERCARD">MASTERCARD</option>
                      <option value="NU">NU</option>
                    </select>
                    {cardErrors.franquicia && <p style={errorTextStyle}>{cardErrors.franquicia}</p>}
                  </div>

                  <div>
                    <label style={fieldLabelStyle}>Número de tarjeta</label>
                    <input
                      ref={panInputRef}
                      type="text"
                      maxLength={19}
                      value={cardData.pan_number}
                      onChange={(e) => handlePanChange(e.target.value)}
                      placeholder="4500 1234 5678 9012"
                      style={{
                        ...inputBaseStyle,
                        borderColor: cardErrors.pan_number ? "var(--red)" : "var(--border)",
                      }}
                      onFocus={(e) => {
                        if (!cardErrors.pan_number) e.currentTarget.style.borderColor = "var(--accent)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = cardErrors.pan_number ? "var(--red)" : "var(--border)";
                      }}
                    />
                    {cardErrors.pan_number && <p style={errorTextStyle}>{cardErrors.pan_number}</p>}
                  </div>

                  <div style={{ display: "flex", gap: 12 }}>
                    <div style={{ flex: "0 0 140px" }}>
                      <label style={fieldLabelStyle}>{cardData.franquicia === "NU" ? "CSV" : "CVV"}</label>
                      <input
                        ref={cvvInputRef}
                        type="password"
                        maxLength={3}
                        value={cardData.cvv}
                        onChange={(e) => handleCvvChange(e.target.value)}
                        placeholder="123"
                        style={{
                          ...inputBaseStyle,
                          borderColor: cardErrors.cvv ? "var(--red)" : "var(--border)",
                        }}
                        onFocus={(e) => {
                          if (!cardErrors.cvv) e.currentTarget.style.borderColor = "var(--accent)";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = cardErrors.cvv ? "var(--red)" : "var(--border)";
                        }}
                      />
                      {cardErrors.cvv && <p style={errorTextStyle}>{cardErrors.cvv}</p>}
                    </div>
                    <div style={{ flex: 1 }}></div>
                  </div>

                  <div>
                    <label style={fieldLabelStyle}>Nombre en la tarjeta</label>
                    <input
                      ref={holderInputRef}
                      type="text"
                      value={cardData.nombre_titular}
                      onChange={(e) => handleHolderChange(e.target.value)}
                      placeholder="Como aparece en la tarjeta"
                      style={{
                        ...inputBaseStyle,
                        borderColor: cardErrors.nombre_titular ? "var(--red)" : "var(--border)",
                      }}
                      onFocus={(e) => {
                        if (!cardErrors.nombre_titular) e.currentTarget.style.borderColor = "var(--accent)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = cardErrors.nombre_titular ? "var(--red)" : "var(--border)";
                      }}
                    />
                    {cardErrors.nombre_titular && <p style={errorTextStyle}>{cardErrors.nombre_titular}</p>}
                  </div>
                </div>

                <div className="modal-actions">
                  <button className="btn-cancel" onClick={handleBackToSelection} disabled={isProcessing}>← Volver</button>
                  <button
                    className="btn-confirm"
                    onClick={handlePay}
                    disabled={loading || isProcessing || totalQty <= 0 || !eventoActivo || !firstSelectedEntry}
                  >
                    {isProcessing ? "Procesando..." : `Pagar ${formatPrice(total)}`}
                  </button>
                </div>
              </>
            )}
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

  const [event, setEvent]               = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [saved, setSaved]               = useState(false);
  const [saveLoading, setSaveLoading]   = useState(false);
  const [saveHint, setSaveHint]         = useState(
    Auth.isLoggedIn() ? "Haz clic para guardar este evento" : "Inicia sesión para guardar este evento"
  );
  const [imgError, setImgError]         = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);

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
        else if (err?.status)    setError(`Error del servidor (${err.status}).`);
        else                     setError("No se pudo conectar con el servidor. Intenta más tarde.");
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
      setSaveHint(
        err?.status === 404 ? "El evento no existe o fue eliminado" : "No se pudo actualizar el guardado"
      );
    } finally {
      setSaveLoading(false);
    }
  }, [eventId, saveLoading, navigate]);

  const handlePurchaseSuccess = useCallback(async () => {
    try {
      const data = await api.get(`/events/${eventId}`);
      const ev = data?.data ?? data?.evento ?? data;
      setEvent(ev);
    } catch { /* silencioso */ }
  }, [eventId]);

  const imgUrl       = event ? event.imagen_url ?? event.imagen ?? null : null;
  const catName      = event ? event.categoria?.nombre ?? event.categoria_nombre ?? event.categoria ?? "Sin categoría" : "";
  const fechaRaw     = event ? event.fecha ?? null : null;
  const precioRaw    = event ? event.valor ?? event.precio ?? null : null;
  const desc         = event ? event.descripcion ?? "Sin descripción." : "";
  const entradas     = event?.entradas ?? [];
  const eventoActivo = event?.estado === 'activo';
  const eventoFinalizado = event?.estado === 'finalizado';
  const eventoInactivo = event?.estado === 'inactivo';

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
                <img
                  src={imgUrl}
                  alt={event.nombre}
                  className="hero-img"
                  onError={() => setImgError(true)}
                />
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
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8"  y1="2" x2="8"  y2="6" />
                    <line x1="3"  y1="10" x2="21" y2="10" />
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

            <aside className="save-panel">
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

              {eventoFinalizado && (
                <div style={{
                  padding: "12px 16px",
                  background: "rgba(245,166,35,.08)",
                  border: "1px solid rgba(245,166,35,.2)",
                  borderRadius: "10px",
                  fontSize: "13px",
                  color: "#f5a623",
                  textAlign: "center",
                  marginBottom: "4px",
                }}>
                  Este evento ya finalizó
                </div>
              )}

              {eventoInactivo && (
                <div style={{
                  padding: "12px 16px",
                  background: "rgba(224,92,92,.08)",
                  border: "1px solid rgba(224,92,92,.2)",
                  borderRadius: "10px",
                  fontSize: "13px",
                  color: "#e05c5c",
                  textAlign: "center",
                  marginBottom: "4px",
                }}>
                  Este evento no está disponible
                </div>
              )}

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

      {showPurchase && event && (
        <PurchaseModal
          entradas={entradas}
          eventName={event.nombre}
          eventoActivo={eventoActivo}
          onClose={() => setShowPurchase(false)}
          onSuccess={handlePurchaseSuccess}
        />
      )}
    </>
  );
}