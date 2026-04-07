import { IPurchaseRepository } from "./purchase.repository.interface";
import { CreatePurchaseDTO, PurchaseRow, PurchaseDetailRow } from "./purchase.types";
import { pool } from "../config/database";

export class PurchaseService {
  constructor(private readonly repo: IPurchaseRepository) {}

  async create(usuarioId: number, dto: CreatePurchaseDTO): Promise<PurchaseRow> {
    // Obtiene precio actual del tipo de entrada
    const precioResult = await pool.query(
      "SELECT precio FROM eventos_tipos_entrada WHERE id = $1",
      [dto.evento_tipo_entrada_id]
    );

    if (precioResult.rowCount === 0) {
      throw new Error("Tipo de entrada no encontrado.");
    }

    const precio = Number(precioResult.rows[0].precio);
    const total  = precio * dto.cantidad;

    return this.repo.create(usuarioId, dto, total);
  }

  getByUser(usuarioId: number): Promise<PurchaseDetailRow[]> {
    return this.repo.findByUser(usuarioId);
  }

  async getById(id: number, usuarioId: number): Promise<PurchaseDetailRow> {
    const purchase = await this.repo.findById(id);

    if (!purchase) {
      throw new Error("Compra no encontrada.");
    }

    // Un externo solo puede ver sus propias compras
    if (purchase.usuario_id !== usuarioId) {
      throw new Error("No autorizado.");
    }

    return purchase;
  }
}