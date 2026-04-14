import React from "react";

function formatFecha(fechaIso) {
  if (!fechaIso) return { date: "Sin fecha", time: "—" };
  const d = new Date(fechaIso);
  if (Number.isNaN(d.getTime())) return { date: "Sin fecha", time: "—" };
  return {
    date: d.toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" }),
    time: d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false }),
  };
}

export default function EventsTable({ events, loading, onEdit, onDelete }) {
  return (
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
          {events.map((ev) => {
            const fecha = formatFecha(ev.fecha);
            const statusCls = ev.activo ? "badge-active" : "badge-inactive";
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
                    onClick={() => onEdit(ev.id)}
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
                    onClick={() => onDelete(ev.id)}
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

      <div className={`table-empty${events.length === 0 && !loading ? "" : " hidden"}`} id="tableEmpty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <p>No se encontraron eventos</p>
      </div>
    </div>
  );
}
