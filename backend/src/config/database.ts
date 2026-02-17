import { Pool } from "pg";

const dbPort = Number(process.env.DB_PORT ?? 5432);

export const pool = new Pool({
  host: process.env.DB_HOST ?? "localhost",
  port: Number.isNaN(dbPort) ? 5432 : dbPort,
  user: process.env.DB_USER ?? "",
  database: process.env.DB_NAME ?? "",
  password: process.env.DB_PASSWORD ?? "",
});

export async function connectDatabase(): Promise<void> {
  await pool.query("SELECT 1");
}
