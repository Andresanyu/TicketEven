import QRCode from 'qrcode';
import { IPurchaseRepository } from './purchase.repository.interface';
import { sendPaymentToGateway } from './payment.gateway.client';
import {
  CreatePurchaseWithPaymentDTO,
  PurchaseRow,
  PurchaseDetailRow,
  PurchaseWithQR,
} from './purchase.types';
import logger from '../utils/logger';
import { emitPaymentStep, publishPaymentEvent } from '../services/rabbitmq.service';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class PaymentDeclinedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentDeclinedError';
  }
}

export class PaymentGatewayUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentGatewayUnavailableError';
  }
}

export class PurchaseService {
  constructor(private readonly repo: IPurchaseRepository) {}

  private resolveCardBrand(franquicia: string): string {
    const brand = String(franquicia ?? '').trim().toUpperCase();

    if (brand === 'VISA') {
      return 'Visa';
    }

    if (brand === 'MASTERCARD') {
      return 'Mastercard';
    }

    if (brand === 'NU') {
      return 'Nu';
    }

    return brand || 'Tarjeta';
  }

  async create(usuarioId: number, dto: CreatePurchaseWithPaymentDTO): Promise<PurchaseRow> {
    const precio = await this.repo.findPrecioByEntradaId(dto.evento_tipo_entrada_id);

    if (precio === null) {
      throw new Error('Tipo de entrada no encontrado.');
    }

    const total = precio * dto.cantidad;

    const pendingPurchase = await this.repo.createPending(usuarioId, dto, total);
    const purchaseNotificationDataPromise = this.repo
      .findSuccessNotificationData(pendingPurchase.id)
      .catch(() => null);
    const purchaseNotificationData = await purchaseNotificationDataPromise;
    const cardBrand = this.resolveCardBrand(dto.tarjeta.franquicia);

    try {
      logger.info('Created PENDIENTE purchase', {
        usuarioId,
        purchaseId: pendingPurchase.id,
        evento_tipo_entrada_id: dto.evento_tipo_entrada_id,
        cantidad: dto.cantidad,
        total,
      });
    } catch (e) {
      // non-fatal
    }

    // Step 1: Inform UI we're connecting to gateway
    emitPaymentStep('Conectando a la pasarela de pagos...');
    await delay(1000);

    // Paso de control: opcional ping al gateway. Si existiera una función de ping,
    // la podríamos ejecutar aquí y, en caso de fallo, publicar y fallar temprano.
    // Actualmente no hay ping disponible, así que asumimos conexión.

    // Step 2: Inform UI that the payment is being processed by the gateway
    emitPaymentStep('El pago está siendo procesado por la pasarela de pagos');
    await delay(1000);

    // Step 3: resolve card brand already computed above

    // Step 4: Inform UI we are connecting to the card network/service
    emitPaymentStep(`Conectando con el servicio ${cardBrand}...`);
    await delay(1000);

    // Step 6 (explicit): Execute the real payment here — ONLY HERE may network/card errors occur
    let paymentResponse;
    try {
      paymentResponse = await sendPaymentToGateway({
        id_reserva: pendingPurchase.id,
        monto: total,
        tarjeta: dto.tarjeta,
      });
    } catch (error: any) {
      // On network/gateway errors, mark as rejected, publish event and rethrow a specific error
      try {
        await this.repo.updateEstado(pendingPurchase.id, 'RECHAZADO');
      } catch (e) {
        // non-fatal
      }

      await this.safePublishEvent({
        id_reserva: pendingPurchase.id,
        estado: 'RECHAZADO',
        codigo_error: error?.message ?? 'ERROR_PASARELA',
        tipo_evento: error?.message?.includes('no está disponible') || String(error?.message ?? '').toLowerCase().includes('red')
          ? 'Timeout'
          : 'Pago Fallido',
        nombre_usuario: purchaseNotificationData?.nombre_usuario ?? '',
        nombre_evento: purchaseNotificationData?.nombre_evento ?? '',
      });

      throw new PaymentGatewayUnavailableError(
        error?.message ?? 'Error de red al conectar con el servicio de pagos.'
      );
    }

    // Evaluate gateway response: DECLINED or APPROVED
    try {
      if (paymentResponse.status === 'DECLINED') {
        await this.repo.updateEstado(pendingPurchase.id, 'RECHAZADO');
        await this.safePublishEvent({
          id_reserva: pendingPurchase.id,
          estado: 'RECHAZADO',
          codigo_error: paymentResponse.reason ?? 'DECLINED',
          tipo_evento: 'Pago Fallido',
          nombre_usuario: purchaseNotificationData?.nombre_usuario ?? '',
          nombre_evento: purchaseNotificationData?.nombre_evento ?? '',
        });
        throw new PaymentDeclinedError('Pago rechazado: ' + (paymentResponse.reason ?? 'Sin detalle'));
      }

      // If approved, inform UI that the card network is processing and wait a moment
      emitPaymentStep(`Su compra está siendo procesada por el servicio ${cardBrand}...`);
      await delay(1000);

      try {
        logger.result('Orquestador response', {
          purchaseId: pendingPurchase.id,
          status: paymentResponse.status,
          auth_code: paymentResponse.auth_code,
        });
      } catch (e) {}

      const paidPurchase = await this.repo.updateEstado(
        pendingPurchase.id,
        'PAGADO',
        paymentResponse.auth_code,
        paymentResponse.tarjeta_enmascarada
      );

      await this.safePublishEvent({
        id_reserva: pendingPurchase.id,
        estado: 'aprobado',
        codigo_error: null,
        tipo_evento: 'pago_exitoso',
        nombre_usuario: purchaseNotificationData?.nombre_usuario ?? '',
        nombre_evento: purchaseNotificationData?.nombre_evento ?? '',
      });

      return paidPurchase ?? pendingPurchase;
    } catch (err: any) {
      if (err instanceof PaymentDeclinedError || err instanceof PaymentGatewayUnavailableError) {
        throw err;
      }

      try {
        logger.error('Error processing payment', { purchaseId: pendingPurchase.id, error: err?.message, stack: err?.stack });
      } catch (e) {}

      await this.repo.updateEstado(pendingPurchase.id, 'RECHAZADO');

      await this.safePublishEvent({
        id_reserva: pendingPurchase.id,
        estado: 'RECHAZADO',
        codigo_error: err?.message ?? 'ERROR_DESCONOCIDO',
        tipo_evento: err?.message?.startsWith('Error de red')
          ? 'Timeout'
          : 'Pago Fallido',
        nombre_usuario: purchaseNotificationData?.nombre_usuario ?? '',
        nombre_evento: purchaseNotificationData?.nombre_evento ?? '',
      });

      if (err instanceof PaymentDeclinedError) {
        throw err;
      }

      // Si es un error de validación (400: medio de pago no soportado, etc), propagarlo tal cual
      if (err?.message && !err.message.startsWith('Error de red')) {
        throw err;
      }

      throw new PaymentGatewayUnavailableError('Error de red al conectar con el servicio de pagos.');
    }
  }

  getByUser(usuarioId: number): Promise<PurchaseDetailRow[]> {
    return this.repo.findByUser(usuarioId);
  }

  async getById(id: number, usuarioId: number): Promise<PurchaseWithQR> {
    const purchase = await this.repo.findById(id);

    if (!purchase) {
      throw new Error('Compra no encontrada.');
    }
    if (purchase.usuario_id !== usuarioId) {
      throw new Error('No autorizado.');
    }

    const qrPayload = `EVENTPRO-COMPRA-${purchase.id}-USUARIO-${purchase.usuario_id}`;
    const qr_code = await QRCode.toDataURL(qrPayload, {
      width: 280,
      margin: 2,
      color: { dark: '#111210', light: '#c6f135' },
    });

    return { ...purchase, qr_code };
  }

  private async safePublishEvent(eventData: {
    id_reserva: number;
    estado: string;
    codigo_error: string | null;
    tipo_evento: string;
    nombre_usuario?: string;
    nombre_evento?: string;
  }): Promise<void> {
    try {
      await publishPaymentEvent(eventData);
    } catch (error) {
      logger.error('No se pudo publicar el evento de pago en RabbitMQ', {
        eventData,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
