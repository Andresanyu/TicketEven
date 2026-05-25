const fs = require('fs');
const path = require('path');
const amqp = require('amqplib');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const EVENT_QUEUE = 'eventos_pago';
const RESULT_QUEUE = 'resultados_ia';
const RECONNECT_DELAY_MS = 5000;

let connection = null;
let channel = null;
let reconnectTimer = null;
let isShuttingDown = false;

function log(message, ...args) {
  const timestamp = new Date().toISOString();
  console.log(`[worker ${timestamp}] ${message}`, ...args);
}

function logError(message, error) {
  const timestamp = new Date().toISOString();
  console.error(`[worker ${timestamp}] ${message}`, error);
}

function safeJsonParse(rawMessage) {
  try {
    return { ok: true, value: JSON.parse(rawMessage) };
  } catch (error) {
    return { ok: false, error };
  }
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function isTimeoutEvent(eventData) {
  const tipoEvento = normalizeText(eventData.tipo_evento);
  const estado = normalizeText(eventData.estado);
  const codigoError = normalizeText(eventData.codigo_error);

  return (
    tipoEvento.includes('timeout') ||
    tipoEvento.includes('red') ||
    estado.includes('timeout') ||
    codigoError.includes('timeout') ||
    codigoError.includes('network') ||
    codigoError.includes('red')
  );
}

function isFailedPaymentEvent(eventData) {
  const tipoEvento = normalizeText(eventData.tipo_evento);
  const estado = normalizeText(eventData.estado);
  const codigoError = normalizeText(eventData.codigo_error);

  return (
    tipoEvento.includes('fallido') ||
    tipoEvento.includes('failed') ||
    tipoEvento.includes('rechazado') ||
    estado.includes('fallido') ||
    estado.includes('failed') ||
    codigoError.includes('fondos') ||
    codigoError.includes('insuficiente') ||
    codigoError.includes('rechaz')
  );
}

function isSuccessEvent(eventData) {
  const tipoEvento = normalizeText(eventData.tipo_evento);
  const estado = normalizeText(eventData.estado);

  return (
    tipoEvento.includes('exitoso') ||
    tipoEvento.includes('success') ||
    estado.includes('exitoso') ||
    estado.includes('success') ||
    estado.includes('aprobado')
  );
}

function buildPrompt(eventData) {
  const baseContext = [
    `id_reserva: ${eventData.id_reserva}`,
    `estado: ${eventData.estado ?? 'n/a'}`,
    `codigo_error: ${eventData.codigo_error ?? 'n/a'}`,
    `tipo_evento: ${eventData.tipo_evento ?? 'n/a'}`,
  ].join('\n');

  if (isFailedPaymentEvent(eventData)) {
    return [
      'Eres un asistente de ventas experto en recuperación de pagos fallidos.',
      'Redacta un mensaje breve, empático y persuasivo en español para evitar que el usuario abandone la compra.',
      'Debe reconocer el problema con tacto, transmitir confianza y sugerir continuar el proceso.',
      'No menciones políticas internas ni detalles técnicos.',
      'Contexto del evento:',
      baseContext,
    ].join('\n');
  }

  if (isTimeoutEvent(eventData)) {
    return 'Detectamos un problema técnico, tu lugar está reservado por 5 minutos más, intenta con este enlace alternativo';
  }

  return [
    'Eres un asistente de eventos y experiencia del cliente.',
    'Redacta un mensaje emocionante, claro y útil en español para un pago exitoso.',
    'Incluye una sugerencia breve para el ingreso o próximos pasos, con tono positivo y profesional.',
    'Contexto del evento:',
    baseContext,
  ].join('\n');
}

function buildFallbackResponse(eventData) {
  if (isTimeoutEvent(eventData)) {
    return 'Detectamos un problema técnico, tu lugar está reservado por 5 minutos más, intenta con este enlace alternativo';
  }

  if (isFailedPaymentEvent(eventData)) {
    return 'Tuvimos un inconveniente con tu pago. No te preocupes, tu compra sigue disponible por un momento más. Si quieres, intenta nuevamente y te acompañamos hasta completar el proceso.';
  }

  if (isSuccessEvent(eventData)) {
    return '¡Pago confirmado! Tu acceso está listo. Revisa tus datos de ingreso y llega con tiempo para disfrutar la experiencia sin contratiempos.';
  }

  return 'Hemos recibido tu evento y estamos procesando la información correctamente.';
}

async function generateWithGemini(prompt) {
  if (!GEMINI_API_KEY) {
    log('GEMINI_API_KEY no está configurada. Se usará la respuesta simulada.');
    return null;
  }

  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text && text.trim() ? text.trim() : null;
  } catch (error) {
    logError('Error al generar respuesta con Gemini. Se usará fallback.', error);
    return null;
  }
}

async function generateAIResponse(eventData) {
  if (isTimeoutEvent(eventData)) {
    return buildFallbackResponse(eventData);
  }

  const prompt = buildPrompt(eventData);
  const geminiResponse = await generateWithGemini(prompt);

  if (geminiResponse) {
    return geminiResponse;
  }

  return buildFallbackResponse(eventData);
}

async function publishResult(eventData, responseText, metadata = {}) {
  const payload = {
    id_reserva: eventData.id_reserva ?? null,
    respuesta: responseText,
    tipo_evento: eventData.tipo_evento ?? null,
    estado: eventData.estado ?? null,
    codigo_error: eventData.codigo_error ?? null,
    procesado_en: new Date().toISOString(),
    ...metadata,
  };

  const content = Buffer.from(JSON.stringify(payload));
  const published = channel.sendToQueue(RESULT_QUEUE, content, {
    contentType: 'application/json',
    persistent: true,
  });

  if (!published) {
    log('La cola de salida aplicó backpressure; esperando confirmación del broker.');
  }

  await channel.waitForConfirms();
  log(`Resultado publicado en ${RESULT_QUEUE} para id_reserva=${payload.id_reserva}`);
}

async function handleMessage(message) {
  if (!message) {
    return;
  }

  const rawContent = message.content.toString('utf8');
  log(`Mensaje recibido desde ${EVENT_QUEUE}: ${rawContent}`);

  const parsed = safeJsonParse(rawContent);
  if (!parsed.ok) {
    await publishResult(
      { id_reserva: null, estado: 'error', codigo_error: 'JSON_INVALIDO', tipo_evento: 'Error de Parseo' },
      'No pudimos interpretar el evento recibido, pero el sistema sigue operativo para procesar nuevos mensajes.',
      {
        error: 'JSON_INVALIDO',
        detalle_error: parsed.error.message,
        contenido_original: rawContent,
      }
    );

    channel.ack(message);
    log('Mensaje inválido confirmado con ack después de publicar el resultado de error.');
    return;
  }

  const eventData = parsed.value;
  if (eventData.id_reserva === undefined || eventData.id_reserva === null) {
    const responseText = 'Recibimos tu evento, pero faltó el identificador de reserva. Por favor revisa la información y vuelve a intentarlo.';
    await publishResult(eventData, responseText, {
      error: 'ID_RESERVA_FALTANTE',
    });
    channel.ack(message);
    log('Mensaje procesado con ack pese a id_reserva faltante.');
    return;
  }

  const responseText = await generateAIResponse(eventData);
  await publishResult(eventData, responseText);
  channel.ack(message);
  log(`Mensaje confirmado con ack para id_reserva=${eventData.id_reserva}`);
}

function scheduleReconnect() {
  if (isShuttingDown || reconnectTimer) {
    return;
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    startWorker().catch((error) => {
      logError('Error al intentar reconectar con RabbitMQ.', error);
      scheduleReconnect();
    });
  }, RECONNECT_DELAY_MS);

  log(`Reconexión programada en ${RECONNECT_DELAY_MS / 1000} segundos.`);
}

async function startWorker() {
  if (isShuttingDown) {
    return;
  }

  try {
    log(`Conectando a RabbitMQ en ${RABBITMQ_URL}`);
    connection = await amqp.connect(RABBITMQ_URL);
    connection.on('error', (error) => {
      logError('Error de conexión con RabbitMQ.', error);
    });
    connection.on('close', () => {
      log('La conexión con RabbitMQ se cerró.');
      channel = null;
      connection = null;
      scheduleReconnect();
    });

    channel = await connection.createConfirmChannel();
    await channel.assertQueue(EVENT_QUEUE, { durable: true });
    await channel.assertQueue(RESULT_QUEUE, { durable: true });
    await channel.prefetch(1);

    log(`Colas verificadas: ${EVENT_QUEUE}, ${RESULT_QUEUE}`);
    log(`Esperando mensajes en ${EVENT_QUEUE}...`);

    await channel.consume(
      EVENT_QUEUE,
      async (message) => {
        try {
          await handleMessage(message);
        } catch (error) {
          logError('Error procesando mensaje. Se intentará reencolar.', error);
          try {
            if (message) {
              channel.nack(message, false, true);
            }
          } catch (nackError) {
            logError('No se pudo ejecutar nack sobre el mensaje.', nackError);
          }
        }
      },
      { noAck: false }
    );
  } catch (error) {
    logError('No se pudo iniciar el worker. Se reintentará la conexión.', error);
    scheduleReconnect();
  }
}

async function shutdown(signal) {
  log(`Recibida señal ${signal}. Cerrando worker...`);
  isShuttingDown = true;

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

  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (error) => {
  logError('Unhandled rejection en el worker.', error);
});
process.on('uncaughtException', (error) => {
  logError('Excepción no controlada en el worker.', error);
});

startWorker().catch((error) => {
  logError('Fallo fatal al arrancar el worker.', error);
  process.exit(1);
});
