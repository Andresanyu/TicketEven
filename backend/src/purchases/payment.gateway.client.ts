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
    return data;
  } catch (error: any) {
    throw new Error(`Error de red al conectar con el servicio de pagos: ${error?.message ?? 'desconocido'}`);
  }
}
