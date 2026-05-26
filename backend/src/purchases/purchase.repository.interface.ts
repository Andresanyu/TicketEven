import {
  PurchaseRow,
  CreatePurchaseDTO,
  PurchaseDetailRow,
  PurchaseWithQR,
  PurchaseSuccessNotificationData,
  PurchaseRow as PurchaseRecord,
} from './purchase.types';

export interface IPurchaseRepository {
  createPending(
    usuarioId: number,
    dto: CreatePurchaseDTO,
    total: number,
  ): Promise<PurchaseRow>;
  updateEstado(
    purchaseId: number,
    estado: PurchaseRecord['estado'],
    authCode?: string,
    tarjetaEnmascarada?: string
  ): Promise<PurchaseRow | null>;
  findByUser(usuarioId: number): Promise<PurchaseDetailRow[]>;
  findById(id: number): Promise<Omit<PurchaseWithQR, 'qr_code'> | null>;
  findSuccessNotificationData(purchaseId: number): Promise<PurchaseSuccessNotificationData | null>;
  findPrecioByEntradaId(eventoTipoEntradaId: number): Promise<number | null>; // 👈
}
