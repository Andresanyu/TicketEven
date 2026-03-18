CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE eventos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
    fecha TIMESTAMP,
    valor NUMERIC,
    descripcion TEXT DEFAULT 'Sin descripción',
    imagen_url VARCHAR(255),
    activo BOOLEAN DEFAULT true
);

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('externo', 'admin')),
    activo BOOLEAN DEFAULT true,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE saved_events (
    user_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    event_id INTEGER REFERENCES eventos(id) ON DELETE CASCADE,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, event_id)
);

CREATE TABLE tipos_entrada (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE eventos_tipos_entrada (
    id SERIAL PRIMARY KEY,
    evento_id INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    tipo_entrada_id INTEGER NOT NULL REFERENCES tipos_entrada(id) ON DELETE CASCADE,
    aforo INTEGER NOT NULL CHECK (aforo >= 0),
    UNIQUE(evento_id, tipo_entrada_id)
);

CREATE INDEX idx_eventos_tipos_entrada_evento_id ON eventos_tipos_entrada(evento_id);
CREATE INDEX idx_eventos_tipos_entrada_tipo_entrada_id ON eventos_tipos_entrada(tipo_entrada_id);
