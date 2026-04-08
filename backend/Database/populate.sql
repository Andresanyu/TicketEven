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
('Juan Pérez',      'juan.perez@email.com',  '$2b$10$zku3bZSfXzL0e1MCnCSJNuFQOwcmWFF98Rt/yvyGwZrPRiQf8.xvO', 'externo', true),
('María Gómez',    'maria.gomez@email.com',  '$2b$10$zku3bZSfXzL0e1MCnCSJNuFQOwcmWFF98Rt/yvyGwZrPRiQf8.xvO', 'externo', true),
('Carlos López',   'carlos.lopez@email.com', '$2b$10$zku3bZSfXzL0e1MCnCSJNuFQOwcmWFF98Rt/yvyGwZrPRiQf8.xvO', 'externo', true),
('Admin Principal', 'admin@email.com',        '$2b$10$zku3bZSfXzL0e1MCnCSJNuFQOwcmWFF98Rt/yvyGwZrPRiQf8.xvO', 'admin',   true),
('Usuario Inactivo','inactivo@email.com',     '$2b$10$zku3bZSfXzL0e1MCnCSJNuFQOwcmWFF98Rt/yvyGwZrPRiQf8.xvO', 'externo', false);

INSERT INTO saved_events (user_id, event_id) VALUES
(1, 1), (1, 2), (2, 1), (2, 3), (3, 2), (3, 4);

INSERT INTO eventos_tipos_entrada (evento_id, tipo_entrada_id, aforo, precio) VALUES 
    (1, 1, 300, 45000),  (1, 2, 50,  90000),
    (2, 1, 150, 35000),  (2, 3, 80,  20000),  (2, 2, 30,  70000),
    (3, 1, 200, 10000),  (3, 6, 100, 8000),
    (4, 1, 500, 0),      (4, 3, 200, 0),      (4, 4, 150, 0),
    (5, 1, 100, 20000),  (5, 3, 100, 10000),
    (6, 1, 250, 25000),  (6, 2, 40,  50000),
    (7, 1, 400, 5000),   (7, 6, 150, 4000),
    (8, 1, 1000, 0),
    (9, 1, 180, 30000),  (9, 4, 100, 15000),  (9, 5, 50,  15000),
    (10, 1, 500, 50000), (10, 5, 100, 50000),
    (11, 3, 40,  60000), (11, 1, 20,  80000),
    (12, 3, 200, 0),
    (13, 1, 300, 40000), (13, 2, 50,  80000),
    (14, 1, 400, 15000), (14, 3, 150, 8000),  (14, 4, 100, 5000),
    (15, 1, 200, 60000), (15, 2, 80,  120000),
    (16, 4, 120, 12000),
    (17, 1, 100, 20000), (17, 3, 80,  10000),
    (18, 1, 800, 0),     (18, 3, 300, 0),     (18, 4, 200, 0),
    (19, 1, 200, 120000),(19, 3, 150, 60000), (19, 2, 100, 200000),
    (20, 1, 500, 85000), (20, 2, 100, 150000)
ON CONFLICT (evento_id, tipo_entrada_id) DO NOTHING;

-- compras (usuario_id, evento_tipo_entrada_id, cantidad, total)
-- evento_tipo_entrada_id sigue el orden del insert anterior
-- ete id 1 = evento 1 General, id 2 = evento 1 VIP, id 3 = evento 2 General, etc.
INSERT INTO compras (usuario_id, evento_tipo_entrada_id, cantidad, total, estado) VALUES
(1, 1,  2, 90000,  'completada'),  -- Juan: 2x General Concierto Rock
(1, 2,  1, 90000,  'completada'),  -- Juan: 1x VIP Concierto Rock
(2, 1,  3, 135000, 'completada'),  -- María: 3x General Concierto Rock
(2, 3,  2, 70000,  'completada'),  -- María: 2x General Teatro Hamlet
(3, 2,  1, 90000,  'completada'),  -- Carlos: 1x VIP Concierto Rock
(3, 4,  1, 20000,  'completada'),  -- Carlos: 1x Estudiante Teatro Hamlet
(1, 6,  2, 20000,  'completada'),  -- Juan: 2x General Microfútbol
(2, 11, 1, 20000,  'completada'),  -- María: 1x General Tech Meetup
(1, 13, 2, 50000,  'completada'),  -- Juan: 2x General Stand Up
(3, 19, 1, 30000,  'cancelada');   -- Carlos: 1x General Musical Infantil (cancelada)