import { Pool } from "pg";

const dbPort = Number(process.env.DB_PORT ?? 5432);

export const pool = new Pool({
  host: process.env.DB_HOST ?? "localhost",
  port: Number.isNaN(dbPort) ? 5432 : dbPort,
  user: process.env.DB_USER ?? "postgres",
  database: process.env.DB_NAME ?? "postgres",
  password: process.env.DB_PASSWORD ?? "bases123",
});

export async function connectDatabase(): Promise<void> {
  await pool.query("SELECT 1");
}
