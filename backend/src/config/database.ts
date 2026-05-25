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
    ALTER TABLE compras ADD COLUMN IF NOT EXISTS auth_code VARCHAR(50);
  `);

  await pool.query(`
    ALTER TABLE compras ADD COLUMN IF NOT EXISTS tarjeta_enmascarada VARCHAR(20);
  `);

  await pool.query(`
    ALTER TABLE compras ALTER COLUMN estado SET DEFAULT 'PENDIENTE';
  `);

  await pool.query(`
    UPDATE compras
    SET estado = CASE
      WHEN estado = 'completada' THEN 'PAGADO'
      WHEN estado = 'cancelada' THEN 'RECHAZADO'
      ELSE estado
    END;
  `);

  await pool.query(`
    ALTER TABLE compras DROP CONSTRAINT IF EXISTS compras_estado_check;
  `);

  await pool.query(`
    ALTER TABLE compras ADD CONSTRAINT compras_estado_check
    CHECK (estado IN ('PENDIENTE', 'PAGADO', 'RECHAZADO'));
  `);

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

  // Migración: agregar columna estado si no existe
  await pool.query(`
    ALTER TABLE eventos ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'activo';
  `);

  // Migrar datos existentes: activo=true → 'activo', activo=false → 'inactivo'
  await pool.query(`
    UPDATE eventos 
    SET estado = CASE WHEN activo = true THEN 'activo' ELSE 'inactivo' END 
    WHERE estado = 'activo' AND activo IS NOT NULL;
  `);

  // Agregar constraint si no existe
  await pool.query(`
    ALTER TABLE eventos DROP CONSTRAINT IF EXISTS eventos_estado_check;
  `);

  await pool.query(`
    ALTER TABLE eventos ADD CONSTRAINT eventos_estado_check 
    CHECK (estado IN ('activo', 'finalizado', 'inactivo'));
  `);
}

export async function checkAndUpdateExpiredEvents(): Promise<void> {
  try {
    await pool.query(`
      UPDATE eventos
      SET estado = 'finalizado'
      WHERE estado = 'activo'
        AND fecha IS NOT NULL
        AND fecha < NOW();
    `);
  } catch (err) {
    console.error('Error updating expired events:', err);
  }
}
