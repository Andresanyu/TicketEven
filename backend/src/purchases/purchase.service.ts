import QRCode from 'qrcode';
import { IPurchaseRepository } from './purchase.repository.interface';
import { sendPaymentToGateway } from './payment.gateway.client';
import {
  CreatePurchaseWithPaymentDTO,
  PurchaseRow,
  PurchaseDetailRow,
  PurchaseWithQR,
} from './purchase.types';

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

    let paymentResponse;
    try {
      paymentResponse = await sendPaymentToGateway({
        id_reserva: dto.evento_tipo_entrada_id,
        monto: total,
        tarjeta: dto.tarjeta,
      });
    } catch (err: any) {
      // Si es un error de validación (400: medio de pago no soportado, etc), propagarlo tal cual
      if (err?.message && !err.message.startsWith('Error de red')) {
        throw err;
      }
      throw new PaymentGatewayUnavailableError('Error de red al conectar con el servicio de pagos.');
    }

    if (paymentResponse.status === 'DECLINED') {
      throw new PaymentDeclinedError('Pago rechazado: ' + (paymentResponse.reason ?? 'Sin detalle'));
    }

    return this.repo.create(
      usuarioId,
      dto,
      total,
      paymentResponse.auth_code,
      paymentResponse.tarjeta_enmascarada
    );
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
}
