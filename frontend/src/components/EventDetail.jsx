import { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import "../../css/event_card.css";
import api from "../lib/api.js";
import { Auth } from "../lib/auth.js";

function formatDate(isoString) {
  if (!isoString) return "Sin fecha";
  try {
    return new Date(isoString).toLocaleDateString("es-CO", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return isoString;
  }
}

function formatPrice(value) {
  if (!value && value !== 0) return "Sin precio";
  if (Number(value) === 0) return "Gratis";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value);
}

export default function EventDetail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get("id");

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveHint, setSaveHint] = useState(
    Auth.isLoggedIn()
      ? "Haz clic para guardar este evento"
      : "Inicia sesión para guardar este evento"
  );
  const [imgError, setImgError] = useState(false);

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
        console.error("Error al cargar el evento:", err);
        if (err?.status === 404) {
          setError("El evento no fue encontrado.");
        } else if (err?.status) {
          setError(`Error del servidor (${err.status}).`);
        } else {
          setError("No se pudo conectar con el servidor. Intenta más tarde.");
        }
        setLoading(false);
      }
    }

    async function initSaveState() {
      if (!Auth.isLoggedIn()) {
        setSaved(false);
        setSaveHint("Inicia sesión para guardar este evento");
        return;
      }
      try {
        const data = await api.get(
          `/users/saved-events/${eventId}/status`,
          Auth.authOptions()
        );
        const isSaved = Boolean(data?.isSaved);
        setSaved(isSaved);
        setSaveHint(
          isSaved
            ? "Este evento está en tus guardados"
            : "Haz clic para guardar este evento"
        );
      } catch (err) {
        console.error("Error al consultar estado de guardado:", err);
        setSaved(false);
        setSaveHint("Haz clic para guardar este evento");
      }
    }

    loadEvent();
  }, [eventId]);

  const toggleSave = useCallback(async () => {
    if (!eventId || saveLoading) return;

    if (!Auth.isLoggedIn()) {
      navigate("/login");
      return;
    }

    setSaveLoading(true);
    try {
      const data = await api.post(`/events/${eventId}/save`, {}, Auth.authOptions());
      const isSaved = Boolean(data?.isSaved);
      setSaved(isSaved);
      setSaveHint(
        isSaved
          ? "Este evento está en tus guardados"
          : "Haz clic para guardar este evento"
      );
    } catch (err) {
      console.error("Error al guardar evento:", err);
      setSaveHint(
        err?.status === 404
          ? "El evento no existe o fue eliminado"
          : "No se pudo actualizar el guardado"
      );
    } finally {
      setSaveLoading(false);
    }
  }, [eventId, saveLoading, navigate]);

  const imgUrl = event
    ? event.imagen_url ?? event.imagen ?? event.imagen_promotional ?? null
    : null;

  const catName = event
    ? event.categoria?.nombre ?? event.categoria_nombre ?? event.categoria ?? "Sin categoría"
    : "";

  const fechaRaw = event
    ? event.fecha ?? event.fecha_evento ?? event.fecha_inicio ?? null
    : null;

  const precioRaw = event
    ? event.valor ?? event.precio ?? event.costo ?? event.precio_entrada ?? null
    : null;

  const desc = event
    ? event.descripcion ?? event.descripcion_evento ?? event.detalle ?? "Sin descripción."
    : "";

  const entradas = event?.entradas ?? [];

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

      {/* Loading state */}
      {loading && (
        <div className="state-wrap" id="stateLoading">
          <div className="spinner-ring"></div>
          <p>Cargando evento…</p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="state-wrap" id="stateError">
          <div className="state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p id="errorMsg">{error}</p>
          <Link to="/" className="btn-outline">Ver todos los eventos</Link>
        </div>
      )}

      {/* Main content */}
      {!loading && !error && event && (
        <main className="detail-wrap" id="detailContent">
          <section className="hero">
            <div className="hero-media">
              {imgUrl && !imgError ? (
                <img
                  id="heroImg"
                  src={imgUrl}
                  alt={event.nombre ?? "Imagen del evento"}
                  className="hero-img"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="hero-placeholder" id="heroPlaceholder">
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
              <span className="badge-cat" id="heroCategory">{catName}</span>
              <h1 className="hero-title" id="heroTitle">
                {event.nombre ?? event.nombre_evento ?? "Sin nombre"}
              </h1>
              <div className="hero-chips">
                <div className="chip">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span id="heroDateText">{formatDate(fechaRaw)}</span>
                </div>
                <div className="chip">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                  <span id="heroPriceText">{formatPrice(precioRaw)}</span>
                </div>
              </div>
            </div>
          </section>

          <div className="detail-body">
            <article className="detail-article">
              <div className="article-label">Sobre este evento</div>
              <p className="detail-description" id="detailDescription">{desc}</p>
            </article>

            {entradas.length > 0 && (
              <section className="entries-section">
                <div className="article-label">Tipos de entrada</div>
                <div className="entries-list">
                  {entradas.map((entrada) => (
                    <div className="entry-row" key={entrada.tipo_entrada_id}>
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
              <button
                className={`btn-save${saved ? " saved" : ""}`}
                id="btnSave"
                onClick={toggleSave}
                disabled={saveLoading}
              >
                <svg
                  className="save-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
                <span id="btnSaveText">{saved ? "Guardado" : "Guardar"}</span>
              </button>
              <p className="save-hint" id="saveHint">{saveHint}</p>
            </aside>
          </div>
        </main>
      )}
    </>
  );
}