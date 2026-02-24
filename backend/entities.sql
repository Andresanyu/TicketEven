CREATE TABLE eventos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    categoria VARCHAR(100) DEFAULT 'Sin categoría',
    fecha TIMESTAMP,
    valor NUMERIC,
    descripcion TEXT DEFAULT 'Sin descripción',
    imagen_url VARCHAR(255),
    activo BOOLEAN DEFAULT true
);