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