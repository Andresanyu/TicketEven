import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { connectDatabase, runSchemaMigrations, checkAndUpdateExpiredEvents } from './config/database';

const PORT = process.env.PORT || 3001;

async function bootstrap() {
  try {
    await connectDatabase();
    await runSchemaMigrations();
    
    // Ejecutar verificación inicial de eventos expirados
    await checkAndUpdateExpiredEvents();
    
    // Verificar eventos expirados cada 5 minutos
    setInterval(checkAndUpdateExpiredEvents, 5 * 60 * 1000);
    
    app.listen(PORT, () => {
      console.log(`---> EventPro API corriendo en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('No se pudo iniciar la API por error de base de datos:', err);
    process.exit(1);
  }
}

bootstrap();
