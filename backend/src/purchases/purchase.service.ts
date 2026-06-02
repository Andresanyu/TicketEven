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
import { publishPaymentEvent } from '../services/rabbitmq.service';

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

  async create(usuarioId: number, dto: CreatePurchaseWithPaymentDTO): Promise<PurchaseRow> {
    const precio = await this.repo.findPrecioByEntradaId(dto.evento_tipo_entrada_id);

    if (precio === null) {
      throw new Error('Tipo de entrada no encontrado.');
    }

    const total = precio * dto.cantidad;
    
    const contextData = await this.repo.getContextData(usuarioId, dto.evento_tipo_entrada_id);
    const nombreUsuario = contextData?.nombre_usuario || 'Usuario';
    const nombreEvento = contextData?.nombre_evento || 'el evento';

    const pendingPurchase = await this.repo.createPending(usuarioId, dto, total);

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
    try {
      const paymentResponse = await sendPaymentToGateway({
        id_reserva: pendingPurchase.id,
        monto: total,
        tarjeta: dto.tarjeta,
      });
      if (paymentResponse.status === 'DECLINED') {
        await this.repo.updateEstado(pendingPurchase.id, 'RECHAZADO');
        // 👇 2. Agregamos los nombres al evento de rechazo
        await this.safePublishEvent({
          id_reserva: pendingPurchase.id,
          estado: 'RECHAZADO',
          codigo_error: paymentResponse.reason ?? 'DECLINED',
          tipo_evento: 'Pago Fallido',
          nombre_usuario: nombreUsuario,
          nombre_evento: nombreEvento
        });
        throw new PaymentDeclinedError('Pago rechazado: ' + (paymentResponse.reason ?? 'Sin detalle'));
      }
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
        estado: 'PAGADO',
        codigo_error: null,
        tipo_evento: 'Pago Exitoso',
        nombre_usuario: nombreUsuario,
        nombre_evento: nombreEvento
      });

      return paidPurchase ?? pendingPurchase;
    } catch (err: any) {
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
        nombre_usuario: nombreUsuario,
        nombre_evento: nombreEvento
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
    nombre_usuario: string;
    nombre_evento: string;
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
