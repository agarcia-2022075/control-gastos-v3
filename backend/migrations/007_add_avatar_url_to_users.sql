-- Migración 007: Agregar avatar_url a la tabla users
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
