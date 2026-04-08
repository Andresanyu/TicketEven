import { Pool } from "pg";
import { IPurchaseRepository } from "./purchase.repository.interface";
import { PurchaseRow, CreatePurchaseDTO, PurchaseDetailRow, PurchaseWithQR } from "./purchase.types";

export class PurchaseRepository implements IPurchaseRepository {
  constructor(private readonly pool: Pool) {}

  async create(
    usuarioId: number,
    dto: CreatePurchaseDTO,
    total: number
  ): Promise<PurchaseRow> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Descuenta el aforo con bloqueo para evitar condiciones de carrera
      const aforoResult = await client.query(
        `UPDATE eventos_tipos_entrada
         SET aforo = aforo - $1
         WHERE id = $2 AND aforo >= $1
         RETURNING aforo`,
        [dto.cantidad, dto.evento_tipo_entrada_id]
      );

      if (aforoResult.rowCount === 0) {
        throw new Error("No hay suficiente aforo disponible.");
      }

      const purchaseResult = await client.query(
        `INSERT INTO compras (usuario_id, evento_tipo_entrada_id, cantidad, total)
         VALUES ($1, $2, $3, $4)
         RETURNING id, usuario_id, evento_tipo_entrada_id, cantidad, total, fecha_compra, estado`,
        [usuarioId, dto.evento_tipo_entrada_id, dto.cantidad, total]
      );

      await client.query("COMMIT");
      return purchaseResult.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async findByUser(usuarioId: number): Promise<PurchaseDetailRow[]> {
    const result = await this.pool.query(
      `SELECT 
         c.id, c.usuario_id, c.evento_tipo_entrada_id, c.cantidad,
         c.total, c.fecha_compra, c.estado,
         e.nombre AS evento_nombre,
         te.nombre AS tipo_entrada_nombre,
         ete.precio AS precio_unitario
       FROM compras c
       JOIN eventos_tipos_entrada ete ON ete.id = c.evento_tipo_entrada_id
       JOIN eventos e ON e.id = ete.evento_id
       JOIN tipos_entrada te ON te.id = ete.tipo_entrada_id
       WHERE c.usuario_id = $1
       ORDER BY c.fecha_compra DESC`,
      [usuarioId]
    );
    return result.rows;
  }

  async findById(id: number): Promise<Omit<PurchaseWithQR, "qr_code"> | null> {
    const result = await this.pool.query(
      `SELECT 
        c.id, c.usuario_id, c.evento_tipo_entrada_id, c.cantidad,
        c.total, c.fecha_compra, c.estado,
        e.nombre AS evento_nombre,
        e.fecha  AS fecha_evento,
        te.nombre AS tipo_entrada_nombre,
        ete.precio AS precio_unitario
      FROM compras c
      JOIN eventos_tipos_entrada ete ON ete.id = c.evento_tipo_entrada_id
      JOIN eventos e ON e.id = ete.evento_id
      JOIN tipos_entrada te ON te.id = ete.tipo_entrada_id
      WHERE c.id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  }
}