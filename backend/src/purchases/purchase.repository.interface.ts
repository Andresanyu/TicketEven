import {
  PurchaseRow,
  CreatePurchaseDTO,
  PurchaseDetailRow,
  PurchaseWithQR,
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
  findPrecioByEntradaId(eventoTipoEntradaId: number): Promise<number | null>;
  // 👇 Nueva firma agregada
  getContextData(usuarioId: number, eventoTipoEntradaId: number): Promise<{ nombre_usuario: string; nombre_evento: string } | null>;
}