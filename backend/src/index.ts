import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from './app';
import { Server as SocketIOServer } from 'socket.io';
import { connectDatabase, runSchemaMigrations, checkAndUpdateExpiredEvents } from './config/database';
import { closeRabbitMQ, initializeRabbitMQ, setSocketServer } from './services/rabbitmq.service';

const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
  },
});

setSocketServer(io);

io.on('connection', (socket) => {
  console.log(`[Socket.io] Cliente conectado: ${socket.id}`);

  socket.on('disconnect', (reason) => {
    console.log(`[Socket.io] Cliente desconectado: ${socket.id} (${reason})`);
  });
});

async function bootstrap() {
  try {
    await connectDatabase();
    await runSchemaMigrations();
    void initializeRabbitMQ();
    
    // Ejecutar verificación inicial de eventos expirados
    await checkAndUpdateExpiredEvents();
    
    // Verificar eventos expirados cada 5 minutos
    setInterval(checkAndUpdateExpiredEvents, 5 * 60 * 1000);
    
    httpServer.listen(PORT, () => {
      console.log(`---> EventPro API corriendo en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('No se pudo iniciar la API por error de base de datos:', err);
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  console.log(`Recibida señal ${signal}. Cerrando RabbitMQ...`);
  await closeRabbitMQ();
  io.close();
  httpServer.close();
  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

bootstrap();
