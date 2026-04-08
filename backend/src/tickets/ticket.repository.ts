import { Pool } from "pg";
import { ITicketRepository } from "./ticket.repository.interface";
import { EventCapacityReport } from "./ticket.types";

const CAPACITY_REPORT_QUERY = `
  SELECT
    ete.tipo_entrada_id   AS ticket_type_id,
    te.nombre             AS type_name,
    ete.aforo             AS available,
    COALESCE(SUM(t.quantity), 0)::int AS issued
  FROM eventos_tipos_entrada ete
  JOIN tipos_entrada te ON te.id = ete.tipo_entrada_id
  LEFT JOIN tickets t
    ON t.event_id = ete.evento_id
    AND t.ticket_type_id = ete.tipo_entrada_id
  WHERE ete.evento_id = $1
  GROUP BY ete.tipo_entrada_id, te.nombre, ete.aforo
  ORDER BY te.nombre ASC
`;

export class TicketRepository implements ITicketRepository {
  constructor(private readonly pool: Pool) {}

  async getCapacityReportByEvent(eventId: number): Promise<EventCapacityReport | null> {
    const client = await this.pool.connect();
    try {
      const [eventResult, entriesResult] = await Promise.all([
        client.query(`SELECT id, nombre FROM eventos WHERE id = $1`, [eventId]),
        client.query(CAPACITY_REPORT_QUERY, [eventId]),
      ]);

      if (eventResult.rows.length === 0) return null;

      const entries = entriesResult.rows.map((row) => ({
        ...row,
        remaining: row.available - row.issued,
      }));

      return {
        event_id:   eventResult.rows[0].id,
        event_name: eventResult.rows[0].nombre,
        entries,
      };
    } finally {
      client.release();
    }
  }
}
