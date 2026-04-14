import { Pool } from "pg";
import { IAdminRepository } from "./admin.repository.interface";
import { AdminGlobalMetrics } from "./admin.types";

const GLOBAL_METRICS_QUERY = `
  SELECT
    (SELECT COALESCE(SUM(cantidad), 0) FROM compras WHERE estado = 'completada') AS total_tickets,
    (SELECT COUNT(*) FROM eventos WHERE activo = true)  AS active_events,
    (SELECT COUNT(*) FROM eventos WHERE fecha < NOW())  AS past_events,
    (SELECT COUNT(*) FROM usuarios WHERE activo = true) AS total_users;
`;

export class AdminRepository implements IAdminRepository {
  constructor(private readonly pool: Pool) {}

  async getGlobalMetrics(): Promise<AdminGlobalMetrics> {
    const result = await this.pool.query(GLOBAL_METRICS_QUERY);
    const row = result.rows[0] ?? {};
    return {
      total_tickets: Number(row.total_tickets ?? 0),
      active_events: Number(row.active_events ?? 0),
      past_events:   Number(row.past_events   ?? 0),
      total_users:   Number(row.total_users   ?? 0),
    };
  }
}