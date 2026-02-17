# TicketEven
Sistema de gestión de eventos y usuarios.

## Estructura de carpetas

```
eventpro/
├── backend/
│   ├── src/
│   │   ├── index.ts           # Entrada del servidor Express
│   │   ├── models/
│   │   │   └── types.ts       # Interfaces + store en memoria
│   │   └── routes/
│   │       ├── events.ts      # CRUD /api/events
│   │       └── users.ts       # CRUD /api/users
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/
    ├── index.html             # SPA principal (todas las páginas)
    ├── css/
    │   └── main.css           # Design tokens + estilos globales
    └── js/
        ├── api.js             # Cliente fetch para el API
        ├── events.js          # Lógica CRUD de eventos
        ├── users.js           # Lógica CRUD de usuarios
        └── app.js             # Navegación + utilidades
```

## Cómo correr

### Backend
```bash
cd backend
npm install
npm run dev
# API en http://localhost:3001
```

### Frontend
```bash
# Abrir frontend/index.html directamente en el navegador
# O usar un servidor local:
npx serve frontend
# Frontend en http://localhost:3000
```

## Próximos pasos (roadmap)

- [ ] Conectar base de datos PostgreSQL
- [ ] Autenticación JWT
- [ ] Módulo de venta de boletos con bloqueo de asientos
- [ ] Sistema de recomendaciones
- [ ] Reportes financieros
- [ ] Módulo de promociones
