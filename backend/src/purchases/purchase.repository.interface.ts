import {
  PurchaseRow,
  CreatePurchaseDTO,
  PurchaseDetailRow,
  PurchaseWithQR,
} from './purchase.types';

export interface IPurchaseRepository {
  create(usuarioId: number, dto: CreatePurchaseDTO, total: number): Promise<PurchaseRow>;
  findByUser(usuarioId: number): Promise<PurchaseDetailRow[]>;
  findById(id: number): Promise<Omit<PurchaseWithQR, 'qr_code'> | null>;
  findPrecioByEntradaId(eventoTipoEntradaId: number): Promise<number | null>; // 👈
}
