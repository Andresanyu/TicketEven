import dotenv from "dotenv";
import path from "path";
import { Pool } from "pg";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const dbPort = Number(process.env.DB_PORT ?? 5432);
const rawDbPassword = process.env.DB_PASSWORD ?? process.env.PGPASSWORD;

if (rawDbPassword === undefined || rawDbPassword === null || String(rawDbPassword).trim() === "") {
  throw new Error(
    "DB_PASSWORD no está configurado. Define DB_PASSWORD en backend/.env para conectar con PostgreSQL (Docker/local)."
  );
}

const dbPassword = String(rawDbPassword);

export const pool = new Pool({
  host: process.env.DB_HOST ?? "localhost",
  port: Number.isNaN(dbPort) ? 5432 : dbPort,
  user: process.env.DB_USER ?? "postgres",
  database: process.env.DB_NAME ?? "postgres",
  password: dbPassword,
});

export async function connectDatabase(): Promise<void> {
  await pool.query("SELECT 1");
}

export async function runSchemaMigrations(): Promise<void> {
  await pool.query(`
    ALTER TABLE eventos
    ADD COLUMN IF NOT EXISTS contador_interes INTEGER DEFAULT 0
  `);

  await pool.query(`
    UPDATE eventos
    SET contador_interes = 0
    WHERE contador_interes IS NULL
  `);
}
