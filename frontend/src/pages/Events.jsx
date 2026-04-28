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

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../css/events_admin.css";
import api      from "../services/api.js";
import { Auth } from "../services/auth.js";
import Sidebar  from "../components/Sidebar.jsx";
import EventsTable from "../components/EventsTable.jsx";
import EventFormModal from "../components/EventFormModal.jsx";

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
function getSwalInstance() {
  if (typeof window !== "undefined" && window.Swal?.fire) return window.Swal;
  return null;
}

const notifySuccess = (title) => {
  const swal = getSwalInstance();
  if (!swal) {
    console.warn("SweetAlert2 no está disponible. Mostrando fallback nativo.");
    window.alert(title);
    return Promise.resolve();
  }
  return swal.fire({ ...SWAL_BASE, icon: "success", title });
};

const notifyError = (title, text = "") => {
  const swal = getSwalInstance();
  if (!swal) {
    console.warn("SweetAlert2 no está disponible. Mostrando fallback nativo.");
    window.alert(text ? `${title}\n${text}` : title);
    return Promise.resolve();
  }
  return swal.fire({ ...SWAL_BASE, icon: "error", title, text });
};

async function askConfirm(title, text) {
  const swal = getSwalInstance();
  if (!swal) {
    return window.confirm(text ? `${title}\n\n${text}` : title);
  }

  const result = await swal.fire({
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
    categoria: "", imagen: "", precio: "", estado: "true",
  };
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [imgError,     setImgError]     = useState(false);
  const [fieldErrors,  setFieldErrors]  = useState({});
  const [entradasList, setEntradasList] = useState([]);  // [{ tipo_entrada_id, nombre, aforo, precio }]
  const [entradasError,setEntradasError]= useState("");
  const [showNuevoTipo,setShowNuevoTipo]= useState(false);
  const [nuevoTipoVal, setNuevoTipoVal] = useState("");

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
    </>
  );
}