const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const PAYMENT_EVENTS_QUEUE = 'eventos_pago';
const AI_RESULTS_QUEUE = 'resultados_ia';
const RECONNECT_DELAY_MS = 5000;

type QueuePayload = Record<string, unknown>;

export interface PaymentEventData {
  id_reserva: number;
  estado: string;
  codigo_error: string | null;
  tipo_evento: string;
  [key: string]: unknown;
}

let connection: any = null;
let channel: any = null;
let io: any = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let initializationPromise: Promise<void> | null = null;
let shuttingDown = false;

function log(message: string, meta?: unknown): void {
  const suffix = meta === undefined ? '' : ` ${JSON.stringify(meta, null, 2)}`;
  console.log(`[RabbitMQ] ${message}${suffix}`);
}

function logError(message: string, error: unknown): void {
  console.error(`[RabbitMQ] ${message}`, error);
}

function prettyPrint(label: string, payload: QueuePayload): void {
  console.log(`[RabbitMQ][${label}] Mensaje recibido:`);
  console.log(JSON.stringify(payload, null, 2));
}

function emitAIResponse(payload: QueuePayload): void {
  if (!io) {
    log('Socket.io no está inicializado todavía. Se omitió el emit en tiempo real.');
    return;
  }

  io.emit('ia_response', payload);
  log('Evento ia_response emitido a todos los clientes conectados.', payload);
}

export function emitPaymentStep(step: string): void {
  if (!io) {
    log('Socket.io no está inicializado todavía. Se omitió el emit payment_step.');
    return;
  }

  io.emit('payment_step', step);
  log('Evento payment_step emitido a todos los clientes conectados.', { step });
}

function parseJson(raw: string): QueuePayload | null {
  try {
    return JSON.parse(raw) as QueuePayload;
  } catch (error) {
    return null;
  }
}

async function consumeAIResults(message: any): Promise<void> {
  if (!message) {
    return;
  }

  const raw = message.content.toString('utf8');
  const parsed = parseJson(raw);

  if (parsed) {
    prettyPrint(AI_RESULTS_QUEUE, parsed);
    emitAIResponse(parsed);
  } else {
    console.log(`[RabbitMQ][${AI_RESULTS_QUEUE}] Mensaje no JSON:`);
    console.log(raw);
    emitAIResponse({ raw_message: raw });
  }

  channel.ack(message);
}

export function setSocketServer(socketServer: any): void {
  io = socketServer;
  log('Socket.io registrado en el servicio RabbitMQ.');
}

async function connect(): Promise<void> {
  if (shuttingDown) {
    return;
  }

  try {
    log(`Conectando a ${RABBITMQ_URL}`);
    connection = await amqp.connect(RABBITMQ_URL);

    connection.on('error', (error: unknown) => {
      logError('Error en la conexión de RabbitMQ.', error);
    });

    connection.on('close', () => {
      log('La conexión con RabbitMQ se cerró.');
      channel = null;
      connection = null;
      initializationPromise = null;

      if (!shuttingDown) {
        scheduleReconnect();
      }
    });

    channel = await connection.createConfirmChannel();
    await channel.assertQueue(PAYMENT_EVENTS_QUEUE, { durable: true });
    await channel.assertQueue(AI_RESULTS_QUEUE, { durable: true });
    await channel.prefetch(10);

    await channel.consume(AI_RESULTS_QUEUE, consumeAIResults, { noAck: false });

    log(`Colas listas: ${PAYMENT_EVENTS_QUEUE}, ${AI_RESULTS_QUEUE}`);
    log(`Consumidor activo en ${AI_RESULTS_QUEUE}`);
  } catch (error) {
    logError('No se pudo conectar a RabbitMQ. Se reintentará automáticamente.', error);
    initializationPromise = null;

    if (!shuttingDown) {
      scheduleReconnect();
    }

    throw error;
  }
}

function scheduleReconnect(): void {
  if (shuttingDown || reconnectTimer) {
    return;
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;

    if (!initializationPromise) {
      initializationPromise = connect().finally(() => {
        initializationPromise = null;
      });
    }

    initializationPromise.catch((error) => {
      logError('Reconexión fallida. Se volverá a intentar.', error);
      scheduleReconnect();
    });
  }, RECONNECT_DELAY_MS);

  log(`Reconexión programada en ${RECONNECT_DELAY_MS / 1000} segundos.`);
}

async function ensureReady(): Promise<void> {
  if (channel) {
    return;
  }

  if (!initializationPromise) {
    initializationPromise = connect().finally(() => {
      initializationPromise = null;
    });
  }

  await initializationPromise;
}

export async function initializeRabbitMQ(): Promise<void> {
  await ensureReady();
}

export async function publishPaymentEvent(eventData: PaymentEventData): Promise<void> {
  await ensureReady();

  const payload: PaymentEventData = {
    ...eventData,
    codigo_error: eventData.codigo_error ?? null,
  };

  const body = Buffer.from(JSON.stringify(payload));
  const published = channel.sendToQueue(PAYMENT_EVENTS_QUEUE, body, {
    contentType: 'application/json',
    persistent: true,
  });

  if (!published) {
    log('La cola quedó bajo backpressure al publicar el evento.');
  }

  await channel.waitForConfirms();
  log(`Evento publicado en ${PAYMENT_EVENTS_QUEUE}`, payload);
}

export async function closeRabbitMQ(): Promise<void> {
  shuttingDown = true;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  try {
    if (channel) {
      await channel.close();
    }
  } catch (error) {
    logError('Error al cerrar el canal de RabbitMQ.', error);
  }

  try {
    if (connection) {
      await connection.close();
    }
  } catch (error) {
    logError('Error al cerrar la conexión de RabbitMQ.', error);
  }

  channel = null;
  connection = null;
  initializationPromise = null;
}
