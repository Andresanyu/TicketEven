// Events.jsx
// ─────────────────────────────────────────────────────────────
// Migración de events.html + events.js a React con Vite.
// Mantiene clases CSS, IDs y lógica idénticos al original.
//
// Uso:
//   <Events />
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../css/events_admin.css";
import api      from "../services/api.js";
import { Auth } from "../services/auth.js";
import Sidebar  from "../components/Sidebar.jsx";
import EventsTable from "../components/EventsTable.jsx";
import EventFormModal from "../components/EventFormModal.jsx";

// ── Helpers puros (sin estado, sin efectos) ───────────────────
const todayIso = () => new Date().toISOString().split("T")[0];

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
    categoria: "", imagen: "", precio: "", estado: "true",
  };
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [imgError,     setImgError]     = useState(false);
  const [fieldErrors,  setFieldErrors]  = useState({});
  const [entradasList, setEntradasList] = useState([]);  // [{ tipo_entrada_id, nombre, aforo, precio }]
  const [entradasError,setEntradasError]= useState("");
  const [showNuevoTipo,setShowNuevoTipo]= useState(false);
  const [nuevoTipoVal, setNuevoTipoVal] = useState("");
  const [notification, setNotification] = useState({ visible: false, msg: "", isError: false });
  const [confirmModal, setConfirmModal] = useState({ open: false, msg: "", onConfirm: null });

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

  // ── ESC cierra el modal ────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") {
        closeModal();
        closeNotification();
      }
    };
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
      showNotification("No se pudieron cargar los eventos.", true);
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
      showNotification("No se pudieron cargar las categorías.", true);
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
      showNotification("No se pudieron cargar los tipos de entrada.", true);
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
        estado:      String(eventData.activo),
      });
      // entradasList already set below
      setEntradasList(
        (eventData.entradas || []).map((e) => ({
          tipo_entrada_id: e.tipo_entrada_id,
          nombre:          e.nombre,
          aforo:           e.aforo,
          precio:          Number(e.precio ?? 0),
        }))
      );
      setModalOpen(true);
    } catch (err) {
      console.error(err);
      showNotification("No se pudo cargar la información completa del evento.", true);
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

  function showNotification(msg, isError = false) {
    setNotification({ visible: true, msg, isError });
  }

  function closeNotification() {
    setNotification((prev) => ({ ...prev, visible: false }));
  }

  function openConfirmModal(msg, onConfirm) {
    setConfirmModal({ open: true, msg, onConfirm });
  }

  function closeConfirmModal() {
    setConfirmModal({ open: false, msg: "", onConfirm: null });
  }

  function buildPayload() {
    return {
      nombre:       form.titulo.trim(),
      categoria_id: form.categoria ? Number(form.categoria) : null,
      fecha:        form.fecha ? `${form.fecha}T${form.hora || "00:00"}:00` : null,
      descripcion:  form.descripcion.trim() || null,
      imagen_url:   form.imagen.trim() || null,
      activo:       form.estado === "true",
      entradas:     entradasList.map((e) => ({
        tipo_entrada_id: e.tipo_entrada_id,
        aforo:           e.aforo,
        precio:          Number(e.precio ?? 0),
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
      showNotification("Debes agregar al menos un tipo de entrada antes de guardar.", true);
      return;
    }

    setSaving(true);
    try {
      if (modalMode === "edit" && editingId) {
        await api.put(`/events/${editingId}`, payload, Auth.authOptions());
        showNotification("Evento actualizado correctamente");
      } else {
        await api.post("/events", payload, Auth.authOptions());
        showNotification("Evento creado correctamente");
      }
      closeModal();
      await loadEvents();
    } catch (err) {
      console.error(err);
      showNotification(err?.message || "No fue posible guardar el evento.", true);
    } finally {
      setSaving(false);
    }
  }

  // ─────────────────────────────────────────────────────────
  // INACTIVAR EVENTO
  // ─────────────────────────────────────────────────────────
  async function disableEvent(eventId) {
    openConfirmModal("El evento se marcará como inactivo y dejará de mostrarse como activo.", async () => {
      try {
        await api.patch(`/events/${eventId}`, { activo: false }, Auth.authOptions());
        showNotification("El evento ha sido inactivado");
        await loadEvents();
      } catch (err) {
        console.error(err);
        showNotification(err?.message || "No fue posible inactivar el evento.", true);
      }
    });
  }

  // ─────────────────────────────────────────────────────────
  // SECCIÓN DE ENTRADAS
  // ─────────────────────────────────────────────────────────
  function addEntrada() {
    const tipoRaw = String(form.tipoEntrada ?? "").trim();
    const aforo   = Number(form.aforo ?? "");
    const precioRaw = form.precio;
    const precioNum = precioRaw === "" || precioRaw == null ? 0 : Number(precioRaw);

    if (!tipoRaw || tipoRaw === "new") { setEntradasError("Selecciona un tipo de entrada válido."); return; }
    const tipoId = Number(tipoRaw);
    if (!Number.isInteger(tipoId) || tipoId <= 0) { setEntradasError("El tipo seleccionado no es válido."); return; }
    if (!Number.isInteger(aforo) || aforo <= 0)  { setEntradasError("Ingresa un aforo entero mayor a 0."); return; }
    if (!Number.isFinite(precioNum) || precioNum < 0) { setEntradasError("Ingresa un precio válido (>= 0)."); return; }

    const tipo = ticketTypes.find((t) => Number(t.id) === tipoId);
    if (!tipo) { setEntradasError("No se encontró el tipo de entrada."); return; }

    setEntradasError("");
    setEntradasList((prev) => {
      const existing = prev.find((e) => e.tipo_entrada_id === tipoId);
      if (existing) {
        return prev.map((e) =>
          e.tipo_entrada_id === tipoId
            ? { ...e, aforo: e.aforo + aforo, precio: precioNum }
            : e
        );
      }
      return [...prev, { tipo_entrada_id: tipoId, nombre: tipo.nombre, aforo, precio: precioNum }];
    });
    setForm((f) => ({ ...f, tipoEntrada: "", aforo: "", precio: "" }));
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
      showNotification("Tipo de entrada creado correctamente");
    } catch (err) {
      console.error(err);
      showNotification(err?.message || "No fue posible crear el tipo de entrada.", true);
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
          <button className="btn-primary" id="btnNuevo" onClick={openCreateModal} disabled={modalOpen}>
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

        <EventsTable
          events={filtered}
          loading={loading}
          onEdit={openEditModal}
          onDelete={disableEvent}
        />

      </div>

      <EventFormModal
        isOpen={modalOpen}
        modalMode={modalMode}
        editingId={editingId}
        form={form}
        fieldErrors={fieldErrors}
        categories={categories}
        ticketTypes={ticketTypes}
        entradasList={entradasList}
        entradasError={entradasError}
        showNuevoTipo={showNuevoTipo}
        nuevoTipoVal={nuevoTipoVal}
        imgError={imgError}
        saving={saving}
        minCreateDate={todayIso()}
        onClose={closeModal}
        onSave={saveEvent}
        onFormChange={handleFormChange}
        onSetImgError={setImgError}
        onSetShowNuevoTipo={setShowNuevoTipo}
        onSetNuevoTipoVal={setNuevoTipoVal}
        onSetEntradasError={setEntradasError}
        onAddEntrada={addEntrada}
        onRemoveEntrada={removeEntrada}
        onGuardarNuevoTipo={guardarNuevoTipo}
      />

      {confirmModal.open && (
        <div className="modal-backdrop" id="confirmBackdrop" onClick={closeConfirmModal}>
          <div className="modal modal-sm" id="confirmModal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="modal-eyebrow">Confirmación</p>
                <h2 className="modal-title">Inactivar evento</h2>
              </div>
            </div>

            <div className="modal-body">
              <div className="confirm-warning">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p>{confirmModal.msg}</p>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-ghost" type="button" onClick={closeConfirmModal}>Cancelar</button>
              <button
                className="btn-danger"
                type="button"
                onClick={async () => {
                  const handler = confirmModal.onConfirm;
                  closeConfirmModal();
                  if (typeof handler === "function") {
                    await handler();
                  }
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {notification.visible && (
        <div className="modal-backdrop" onClick={closeNotification}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {notification.isError ? "Error" : "Éxito"}
              </h2>
              <button className="modal-close" onClick={closeNotification}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body modal-body-single">
              <div className={notification.isError ? "confirm-warning" : "confirm-success"}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {notification.isError
                    ? <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>
                    : <><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></>
                  }
                </svg>
                <p>{notification.msg}</p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className={notification.isError ? "btn-danger" : "btn-primary"}
                onClick={closeNotification}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}