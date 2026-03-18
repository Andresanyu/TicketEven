INSERT INTO categorias (nombre) VALUES 
    ('Sin categoría'), 
    ('Música'),        
    ('Teatro'),        
    ('Deporte'),       
    ('Arte'),          
    ('Tech'),          
    ('Comedia'),
    ('Otro'),
    ('Conferencia')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO tipos_entrada (nombre) VALUES 
('Entrada General'),
('VIP'),
('Estudiante'),
('Niño'),
('Adulto Mayor'),
('Grupo (10+)'),
('Invitado Especial')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO eventos (nombre, categoria_id, fecha, valor, descripcion, imagen_url, activo)
VALUES 
    ('Concierto Rock Local', 2, '2026-03-15 20:00:00', 45000, 'Gran concierto de bandas locales.', 'https://picsum.photos/id/117/300/200', true),
    ('Obra de Teatro: Hamlet', 3, '2026-03-20 19:30:00', 35000, 'Clásico de Shakespeare.', 'https://picsum.photos/id/103/300/200', true),
    ('Final de Microfútbol', 4, '2026-04-05 18:00:00', 10000, 'Gran final del torneo relámpago.', 'https://picsum.photos/id/73/300/200', true),
    ('Exposición Acuarelas', 5, '2026-04-10 10:00:00', 0, 'Exposición gratuita de artistas.', 'https://picsum.photos/id/106/300/200', true),
    ('Tech Meetup Tunja', 6, '2026-04-18 15:00:00', 20000, 'Encuentro de desarrolladores.', 'https://picsum.photos/id/0/300/200', true),
    ('Stand Up: Noche de Risas', 7, '2026-05-02 21:00:00', 25000, 'Presentación de comediantes.', NULL, true),
    ('Festival Gastronómico', 8, '2026-05-15 12:00:00', 5000, 'Prueba los mejores platillos.', 'https://picsum.photos/id/42/300/200', true),
    ('Jazz en el Parque', 2, '2026-06-01 17:00:00', NULL, 'Tarde de jazz. Entrada libre.', 'https://picsum.photos/id/145/300/200', true),
    ('Musical Infantil', 3, '2026-06-12 15:00:00', 30000, 'Show lleno de magia.', 'https://picsum.photos/id/21/300/200', true),
    ('Maratón 10K', 4, '2026-07-05 07:00:00', 50000, 'Carrera atlética.', 'https://picsum.photos/id/64/300/200', true),
    ('Taller de Fotografía', 5, '2026-07-20 09:00:00', 80000, 'Aprende fotografía digital.', 'https://picsum.photos/id/250/300/200', true),
    ('Hackathon Universitaria', 6, '2026-08-15 08:00:00', 0, '24 horas de código.', 'https://picsum.photos/id/60/300/200', true),
    ('Monólogo: Vida Godín', 7, '2026-08-28 20:00:00', 40000, 'Anécdotas de oficina.', 'https://picsum.photos/id/65/300/200', true),
    ('Feria del Libro', 8, '2026-09-10 10:00:00', 15000, 'Títulos exclusivos y talleres.', 'https://picsum.photos/id/24/300/200', true),
    ('Recital de Piano', 2, '2026-09-25 19:00:00', 60000, 'Obras de Chopin y Beethoven.', 'https://picsum.photos/id/133/300/200', true),
    ('Títeres: El Bosque', 3, '2026-10-05 11:00:00', 12000, 'Obra de títeres.', NULL, false),
    ('Torneo de Ajedrez', 4, '2026-10-22 09:00:00', 20000, 'Torneo categoría abierta.', 'https://picsum.photos/id/40/300/200', true),
    ('Museo de Historia', 5, '2026-11-02 08:00:00', 0, 'Jornada de puertas abiertas.', 'https://picsum.photos/id/149/300/200', true),
    ('Conferencia IA 2026', 6, '2026-11-18 14:00:00', 120000, 'El futuro de la IA.', 'https://picsum.photos/id/160/300/200', true),
    ('Fiesta de Fin de Año', 1, '2026-12-31 22:00:00', 85000, 'Despide el año con nosotros.', 'https://picsum.photos/id/319/300/200', true);

INSERT INTO usuarios (nombre, email, password_hash, rol, activo)
VALUES 
('Juan Pérez', 'juan.perez@email.com', '$2b$10$zku3bZSfXzL0e1MCnCSJNuFQOwcmWFF98Rt/yvyGwZrPRiQf8.xvO', 'externo', true),
('María Gómez', 'maria.gomez@email.com', '$2b$10$abc123hashsimulado2', 'externo', true),
('Carlos López', 'carlos.lopez@email.com', '$2b$10$abc123hashsimulado3', 'externo', true),
('Admin Principal', 'admin@email.com', '$2b$10$zku3bZSfXzL0e1MCnCSJNuFQOwcmWFF98Rt/yvyGwZrPRiQf8.xvO', 'admin', true),
('Usuario Inactivo', 'inactivo@email.com', '$2b$10$abc123hashsimulado4', 'externo', false);

INSERT INTO saved_events (user_id, event_id)
VALUES
(1, 1),
(1, 2),
(2, 1),
(2, 3),
(3, 2),
(3, 4);

-- Vincular eventos con tipos de entrada (eventos_tipos_entrada)
INSERT INTO eventos_tipos_entrada (evento_id, tipo_entrada_id, aforo)
VALUES 
    -- Concierto Rock Local (evento 1): General y VIP
    (1, 1, 300),   -- General: 300 entradas
    (1, 2, 50),    -- VIP: 50 entradas
    -- Obra de Teatro: Hamlet (evento 2): General, Estudiante y VIP
    (2, 1, 150),   -- General: 150 entradas
    (2, 3, 80),    -- Estudiante: 80 entradas
    (2, 2, 30),    -- VIP: 30 entradas
    -- Final de Microfútbol (evento 3): General y Grupo
    (3, 1, 200),   -- General: 200 entradas
    (3, 6, 100),   -- Grupo (10+): 100 entradas
    -- Exposición Acuarelas (evento 4): General, Estudiante y Niño (libre acceso)
    (4, 1, 500),   -- General: 500 entradas
    (4, 3, 200),   -- Estudiante: 200 entradas
    (4, 4, 150),   -- Niño: 150 entradas
    -- Tech Meetup Tunja (evento 5): General y Estudiante
    (5, 1, 100),   -- General: 100 entradas
    (5, 3, 100),   -- Estudiante: 100 entradas
    -- Stand Up: Noche de Risas (evento 6): General y VIP
    (6, 1, 250),   -- General: 250 entradas
    (6, 2, 40),    -- VIP: 40 entradas
    -- Festival Gastronómico (evento 7): General, Familia y Grupo
    (7, 1, 400),   -- General: 400 entradas
    (7, 6, 150),   -- Grupo (10+): 150 entradas
    -- Jazz en el Parque (evento 8): General (libre acceso)
    (8, 1, 1000),  -- General: 1000 entradas (al aire libre)
    -- Musical Infantil (evento 9): General, Niño y Adulto Mayor
    (9, 1, 180),   -- General: 180 entradas
    (9, 4, 100),   -- Niño: 100 entradas
    (9, 5, 50),    -- Adulto Mayor: 50 entradas
    -- Maratón 10K (evento 10): General y Adulto Mayor
    (10, 1, 500),  -- General: 500 entradas
    (10, 5, 100),  -- Adulto Mayor: 100 entradas
    -- Taller de Fotografía (evento 11): Estudiante y General
    (11, 3, 40),   -- Estudiante: 40 entradas
    (11, 1, 20),   -- General: 20 entradas
    -- Hackathon Universitaria (evento 12): Estudiante (libre acceso)
    (12, 3, 200),  -- Estudiante: 200 entradas
    -- Monólogo: Vida Godín (evento 13): General y VIP
    (13, 1, 300),  -- General: 300 entradas
    (13, 2, 50),   -- VIP: 50 entradas
    -- Feria del Libro (evento 14): General, Estudiante y Niño
    (14, 1, 400),  -- General: 400 entradas
    (14, 3, 150),  -- Estudiante: 150 entradas
    (14, 4, 100),  -- Niño: 100 entradas
    -- Recital de Piano (evento 15): General y VIP
    (15, 1, 200),  -- General: 200 entradas
    (15, 2, 80),   -- VIP: 80 entradas
    -- Títeres: El Bosque (evento 16): Niño (evento inactivo)
    (16, 4, 120),  -- Niño: 120 entradas
    -- Torneo de Ajedrez (evento 17): General y Estudiante
    (17, 1, 100),  -- General: 100 entradas
    (17, 3, 80),   -- Estudiante: 80 entradas
    -- Museo de Historia (evento 18): General, Estudiante y Niño (libre acceso)
    (18, 1, 800),  -- General: 800 entradas
    (18, 3, 300),  -- Estudiante: 300 entradas
    (18, 4, 200),  -- Niño: 200 entradas
    -- Conferencia IA 2026 (evento 19): General, Estudiante y VIP
    (19, 1, 200),  -- General: 200 entradas
    (19, 3, 150),  -- Estudiante: 150 entradas
    (19, 2, 100),  -- VIP: 100 entradas
    -- Fiesta de Fin de Año (evento 20): General y VIP
    (20, 1, 500),  -- General: 500 entradas
    (20, 2, 100)   -- VIP: 100 entradas
ON CONFLICT (evento_id, tipo_entrada_id) DO NOTHING;