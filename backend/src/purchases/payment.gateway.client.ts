import { CardDataDTO, PaymentGatewayResponse } from './purchase.types';

const PAYMENT_GATEWAY_URL = process.env.PAYMENT_GATEWAY_URL ?? 'http://localhost:3100';

export async function sendPaymentToGateway(payload: {
  id_reserva: number;
  monto: number;
  tarjeta: CardDataDTO;
}): Promise<PaymentGatewayResponse> {
  try {
    const response = await fetch(`${PAYMENT_GATEWAY_URL}/api/v1/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as PaymentGatewayResponse;

    // HTTP 402: Pago rechazado. Retorna la respuesta como está
    // para que el service la maneje con status === 'DECLINED'
    if (response.status === 402) {
      return data;
    }

    // HTTP 503 o 502: Gateway/Orquestador caído
    if (response.status === 503 || response.status === 502) {
      throw new Error('El servicio de pagos no está disponible.');
    }

    // HTTP 200 con status APPROVED: Retorna normalmente
    if (response.ok && response.status === 200) {
      return data;
    }

    // Cualquier otro código: Error genérico
    throw new Error(`Error inesperado del servicio de pagos (${response.status})`);
  } catch (error: any) {
    // Errores de red (ECONNREFUSED, timeout, etc.) o errores lanzados arriba
    throw new Error(`Error de red al conectar con el servicio de pagos: ${error?.message ?? 'desconocido'}`);
  }
}
