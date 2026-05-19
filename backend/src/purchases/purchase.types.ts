export interface PurchaseRow {
  id: number;
  usuario_id: number;
  evento_tipo_entrada_id: number;
  cantidad: number;
  total: number;
  fecha_compra: Date;
  estado: 'completada' | 'cancelada';
  auth_code?: string;
  tarjeta_enmascarada?: string;
}

export interface CreatePurchaseDTO {
  evento_tipo_entrada_id: number;
  cantidad: number;
}

export interface CardDataDTO {
  pan_number: string;
  cvv: string;
  nombre_titular: string;
  franquicia: string; // "VISA" o "MASTERCARD"
}

export interface CreatePurchaseWithPaymentDTO extends CreatePurchaseDTO {
  tarjeta: CardDataDTO;
}

export interface PaymentGatewayResponse {
  status: 'APPROVED' | 'DECLINED';
  auth_code?: string;
  tarjeta_enmascarada?: string;
  reason?: string;
}

export interface PurchaseDetailRow extends PurchaseRow {
  evento_nombre: string;
  tipo_entrada_nombre: string;
  precio_unitario: number;
}

export interface PurchaseWithQR extends PurchaseDetailRow {
  qr_code: string; // base64 data URL
  fecha_evento: Date | null;
}
