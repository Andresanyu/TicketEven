import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const dbPort = Number(process.env.DB_PORT ?? 5432);
const rawDbPassword = process.env.DB_PASSWORD ?? process.env.PGPASSWORD;

if (rawDbPassword === undefined || rawDbPassword === null || String(rawDbPassword).trim() === '') {
  throw new Error(
    'DB_PASSWORD no está configurado. Define DB_PASSWORD en backend/.env para conectar con PostgreSQL (Docker/local).'
  );
}

const dbPassword = String(rawDbPassword);

export const pool = new Pool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number.isNaN(dbPort) ? 5432 : dbPort,
  user: process.env.DB_USER ?? 'postgres',
  database: process.env.DB_NAME ?? 'postgres',
  password: dbPassword,
});

export async function connectDatabase(): Promise<void> {
  await pool.query('SELECT 1');
}

export async function runSchemaMigrations(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tipos_entrada (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL UNIQUE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS eventos_tipos_entrada (
      evento_id INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
      tipo_entrada_id INTEGER NOT NULL REFERENCES tipos_entrada(id) ON DELETE RESTRICT,
      aforo INTEGER NOT NULL CHECK (aforo >= 0),
      PRIMARY KEY (evento_id, tipo_entrada_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS saved_events (
      user_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
      event_id INTEGER REFERENCES eventos(id) ON DELETE CASCADE,
      saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, event_id)
    )
  `);

  await pool
    .query(
      `
    INSERT INTO saved_events (user_id, event_id, saved_at)
    SELECT
      f.usuario_id,
      f.evento_id,
      COALESCE(f.fecha_agregado, CURRENT_TIMESTAMP)
    FROM favoritos f
    ON CONFLICT (user_id, event_id) DO NOTHING
  `
    )
    .catch(() => {
      // Ignora si la tabla legacy no existe en instalaciones limpias.
    });

  await pool.query(`
    DROP TABLE IF EXISTS favoritos
  `);

  await pool.query(`
    ALTER TABLE eventos
    DROP COLUMN IF EXISTS contador_interes
  `);
}
