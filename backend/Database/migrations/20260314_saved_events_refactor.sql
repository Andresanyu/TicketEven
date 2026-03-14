-- TicketEven migration: unify favorites/interested into saved_events
-- Safe to run multiple times (idempotent)

BEGIN;

-- 1) Create new bridge table for saved events.
CREATE TABLE IF NOT EXISTS saved_events (
  user_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  event_id INTEGER REFERENCES eventos(id) ON DELETE CASCADE,
  saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, event_id)
);

-- 2) Migrate data from legacy table if it exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'favoritos'
  ) THEN
    INSERT INTO saved_events (user_id, event_id, saved_at)
    SELECT
      f.usuario_id,
      f.evento_id,
      COALESCE(f.fecha_agregado, CURRENT_TIMESTAMP)
    FROM favoritos f
    ON CONFLICT (user_id, event_id) DO NOTHING;
  END IF;
END $$;

-- 3) Drop legacy table if present.
DROP TABLE IF EXISTS favoritos;

-- 4) Drop legacy interest counter column if present.
ALTER TABLE eventos
DROP COLUMN IF EXISTS contador_interes;

COMMIT;
