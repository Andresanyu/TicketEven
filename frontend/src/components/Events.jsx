// Events.jsx
// ─────────────────────────────────────────────────────────────
// Migración de events.html + events.js a React con Vite.
// Mantiene clases CSS, IDs y lógica idénticos al original.
//
// Dependencias externas que deben existir igual que antes:
//   import api      from './api.js'
//   import { Auth } from './auth.js'
//   window.Swal     (cargado vía CDN o npm install sweetalert2)
//
// Uso:
//   <Events />
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../css/events_admin.css";
import api      from "../lib/api.js";
import { Auth } from "../lib/auth.js";
import Sidebar  from "./Sidebar.jsx";

// ── Constantes ────────────────────────────────────────────────
const SWAL_BASE = {
  background: "#121212",
  color: "#eaeaea",
  confirmButtonColor: "#c6f135",
  customClass: {
    popup:         "swal2-dark-popup",
    title:         "swal2-dark-title",
    htmlContainer: "swal2-dark-text",
    confirmButton: "swal2-dark-confirm",
    cancelButton:  "swal2-dark-cancel",
  },
};

// ── Helpers puros (sin estado, sin efectos) ───────────────────
const todayIso = () => new Date().toISOString().split("T")[0];

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatFecha(fechaIso) {
  if (!fechaIso) return { date: "Sin fecha", time: "—" };
  const d = new Date(fechaIso);
  if (Number.isNaN(d.getTime())) return { date: "Sin fecha", time: "—" };
  return {
    date: d.toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" }),
    time: d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false }),
  };
}

function splitFecha(fechaIso) {
  if (!fechaIso) return { date: "", time: "" };
  const d = new Date(fechaIso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const pad = (n) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function normalizeEvent(raw) {
  const entradasRaw = Array.isArray(raw?.entradas) ? raw.entradas : [];
  return {
    id:          Number(raw?.id),
    nombre:      String(raw?.nombre ?? "").trim(),
    fecha:       raw?.fecha ? String(raw.fecha) : null,
    categoria:   String(raw?.categoria ?? "Sin categoría"),
    categoria_id: raw?.categoria_id ? Number(raw.categoria_id) : null,
    valor:       raw?.valor == null ? null : Number(raw.valor),
    descripcion: String(raw?.descripcion ?? "").trim(),
    imagen_url:  String(raw?.imagen_url ?? "").trim(),
    activo:      raw?.activo !== false,
    entradas: entradasRaw
      .map((e) => ({
        tipo_entrada_id: Number(e?.tipo_entrada_id),
        nombre:          String(e?.nombre ?? "").trim(),
        aforo:           Number(e?.aforo),
      }))
      .filter(
        (e) =>
          Number.isInteger(e.tipo_entrada_id) &&
          e.tipo_entrada_id > 0 &&
          Number.isInteger(e.aforo) &&
          e.aforo >= 0
      ),
  };
}

// ── Wrappers de SweetAlert2 ───────────────────────────────────
const notifySuccess = (title)             => window.Swal.fire({ ...SWAL_BASE, icon: "success", title });
const notifyError   = (title, text = "")  => window.Swal.fire({ ...SWAL_BASE, icon: "error",   title, text });
async function askConfirm(title, text) {
  const result = await window.Swal.fire({
    ...SWAL_BASE,
    icon: "warning",
    title,
    text,
    showCancelButton:   true,
    confirmButtonText:  "Confirmar",
    cancelButtonText:   "Cancelar",
    cancelButtonColor:  "#2f3431",
  });
  return Boolean(result.isConfirmed);
}

// ══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════
export default function Events() {
  const navigate = useNavigate();

  // ── Estado de la tabla ────────────────────────────────────
  const [events,     setEvents]     = useState([]);
  const [filtered,   setFiltered]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [ticketTypes,setTicketTypes]= useState([]);
  const [search,     setSearch]     = useState("");
  const [loading,    setLoading]    = useState(true);

  // ── Estado del admin (sidebar) ────────────────────────────
  const [adminName,    setAdminName]    = useState("Administrador");
  const [adminInitial, setAdminInitial] = useState("A");

  // ── Estado del modal ──────────────────────────────────────
  const [modalOpen,  setModalOpen]  = useState(false);
  const [modalMode,  setModalMode]  = useState("create"); // "create" | "edit"
  const [editingId,  setEditingId]  = useState(null);
  const [saving,     setSaving]     = useState(false);

  // Campos del formulario
  const EMPTY_FORM = {
    titulo: "", descripcion: "", fecha: "", hora: "",
    categoria: "", imagen: "", valor: "", estado: "true",
  };
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [imgError,     setImgError]     = useState(false);
  const [fieldErrors,  setFieldErrors]  = useState({});
  const [entradasList, setEntradasList] = useState([]);  // [{ tipo_entrada_id, nombre, aforo }]
  const [entradasError,setEntradasError]= useState("");
  const [showNuevoTipo,setShowNuevoTipo]= useState(false);
  const [nuevoTipoVal, setNuevoTipoVal] = useState("");

  // Ref para el foco del modal
  const tituloRef = useRef(null);

  useEffect(() => {
    if (!Auth.isLoggedIn()) {
      navigate("/login");
      return;
    }
    if (Auth.getRol() !== "admin") {
      navigate("/");
    }
  }, [navigate]);

  if (!Auth.isLoggedIn() || Auth.getRol() !== "admin") {
    return null;
  }

  // ── Identidad del admin ───────────────────────────────────
  useEffect(() => {
    const payload = Auth.getPayload() || {};
    const name    = payload.nombre || payload.name || payload.username || payload.sub || "Administrador";
    setAdminName(name);
    setAdminInitial(name.trim().charAt(0).toUpperCase() || "A");
  }, []);

  // ── Carga inicial de datos ─────────────────────────────────
  useEffect(() => {
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function init() {
    setLoading(true);
    await loadCategories();
    await loadTicketTypes();
    await loadEvents();
    setLoading(false);
  }

  // ── Filtro reactivo (equivalente a applyFilter) ───────────
  useEffect(() => {
    const q = search.trim().toLowerCase();
    setFiltered(q ? events.filter((ev) => ev.nombre.toLowerCase().includes(q)) : [...events]);
  }, [search, events]);

  // ── Foco al abrir modal ───────────────────────────────────
  useEffect(() => {
    if (modalOpen) setTimeout(() => tituloRef.current?.focus(), 60);
  }, [modalOpen]);

  // ── ESC cierra el modal ────────────────────────────────────
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") closeModal(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // ─────────────────────────────────────────────────────────
  // CARGA DE DATOS
  // ─────────────────────────────────────────────────────────
  async function loadEvents() {
    try {
      const data = await api.get("/events", Auth.authOptions());
      setEvents(Array.isArray(data) ? data.map(normalizeEvent) : []);
    } catch (err) {
      console.error(err);
      await notifyError("Error de eventos", "No se pudieron cargar los eventos.");
    }
  }

  async function loadCategories() {
    try {
      const data = await api.get("/categories", Auth.authOptions());
      setCategories(
        Array.isArray(data)
          ? data.map((c) => ({ id: Number(c.id), nombre: String(c.nombre || "").trim() })).filter((c) => c.id > 0)
          : []
      );
    } catch (err) {
      console.error(err);
      await notifyError("Error de categorías", "No se pudieron cargar las categorías.");
    }
  }

  async function loadTicketTypes(selectId = null) {
    try {
      const data = await api.get("/ticket-types", Auth.authOptions());
      let arr = [];
      if (Array.isArray(data))                              arr = data;
      else if (Array.isArray(data?.tipos))                  arr = data.tipos;
      else if (Array.isArray(data?.data))                   arr = data.data;
      const types = arr
        .map((t) => ({ id: Number(t.id), nombre: String(t.nombre || "").trim() }))
        .filter((t) => Number.isInteger(t.id) && t.id > 0 && t.nombre);
      setTicketTypes(types);
      if (selectId != null) {
        setForm((f) => ({ ...f, tipoEntrada: String(selectId) }));
      }
    } catch (err) {
      console.error(err);
      await notifyError("Error de tipos de entrada", "No se pudieron cargar los tipos de entrada.");
    }
  }

  // ─────────────────────────────────────────────────────────
  // MODAL — abrir / cerrar / reset
  // ─────────────────────────────────────────────────────────
  function resetModal() {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setEntradasList([]);
    setEntradasError("");
    setShowNuevoTipo(false);
    setNuevoTipoVal("");
    setImgError(false);
  }

  function openCreateModal() {
    resetModal();
    setModalMode("create");
    setEditingId(null);
    setForm((f) => ({ ...f, fecha: "" }));
    setModalOpen(true);
  }

  async function openEditModal(eventId) {
    const id = Number(eventId);
    if (!id) return;
    try {
      const detailed  = await api.get(`/events/${id}`, Auth.authOptions());
      const eventData = normalizeEvent(detailed);
      const split     = splitFecha(eventData.fecha);

      const catId = String(
        eventData.categoria_id ||
        categories.find((c) => c.nombre === eventData.categoria)?.id ||
        ""
      );

      resetModal();
      setModalMode("edit");
      setEditingId(id);
      setForm({
        titulo:      eventData.nombre,
        descripcion: eventData.descripcion || "",
        fecha:       split.date,
        hora:        split.time,
        categoria:   catId,
        imagen:      eventData.imagen_url || "",
        valor:       eventData.valor == null ? "" : String(eventData.valor),
        estado:      String(eventData.activo),
      });
      setEntradasList(
        (eventData.entradas || []).map((e) => ({
          tipo_entrada_id: e.tipo_entrada_id,
          nombre:          e.nombre,
          aforo:           e.aforo,
        }))
      );
      setModalOpen(true);
    } catch (err) {
      console.error(err);
      await notifyError("Error de evento", "No se pudo cargar la información completa del evento.");
    }
  }

  function closeModal() {
    setModalOpen(false);
    setSaving(false);
  }

  // ─────────────────────────────────────────────────────────
  // FORMULARIO — cambios y validación
  // ─────────────────────────────────────────────────────────
  function handleFormChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setFieldErrors((fe) => ({ ...fe, [field]: "" }));
  }

  function buildPayload() {
    return {
      nombre:       form.titulo.trim(),
      categoria_id: form.categoria ? Number(form.categoria) : null,
      fecha:        form.fecha ? `${form.fecha}T${form.hora || "00:00"}:00` : null,
      valor:        form.valor === "" ? null : Number(form.valor),
      descripcion:  form.descripcion.trim() || null,
      imagen_url:   form.imagen.trim() || null,
      activo:       form.estado === "true",
      entradas:     entradasList.map((e) => ({
        tipo_entrada_id: e.tipo_entrada_id,
        aforo:           e.aforo,
      })),
    };
  }

  function validateForm(payload) {
    const errors = {};
    if (!payload.nombre)       errors.titulo    = "El título es obligatorio.";
    if (!payload.fecha)        errors.fecha     = "La fecha es obligatoria.";
    else if (modalMode === "create" && payload.fecha.split("T")[0] < todayIso())
                               errors.fecha     = "No se permiten eventos en fechas pasadas.";
    if (!payload.categoria_id) errors.categoria = "Selecciona una categoría.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ─────────────────────────────────────────────────────────
  // GUARDAR EVENTO
  // ─────────────────────────────────────────────────────────
  async function saveEvent() {
    const payload = buildPayload();
    if (!validateForm(payload)) return;
    if (!payload.entradas.length) {
      setEntradasError("Agrega al menos un tipo de entrada con aforo.");
      await notifyError("Entradas requeridas", "Debes agregar al menos un tipo de entrada antes de guardar.");
      return;
    }

    setSaving(true);
    try {
      if (modalMode === "edit" && editingId) {
        await api.put(`/events/${editingId}`, payload, Auth.authOptions());
        await notifySuccess("Evento actualizado correctamente");
      } else {
        await api.post("/events", payload, Auth.authOptions());
        await notifySuccess("Evento creado correctamente");
      }
      closeModal();
      await loadEvents();
    } catch (err) {
      console.error(err);
      await notifyError("Error al guardar", err?.message || "No fue posible guardar el evento.");
    } finally {
      setSaving(false);
    }
  }

  // ─────────────────────────────────────────────────────────
  // INACTIVAR EVENTO
  // ─────────────────────────────────────────────────────────
  async function disableEvent(eventId) {
    const ok = await askConfirm("Inactivar evento", "El evento se marcará como inactivo y dejará de mostrarse como activo.");
    if (!ok) return;
    try {
      await api.patch(`/events/${eventId}`, { activo: false }, Auth.authOptions());
      await notifySuccess("El evento ha sido inactivado");
      await loadEvents();
    } catch (err) {
      console.error(err);
      await notifyError("Error al inactivar", err?.message || "No fue posible inactivar el evento.");
    }
  }

  // ─────────────────────────────────────────────────────────
  // SECCIÓN DE ENTRADAS
  // ─────────────────────────────────────────────────────────
  function addEntrada() {
    const tipoRaw = String(form.tipoEntrada ?? "").trim();
    const aforo   = Number(form.aforo ?? "");

    if (!tipoRaw || tipoRaw === "new") { setEntradasError("Selecciona un tipo de entrada válido."); return; }
    const tipoId = Number(tipoRaw);
    if (!Number.isInteger(tipoId) || tipoId <= 0) { setEntradasError("El tipo seleccionado no es válido."); return; }
    if (!Number.isInteger(aforo) || aforo <= 0)  { setEntradasError("Ingresa un aforo entero mayor a 0."); return; }

    const tipo = ticketTypes.find((t) => Number(t.id) === tipoId);
    if (!tipo) { setEntradasError("No se encontró el tipo de entrada."); return; }

    setEntradasError("");
    setEntradasList((prev) => {
      const existing = prev.find((e) => e.tipo_entrada_id === tipoId);
      if (existing) return prev.map((e) => e.tipo_entrada_id === tipoId ? { ...e, aforo: e.aforo + aforo } : e);
      return [...prev, { tipo_entrada_id: tipoId, nombre: tipo.nombre, aforo }];
    });
    setForm((f) => ({ ...f, tipoEntrada: "", aforo: "" }));
  }

  function removeEntrada(tipoId) {
    setEntradasList((prev) => prev.filter((e) => e.tipo_entrada_id !== Number(tipoId)));
  }

  async function guardarNuevoTipo() {
    const nombre = nuevoTipoVal.trim();
    if (!nombre) { setEntradasError("Ingresa un nombre para el nuevo tipo de entrada."); return; }
    try {
      const created = await api.post("/ticket-types", { nombre }, Auth.authOptions());
      const newId   = Number(created?.id);
      await loadTicketTypes(Number.isInteger(newId) ? newId : null);
      setNuevoTipoVal("");
      setShowNuevoTipo(false);
      setEntradasError("");
      await notifySuccess("Tipo de entrada creado correctamente");
    } catch (err) {
      console.error(err);
      await notifyError("Error al crear tipo", err?.message || "No fue posible crear el tipo de entrada.");
    }
  }

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <>
      {/* Sidebar reutilizable */}
      <Sidebar activeItem="eventos" adminName={adminName} adminInitial={adminInitial} />

      {/* ── Contenido principal ── */}
      <div className="main">

        {/* Page Header */}
        <header className="page-header">
          <div className="page-header-left">
            <p className="page-eyebrow">
              <Link to="/admin-dashboard" className="breadcrumb-link">Panel</Link>
              <span className="breadcrumb-sep">›</span>
              Eventos
            </p>
            <h1 className="page-title">
              Gestión de Eventos<span className="title-dot">.</span>
            </h1>
          </div>
          <button className="btn-primary" id="btnNuevo" onClick={openCreateModal}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5"  x2="12" y2="19" />
              <line x1="5"  y1="12" x2="19" y2="12" />
            </svg>
            Nuevo Evento
          </button>
        </header>

        {/* Toolbar */}
        <div className="toolbar">
          <div className="search-wrap">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              id="searchInput"
              className="search-input"
              placeholder="Buscar evento por nombre…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span className="table-count" id="tableCount">
            {loading ? "Cargando…" : `${filtered.length} evento${filtered.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {/* Tabla */}
        <div className="table-wrap">
          <table className="ev-table" id="evTable">
            <thead>
              <tr>
                <th className="col-id">ID</th>
                <th className="col-name">Nombre del Evento</th>
                <th className="col-date">Fecha y Hora</th>
                <th className="col-cat">Categoría</th>
                <th className="col-status">Estado</th>
                <th className="col-actions">Acciones</th>
              </tr>
            </thead>
            <tbody id="evTbody">
              {filtered.map((ev) => {
                const fecha      = formatFecha(ev.fecha);
                const statusCls  = ev.activo ? "badge-active" : "badge-inactive";
                const statusText = ev.activo ? "Activo" : "Inactivo";
                return (
                  <tr key={ev.id} className="ev-row" data-id={ev.id} data-name={ev.nombre}>
                    <td className="cell-id">#{String(ev.id).padStart(2, "0")}</td>
                    <td className="cell-name">
                      <span className="ev-dot" />
                      <span className="ev-name-text">{ev.nombre}</span>
                    </td>
                    <td className="cell-date">
                      <span className="date-primary">{fecha.date}</span>
                      <span className="date-time">{fecha.time}</span>
                    </td>
                    <td className="cell-cat">
                      <span className="cat-tag">{ev.categoria || "Sin categoría"}</span>
                    </td>
                    <td className="cell-status">
                      <span className={`badge ${statusCls}`}>{statusText}</span>
                    </td>
                    <td className="cell-actions">
                      <button
                        className="btn-icon btn-edit"
                        type="button"
                        title="Editar"
                        onClick={() => openEditModal(ev.id)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        className="btn-icon btn-delete"
                        type="button"
                        title="Inactivar"
                        onClick={() => disableEvent(ev.id)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Estado vacío */}
          <div className={`table-empty${filtered.length === 0 && !loading ? "" : " hidden"}`} id="tableEmpty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8"  y1="2" x2="8"  y2="6" />
              <line x1="3"  y1="10" x2="21" y2="10" />
            </svg>
            <p>No se encontraron eventos</p>
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════
          MODAL — CREAR / EDITAR EVENTO
      ══════════════════════════════════════════════════════ */}
      <div
        className={`modal-backdrop${modalOpen ? "" : " hidden"}`}
        id="modalBackdrop"
        onClick={(e) => { if (e.target.id === "modalBackdrop") closeModal(); }}
      >
        <div className="modal" id="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">

          {/* Cabecera */}
          <div className="modal-header">
            <div>
              <p className="modal-eyebrow" id="modalEyebrow">
                {modalMode === "edit" ? `Editando #${String(editingId).padStart(2, "0")}` : "Nuevo"}
              </p>
              <h2 className="modal-title" id="modalTitle">
                {modalMode === "edit" ? "Editar Evento" : "Nuevo Evento"}
              </h2>
            </div>
            <button className="modal-close" id="btnCloseModal" aria-label="Cerrar" onClick={closeModal}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6"  x2="6"  y2="18" />
                <line x1="6"  y1="6"  x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Cuerpo — dos columnas */}
          <div className="modal-body">

            <input type="hidden" id="modalId" value={editingId ?? ""} readOnly />

            {/* ── Columna izquierda ── */}
            <div className="modal-col">

              <div className={`field${fieldErrors.titulo ? " has-error" : ""}`} id="field-titulo">
                <label className="field-label" htmlFor="modalTitulo">
                  Título del Evento <span className="req">*</span>
                </label>
                <input
                  ref={tituloRef}
                  type="text"
                  id="modalTitulo"
                  className="field-input"
                  placeholder="Ej. Festival de Jazz 2025"
                  maxLength={150}
                  value={form.titulo}
                  onChange={(e) => handleFormChange("titulo", e.target.value)}
                />
                <span className="field-error" id="err-titulo">{fieldErrors.titulo || ""}</span>
              </div>

              <div className="field" id="field-descripcion">
                <label className="field-label" htmlFor="modalDescripcion">Descripción</label>
                <textarea
                  id="modalDescripcion"
                  className="field-input field-textarea"
                  placeholder="Describe brevemente el evento…"
                  rows={4}
                  value={form.descripcion}
                  onChange={(e) => handleFormChange("descripcion", e.target.value)}
                />
              </div>

              <div className="field-row">
                <div className={`field${fieldErrors.fecha ? " has-error" : ""}`} id="field-fecha">
                  <label className="field-label" htmlFor="modalFecha">
                    Fecha <span className="req">*</span>
                  </label>
                  <input
                    type="date"
                    id="modalFecha"
                    className="field-input"
                    min={modalMode === "create" ? todayIso() : undefined}
                    value={form.fecha}
                    onChange={(e) => handleFormChange("fecha", e.target.value)}
                  />
                  <span className="field-error" id="err-fecha">{fieldErrors.fecha || ""}</span>
                </div>
                <div className="field" id="field-hora">
                  <label className="field-label" htmlFor="modalHora">Hora</label>
                  <input
                    type="time"
                    id="modalHora"
                    className="field-input"
                    value={form.hora}
                    onChange={(e) => handleFormChange("hora", e.target.value)}
                  />
                </div>
              </div>

            </div>

            {/* ── Columna derecha ── */}
            <div className="modal-col">

              <div className={`field${fieldErrors.categoria ? " has-error" : ""}`} id="field-categoria">
                <label className="field-label" htmlFor="modalCategoria">
                  Categoría <span className="req">*</span>
                </label>
                <div className="select-wrap">
                  <select
                    id="modalCategoria"
                    className="field-input field-select"
                    value={form.categoria}
                    onChange={(e) => handleFormChange("categoria", e.target.value)}
                  >
                    <option value="">— Selecciona una categoría —</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={String(cat.id)}>{cat.nombre}</option>
                    ))}
                  </select>
                  <svg className="select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                <span className="field-error" id="err-categoria">{fieldErrors.categoria || ""}</span>
              </div>

              <div className="field" id="field-imagen">
                <label className="field-label" htmlFor="modalImagen">URL de la Imagen</label>
                <input
                  type="url"
                  id="modalImagen"
                  className="field-input"
                  placeholder="https://ejemplo.com/imagen.jpg"
                  value={form.imagen}
                  onChange={(e) => { handleFormChange("imagen", e.target.value); setImgError(false); }}
                />
                <div className="img-preview-wrap" id="imgPreviewWrap">
                  {form.imagen && !imgError ? (
                    <img
                      id="imgPreview"
                      src={form.imagen}
                      alt="Preview"
                      className="img-preview"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <span className="img-preview-hint" id="imgHint">El preview aparecerá aquí</span>
                  )}
                </div>
              </div>

              <div className="field-row">
                <div className="field" id="field-valor">
                  <label className="field-label" htmlFor="modalValor">Precio (COP)</label>
                  <input
                    type="number"
                    id="modalValor"
                    className="field-input"
                    placeholder="0 = Gratis"
                    min={0}
                    value={form.valor}
                    onChange={(e) => handleFormChange("valor", e.target.value)}
                  />
                </div>
                <div className="field" id="field-estado">
                  <label className="field-label" htmlFor="modalEstado">Estado</label>
                  <div className="select-wrap">
                    <select
                      id="modalEstado"
                      className="field-input field-select"
                      value={form.estado}
                      onChange={(e) => handleFormChange("estado", e.target.value)}
                    >
                      <option value="true">Activo</option>
                      <option value="false">Inactivo</option>
                    </select>
                    <svg className="select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
              </div>

            </div>

            {/* ── Sección entradas — span full width ── */}
            <div className="entradas-section">

              <div className="entradas-header">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 12l3-9h14l3 9" />
                  <rect x="2" y="12" width="20" height="7" rx="2" />
                  <line x1="12" y1="12" x2="12" y2="19" />
                  <circle cx="7"  cy="15.5" r="1" fill="currentColor" stroke="none" />
                  <circle cx="17" cy="15.5" r="1" fill="currentColor" stroke="none" />
                </svg>
                Tipos de Entrada y Aforo
                <span className="entradas-badge" id="entradasBadge">{entradasList.length}</span>
              </div>

              <div className="entradas-controls">
                <div className="entradas-field entradas-field--type">
                  <div className="select-wrap">
                    <select
                      id="selectTipoEntrada"
                      className="field-input field-select entradas-select"
                      value={form.tipoEntrada ?? ""}
                      onChange={(e) => {
                        handleFormChange("tipoEntrada", e.target.value);
                        setShowNuevoTipo(e.target.value === "new");
                        if (e.target.value !== "new") setNuevoTipoVal("");
                        setEntradasError("");
                      }}
                    >
                      <option value="">— Tipo de entrada —</option>
                      {ticketTypes.map((t) => (
                        <option key={t.id} value={String(t.id)}>{t.nombre}</option>
                      ))}
                      <option value="new">+ Crear nuevo tipo…</option>
                    </select>
                    <svg className="select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>

                <div className="entradas-field entradas-field--aforo">
                  <input
                    type="number"
                    id="inputAforo"
                    className="field-input"
                    placeholder="Aforo"
                    min={1}
                    max={999999}
                    value={form.aforo ?? ""}
                    onChange={(e) => handleFormChange("aforo", e.target.value)}
                  />
                </div>

                <button type="button" className="btn-add-entrada" id="btnAgregarEntrada" onClick={addEntrada}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5"  x2="12" y2="19" />
                    <line x1="5"  y1="12" x2="19" y2="12" />
                  </svg>
                  Agregar
                </button>
              </div>

              {/* Input nuevo tipo */}
              <div className={`nuevo-tipo-wrap${showNuevoTipo ? "" : " hidden"}`} id="nuevoTipoWrap">
                <input
                  type="text"
                  id="inputNuevoTipo"
                  className="field-input"
                  placeholder="Nombre del nuevo tipo de entrada"
                  maxLength={60}
                  value={nuevoTipoVal}
                  onChange={(e) => setNuevoTipoVal(e.target.value)}
                />
                <button type="button" className="btn-guardar-tipo" id="btnGuardarTipo" onClick={guardarNuevoTipo}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Guardar tipo
                </button>
              </div>

              {/* Error de entradas */}
              <span className={`entradas-error${entradasError ? "" : " hidden"}`} id="entradasError">
                {entradasError}
              </span>

              {/* Lista / carrito */}
              <div className="entradas-list-wrap" id="entradasListWrap">
                {entradasList.length === 0 ? (
                  <div className="entradas-empty" id="entradasEmpty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                      <path d="M2 12l3-9h14l3 9" />
                      <rect x="2" y="12" width="20" height="7" rx="2" />
                      <line x1="12" y1="12" x2="12" y2="19" />
                    </svg>
                    Aún no has agregado tipos de entrada
                  </div>
                ) : (
                  <ul className="entradas-list" id="entradasList">
                    {entradasList.map((entrada) => (
                      <li key={entrada.tipo_entrada_id} className="entrada-item" data-id={entrada.tipo_entrada_id}>
                        <div className="entrada-item-left">
                          <span className="entrada-tipo">{entrada.nombre}</span>
                          <span className="entrada-sep">·</span>
                          <span className="entrada-aforo">{entrada.aforo.toLocaleString("es-CO")} entradas</span>
                        </div>
                        <button
                          type="button"
                          className="btn-remove-entrada"
                          title="Eliminar"
                          onClick={() => removeEntrada(entrada.tipo_entrada_id)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

            </div>

          </div>{/* /modal-body */}

          {/* Footer */}
          <div className="modal-footer">
            <button className="btn-ghost" id="btnCancelarModal" onClick={closeModal}>
              Cancelar
            </button>
            <button
              className={`btn-primary${saving ? " loading" : ""}`}
              id="btnGuardar"
              disabled={saving}
              onClick={saveEvent}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span id="btnGuardarText">
                {modalMode === "edit" ? "Guardar cambios" : "Guardar Evento"}
              </span>
            </button>
          </div>

        </div>
      </div>
    </>
  );
}