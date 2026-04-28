import { useEffect, useRef } from "react";

export default function EventFormModal({
  isOpen,
  modalMode,
  editingId,
  form,
  fieldErrors,
  categories,
  ticketTypes,
  entradasList,
  entradasError,
  showNuevoTipo,
  nuevoTipoVal,
  imgError,
  saving,
  minCreateDate,
  onClose,
  onSave,
  onFormChange,
  onSetImgError,
  onSetShowNuevoTipo,
  onSetNuevoTipoVal,
  onSetEntradasError,
  onAddEntrada,
  onRemoveEntrada,
  onGuardarNuevoTipo,
}) {
  const titleRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const id = window.setTimeout(() => titleRef.current?.focus(), 60);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [isOpen]);

  return (
    <div
      className={`modal-backdrop${isOpen ? "" : " hidden"}`}
      id="modalBackdrop"
      onClick={(e) => {
        if (e.target.id === "modalBackdrop") onClose();
      }}
    >
      <div className="modal" id="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="modal-eyebrow" id="modalEyebrow">
              {modalMode === "edit" ? `Editando #${String(editingId).padStart(2, "0")}` : "Nuevo"}
            </p>
            <h2 className="modal-title" id="modalTitle">
              {modalMode === "edit" ? "Editar Evento" : "Nuevo Evento"}
            </h2>
          </div>
          <button className="modal-close" id="btnCloseModal" aria-label="Cerrar" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <input type="hidden" id="modalId" value={editingId ?? ""} readOnly />

          <div className="modal-col">
            <div className={`field${fieldErrors.titulo ? " has-error" : ""}`} id="field-titulo">
              <label className="field-label" htmlFor="modalTitulo">
                Título del Evento <span className="req">*</span>
              </label>
              <input
                ref={titleRef}
                type="text"
                id="modalTitulo"
                className="field-input"
                placeholder="Ej. Festival de Jazz 2025"
                maxLength={150}
                value={form.titulo}
                onChange={(e) => onFormChange("titulo", e.target.value)}
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
                onChange={(e) => onFormChange("descripcion", e.target.value)}
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
                  min={modalMode === "create" ? minCreateDate : undefined}
                  value={form.fecha}
                  onChange={(e) => onFormChange("fecha", e.target.value)}
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
                  onChange={(e) => onFormChange("hora", e.target.value)}
                />
              </div>
            </div>
          </div>

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
                  onChange={(e) => onFormChange("categoria", e.target.value)}
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
                onChange={(e) => {
                  onFormChange("imagen", e.target.value);
                  onSetImgError(false);
                }}
              />
              <div className="img-preview-wrap" id="imgPreviewWrap">
                {form.imagen && !imgError ? (
                  <img
                    id="imgPreview"
                    src={form.imagen}
                    alt="Preview"
                    className="img-preview"
                    onError={() => onSetImgError(true)}
                  />
                ) : (
                  <span className="img-preview-hint" id="imgHint">El preview aparecerá aquí</span>
                )}
              </div>
            </div>

            <div className="field" id="field-estado">
              <label className="field-label" htmlFor="modalEstado">Estado</label>
              <div className="select-wrap">
                <select
                  id="modalEstado"
                  className="field-input field-select"
                  value={form.estado}
                  onChange={(e) => onFormChange("estado", e.target.value)}
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

          <div className="entradas-section">
            <div className="entradas-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 12l3-9h14l3 9" />
                <rect x="2" y="12" width="20" height="7" rx="2" />
                <line x1="12" y1="12" x2="12" y2="19" />
                <circle cx="7" cy="15.5" r="1" fill="currentColor" stroke="none" />
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
                      onFormChange("tipoEntrada", e.target.value);
                      onSetShowNuevoTipo(e.target.value === "new");
                      if (e.target.value !== "new") onSetNuevoTipoVal("");
                      onSetEntradasError("");
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
                  onChange={(e) => onFormChange("aforo", e.target.value)}
                />
              </div>

              <div className="entradas-field entradas-field--precio">
                <input
                  type="number"
                  id="inputPrecio"
                  className="field-input"
                  placeholder="Precio"
                  min={0}
                  value={form.precio ?? ""}
                  onChange={(e) => onFormChange("precio", e.target.value)}
                />
              </div>

              <button type="button" className="btn-add-entrada" id="btnAgregarEntrada" onClick={onAddEntrada}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Agregar
              </button>
            </div>

            <div className={`nuevo-tipo-wrap${showNuevoTipo ? "" : " hidden"}`} id="nuevoTipoWrap">
              <input
                type="text"
                id="inputNuevoTipo"
                className="field-input"
                placeholder="Nombre del nuevo tipo de entrada"
                maxLength={60}
                value={nuevoTipoVal}
                onChange={(e) => onSetNuevoTipoVal(e.target.value)}
              />
              <button type="button" className="btn-guardar-tipo" id="btnGuardarTipo" onClick={onGuardarNuevoTipo}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Guardar tipo
              </button>
            </div>

            <span className={`entradas-error${entradasError ? "" : " hidden"}`} id="entradasError">
              {entradasError}
            </span>

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
                        <span className="entrada-aforo">{entrada.aforo.toLocaleString("es-CO")} entradas{` · ${entrada.precio ? `$${Number(entrada.precio).toLocaleString("es-CO")}` : " Gratis"}`}</span>
                      </div>
                      <button
                        type="button"
                        className="btn-remove-entrada"
                        title="Eliminar"
                        onClick={() => onRemoveEntrada(entrada.tipo_entrada_id)}
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
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" id="btnCancelarModal" onClick={onClose}>
            Cancelar
          </button>
          <button
            className={`btn-primary${saving ? " loading" : ""}`}
            id="btnGuardar"
            disabled={saving}
            onClick={onSave}
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
  );
}
