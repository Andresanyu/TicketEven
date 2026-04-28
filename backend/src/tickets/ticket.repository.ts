import { Pool } from 'pg';
import { ITicketRepository } from './ticket.repository.interface';
import { EventCapacityReport } from './ticket.types';

const CAPACITY_REPORT_QUERY = `
  SELECT
    te.nombre                                    AS tipo_entrada,
    ete.aforo                                    AS aforo_total,
    ete.precio                                   AS precio,
    COALESCE(SUM(c.cantidad), 0)                 AS vendidas,
    ete.aforo - COALESCE(SUM(c.cantidad), 0)     AS disponibles
  FROM eventos_tipos_entrada ete
  JOIN tipos_entrada te ON te.id = ete.tipo_entrada_id
  LEFT JOIN compras c
    ON c.evento_tipo_entrada_id = ete.id
   AND c.estado = 'completada'
  WHERE ete.evento_id = $1
  GROUP BY te.nombre, ete.aforo, ete.precio
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
        tipo_entrada: row.tipo_entrada,
        aforo_total: Number(row.aforo_total ?? 0),
        precio: Number(row.precio ?? 0),
        vendidas: Number(row.vendidas ?? 0),
        disponibles: Number(row.disponibles ?? 0),
      }));

      return {
        event_id: eventResult.rows[0].id,
        event_name: eventResult.rows[0].nombre,
        entries,
      };
    } finally {
      client.release();
    }
  }
}
