// Categories.jsx
// ─────────────────────────────────────────────────────────────
// Migración de categories.html + categories.js a React con Vite.
// Mantiene clases CSS, IDs y estructura idénticos al original.
//
// Requiere:
//   - ./api.js   (cliente HTTP)
//   - ./auth.js  (Auth.requireAdmin, Auth.getPayload, Auth.authOptions)
//   - ./Sidebar.jsx
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../css/categories.css";
import api      from "../lib/api.js";
import { Auth } from "../lib/auth.js";
import Sidebar  from "./Sidebar.jsx";

// ── Helpers puros ─────────────────────────────────────────────
function normalizeCategory(raw) {
  return {
    id:     Number(raw?.id),
    nombre: String(raw?.nombre ?? "").trim(),
    activo: raw?.activo !== false,
  };
}

// ══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════
export default function Categories() {
  const navigate = useNavigate();

  // ── Identidad del admin ───────────────────────────────────
  const [adminName,    setAdminName]    = useState("Administrador");
  const [adminInitial, setAdminInitial] = useState("A");

  // ── Estado de la tabla ────────────────────────────────────
  const [categories, setCategories] = useState([]);
  const [search,     setSearch]     = useState("");
  const [loading,    setLoading]    = useState(true);

  // ── Estado del modal CRUD ─────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" | "edit"
  const [editingId, setEditingId] = useState(null);
  const [saving,    setSaving]    = useState(false);

  // Campos del formulario
  const [formNombre, setFormNombre] = useState("");
  const [formEstado, setFormEstado] = useState("true");
  const [fieldError, setFieldError] = useState(""); // error inline del campo nombre

  // ── Estado del modal de confirmación ─────────────────────
  const [confirmOpen,   setConfirmOpen]   = useState(false);
  const [confirmMsg,    setConfirmMsg]    = useState("");
  const [deletingId,    setDeletingId]    = useState(null);

  // Ref para el foco automático del input de nombre
  const nombreRef = useRef(null);

  // ─────────────────────────────────────────────────────────
  // INIT: identidad + carga de datos
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!Auth.isLoggedIn()) {
      navigate("/login");
      return;
    }
    if (Auth.getRol() !== "admin") {
      navigate("/");
      return;
    }

    const payload = Auth.getPayload() || {};
    const name    = payload.nombre || payload.name || payload.username || payload.sub || "Administrador";
    setAdminName(name);
    setAdminInitial(name.trim().charAt(0).toUpperCase() || "A");

    void loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  if (!Auth.isLoggedIn() || Auth.getRol() !== "admin") {
    return null;
  }

  // ── Foco automático al abrir el modal ────────────────────
  useEffect(() => {
    if (modalOpen) setTimeout(() => nombreRef.current?.focus(), 60);
  }, [modalOpen]);

  // ── ESC cierra cualquier modal abierto ───────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== "Escape") return;
      closeModal();
      closeConfirm();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // ─────────────────────────────────────────────────────────
  // FILTRO — derivado de categories + search (sin useEffect)
  // ─────────────────────────────────────────────────────────
  const filtered = search.trim()
    ? categories.filter((c) => c.nombre.toLowerCase().includes(search.trim().toLowerCase()))
    : categories;

  // ─────────────────────────────────────────────────────────
  // CARGA DE DATOS
  // ─────────────────────────────────────────────────────────
  async function loadCategories() {
    setLoading(true);
    try {
      const data = await api.get("/categories", Auth.authOptions());
      setCategories(Array.isArray(data) ? data.map(normalizeCategory) : []);
    } catch (err) {
      console.error(err);
      window.alert("No se pudieron cargar las categorías.");
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────
  // MODAL CRUD — abrir / cerrar
  // ─────────────────────────────────────────────────────────
  function openModalForCreate() {
    setModalMode("create");
    setEditingId(null);
    setFormNombre("");
    setFormEstado("true");
    setFieldError("");
    setModalOpen(true);
  }

  function openModalForEdit(categoryId) {
    const cat = categories.find((c) => c.id === Number(categoryId));
    if (!cat) return;

    setModalMode("edit");
    setEditingId(cat.id);
    setFormNombre(cat.nombre);
    setFormEstado(String(cat.activo));
    setFieldError("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSaving(false);
  }

  // ─────────────────────────────────────────────────────────
  // GUARDAR (crear o editar)
  // ─────────────────────────────────────────────────────────
  async function submitModal() {
    const nombre = formNombre.trim();

    if (!nombre)         { setFieldError("El nombre es obligatorio.");    return; }
    if (nombre.length > 100) { setFieldError("Máximo 100 caracteres."); return; }

    setFieldError("");
    setSaving(true);

    try {
      if (modalMode === "edit" && editingId) {
        await api.put(`/categories/${editingId}`, { nombre }, Auth.authOptions());
        window.alert("Categoría actualizada correctamente.");
      } else {
        await api.post("/categories", { nombre }, Auth.authOptions());
        window.alert("Categoría creada correctamente.");
      }
      closeModal();
      await loadCategories();
    } catch (err) {
      if (err?.status === 409) {
        setFieldError("Ya existe una categoría con ese nombre.");
      } else {
        console.error(err);
        window.alert("No fue posible guardar la categoría.");
      }
    } finally {
      setSaving(false);
    }
  }

  // ─────────────────────────────────────────────────────────
  // MODAL DE CONFIRMACIÓN — abrir / cerrar / confirmar
  // ─────────────────────────────────────────────────────────
  function openConfirmForDelete(categoryId) {
    const cat = categories.find((c) => c.id === Number(categoryId));
    if (!cat) return;
    setDeletingId(cat.id);
    setConfirmMsg(`¿Deseas eliminar la categoría "${cat.nombre}"? Esta acción no se puede deshacer.`);
    setConfirmOpen(true);
  }

  function closeConfirm() {
    setDeletingId(null);
    setConfirmOpen(false);
  }

  async function deleteCategory() {
    if (!deletingId) return;
    try {
      await api.delete(`/categories/${deletingId}`, Auth.authOptions());
      closeConfirm();
      window.alert("Categoría eliminada correctamente.");
      await loadCategories();
    } catch (err) {
      console.error(err);
      closeConfirm();
      window.alert("No fue posible eliminar la categoría.");
    }
  }

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <>
      <Sidebar activeItem="categorias" adminName={adminName} adminInitial={adminInitial} />

      {/* ── Contenido principal ── */}
      <div className="main">

        {/* Page Header */}
        <header className="page-header" style={{ "--delay": "0ms" }}>
          <div className="page-header-left">
            <p className="page-eyebrow">
              <Link to="/admin-dashboard" className="breadcrumb-link">Panel</Link>
              <span className="breadcrumb-sep">›</span>
              Categorías
            </p>
            <h1 className="page-title">
              Gestión de Categorías<span className="title-dot">.</span>
            </h1>
          </div>
          <button className="btn-primary" id="btnNueva" onClick={openModalForCreate}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5"  x2="12" y2="19" />
              <line x1="5"  y1="12" x2="19" y2="12" />
            </svg>
            Nueva Categoría
          </button>
        </header>

        {/* Toolbar */}
        <div className="toolbar" style={{ "--delay": "60ms" }}>
          <div className="search-wrap">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              id="searchInput"
              className="search-input"
              placeholder="Buscar categoría…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span className="table-count" id="tableCount">
            {loading
              ? "Cargando…"
              : `${filtered.length} categoría${filtered.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {/* Tabla */}
        <div className="table-wrap" style={{ "--delay": "120ms" }}>
          <table className="cat-table" id="catTable">
            <thead>
              <tr>
                <th className="col-id">ID</th>
                <th className="col-name">Nombre de Categoría</th>
                <th className="col-status">Estado</th>
                <th className="col-actions">Acciones</th>
              </tr>
            </thead>
            <tbody id="catTbody">
              {filtered.map((cat) => {
                const statusCls  = cat.activo ? "badge-active" : "badge-inactive";
                const statusText = cat.activo ? "Activo" : "Inactivo";
                return (
                  <tr
                    key={cat.id}
                    className="cat-row"
                    data-id={cat.id}
                    data-name={cat.nombre}
                    data-activo={String(cat.activo)}
                  >
                    <td className="cell-id">#{String(cat.id).padStart(2, "0")}</td>
                    <td className="cell-name">
                      <span className="cat-dot" />
                      {cat.nombre}
                    </td>
                    <td className="cell-status">
                      <span className={`badge ${statusCls}`}>{statusText}</span>
                    </td>
                    <td className="cell-actions">
                      <button
                        className="btn-icon btn-edit"
                        type="button"
                        title="Editar"
                        onClick={() => openModalForEdit(cat.id)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        className="btn-icon btn-delete"
                        type="button"
                        title="Inactivar / Eliminar"
                        onClick={() => openConfirmForDelete(cat.id)}
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
          <div
            className={`table-empty${filtered.length === 0 && !loading ? "" : " hidden"}`}
            id="tableEmpty"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M3 7h7M3 12h7M3 17h7" />
              <rect x="13" y="5"  width="8" height="4" rx="1" />
              <rect x="13" y="10" width="8" height="4" rx="1" />
              <rect x="13" y="15" width="8" height="4" rx="1" />
            </svg>
            <p>No se encontraron categorías</p>
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════
          MODAL — CREAR / EDITAR
      ══════════════════════════════════════════════════════ */}
      <div
        className={`modal-backdrop${modalOpen ? "" : " hidden"}`}
        id="modalBackdrop"
        onClick={(e) => { if (e.target.id === "modalBackdrop") closeModal(); }}
      >
        <div className="modal" id="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">

          <div className="modal-header">
            <h2 className="modal-title" id="modalTitle">
              {modalMode === "edit" ? "Editar Categoría" : "Nueva Categoría"}
            </h2>
            <button className="modal-close" id="btnCloseModal" aria-label="Cerrar" onClick={closeModal}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6"  x2="6"  y2="18" />
                <line x1="6"  y1="6"  x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="modal-body">

            <input type="hidden" id="modalId" value={editingId ?? ""} readOnly />

            {/* Campo nombre */}
            <div className={`field${fieldError ? " has-error" : ""}`} id="field-nombre">
              <label className="field-label" htmlFor="modalNombre">
                Nombre de la categoría <span className="req">*</span>
              </label>
              <input
                ref={nombreRef}
                type="text"
                id="modalNombre"
                className="field-input"
                placeholder="Ej. Música, Teatro, Deportes…"
                maxLength={100}
                value={formNombre}
                onChange={(e) => { setFormNombre(e.target.value); setFieldError(""); }}
              />
              <span className="field-error" id="err-nombre">{fieldError}</span>
            </div>

            {/* Campo estado */}
            <div className="field" id="field-estado">
              <label className="field-label" htmlFor="modalEstado">Estado</label>
              <div className="select-wrap">
                <select
                  id="modalEstado"
                  className="field-input field-select"
                  value={formEstado}
                  onChange={(e) => setFormEstado(e.target.value)}
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

          <div className="modal-footer">
            <button className="btn-ghost" id="btnCancelarModal" onClick={closeModal}>
              Cancelar
            </button>
            <button
              className={`btn-primary${saving ? " loading" : ""}`}
              id="btnGuardar"
              disabled={saving}
              onClick={submitModal}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span id="btnGuardarText">
                {modalMode === "edit" ? "Guardar cambios" : "Guardar"}
              </span>
            </button>
          </div>

        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          MODAL DE CONFIRMACIÓN (eliminar)
      ══════════════════════════════════════════════════════ */}
      <div
        className={`modal-backdrop${confirmOpen ? "" : " hidden"}`}
        id="confirmBackdrop"
        onClick={(e) => { if (e.target.id === "confirmBackdrop") closeConfirm(); }}
      >
        <div className="modal modal-sm" id="confirmModal" role="dialog" aria-modal="true">

          <div className="modal-header">
            <h2 className="modal-title">Confirmar acción</h2>
            <button className="modal-close" id="btnCloseConfirm" onClick={closeConfirm}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6"  x2="6"  y2="18" />
                <line x1="6"  y1="6"  x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="modal-body">
            <div className="confirm-warning">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9"  x2="12" y2="13"   />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <p id="confirmMsg">{confirmMsg}</p>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn-ghost" id="btnCancelarConfirm" onClick={closeConfirm}>
              Cancelar
            </button>
            <button className="btn-danger" id="btnConfirmAction" onClick={deleteCategory}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
              Confirmar
            </button>
          </div>

        </div>
      </div>
    </>
  );
}