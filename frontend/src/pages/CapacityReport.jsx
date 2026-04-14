import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";
import api from "../lib/api.js";
import { Auth } from "../lib/auth.js";
import "../../css/capacity_report.css";

export default function CapacityReport() {
  const navigate = useNavigate();
  const [events, setEvents]   = useState([]);
  const [selected, setSelected] = useState("");
  const [report, setReport]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const adminName    = Auth.getPayload()?.nombre ?? "Administrador";
  const adminInitial = adminName.charAt(0).toUpperCase();

  // Carga lista de eventos al montar
  useEffect(() => {
    if (!Auth.isLoggedIn() || Auth.getRol() !== "admin") {
      navigate("/login");
      return;
    }
    api.get("/events", Auth.authOptions())
      .then(setEvents)
      .catch(() => setError("No se pudieron cargar los eventos."));
  }, [navigate]);

  // Carga reporte al seleccionar evento
  async function handleSelect(e) {
    const eventId = e.target.value;
    setSelected(eventId);
    setReport(null);
    setError("");
    if (!eventId) return;
    setLoading(true);
    try {
      const data = await api.get(
        `/tickets/capacity-report/${eventId}`,
        Auth.authOptions()
      );
      setReport(data);
    } catch (err) {
      setError("No se pudo cargar el reporte para este evento.");
    } finally {
      setLoading(false);
    }
  }

  const maxIssued = report
    ? Math.max(...report.entries.map((e) => e.vendidas), 1)
    : 1;

  return (
    <div style={{ display: "flex" }}>
      <Sidebar activeItem="reportes" adminName={adminName} adminInitial={adminInitial} />

      <main className="main cr-main">
        <div className="page-header">
          <h1 className="page-title">Reporte de Aforo<span>.</span></h1>
        </div>

        {/* Selector de evento */}
        <div className="cr-selector-wrap">
          <label className="cr-label">Selecciona un evento</label>
          <select className="cr-select" value={selected} onChange={handleSelect}>
            <option value="">— Elige un evento —</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.nombre}</option>
            ))}
          </select>
        </div>

        {/* Estados */}
        {error && <div className="cr-error">{error}</div>}
        {loading && <div className="cr-loading"><div className="spinner-sm" />Cargando reporte…</div>}

        {/* Tabla de reporte */}
        {report && !loading && (
          <div className="cr-card">
            <div className="cr-card-header">
              <span className="cr-event-name">{report.event_name}</span>
              <span className="cr-badge">{report.entries.length} tipos</span>
            </div>

            <table className="cr-table">
              <thead>
                <tr>
                  <th>Tipo de entrada</th>
                  <th>Disponibles</th>
                  <th>Emitidas</th>
                  <th>Restantes</th>
                  <th>Ocupación</th>
                </tr>
              </thead>
              <tbody>
                {report.entries.map((entry) => {
                  const pct = Math.round((entry.vendidas / entry.aforo_total) * 100);
                  const barColor = pct >= 90 ? "#e05c5c" : pct >= 60 ? "#f5a623" : "var(--accent)";
                  return (
                    <tr key={entry.ticket_type_id}>
                      <td className="cr-type-name">{entry.tipo_entrada}</td>
                      <td className="cr-num">{entry.aforo_total}</td>
                      <td className="cr-num">{entry.vendidas}</td>
                      <td className="cr-num cr-remaining">{entry.disponibles}</td>
                      <td className="cr-bar-cell">
                        <div className="cr-bar-wrap">
                          <div
                            className="cr-bar"
                            style={{ width: `${pct}%`, background: barColor }}
                          />
                        </div>
                        <span className="cr-pct">{pct}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty state */}
        {!selected && !loading && (
          <div className="cr-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 17H5a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v0a2 2 0 0 0-2-2h-4"/>
              <rect x="9" y="3" width="6" height="14" rx="1"/>
            </svg>
            <p>Selecciona un evento para ver el desglose de aforo</p>
          </div>
        )}
      </main>
    </div>
  );
}
