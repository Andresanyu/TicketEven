import { PurchaseRow, CreatePurchaseDTO, PurchaseDetailRow } from "./purchase.types";

export interface IPurchaseRepository {
  create(usuarioId: number, dto: CreatePurchaseDTO, total: number): Promise<PurchaseRow>;
  findByUser(usuarioId: number): Promise<PurchaseDetailRow[]>;
  findById(id: number): Promise<PurchaseDetailRow | null>;
}