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
