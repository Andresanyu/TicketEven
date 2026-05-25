import { Pool } from 'pg';
import { IPurchaseRepository } from './purchase.repository.interface';
import {
  PurchaseRow,
  CreatePurchaseDTO,
  PurchaseDetailRow,
  PurchaseWithQR,
  PurchaseRow as PurchaseRecord,
} from './purchase.types';

export class PurchaseRepository implements IPurchaseRepository {
  constructor(private readonly pool: Pool) {}

  async createPending(
    usuarioId: number,
    dto: CreatePurchaseDTO,
    total: number,
  ): Promise<PurchaseRow> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Descuenta el aforo con bloqueo para evitar condiciones de carrera
      const aforoResult = await client.query(
        `UPDATE eventos_tipos_entrada
         SET aforo = aforo - $1
         WHERE id = $2 AND aforo >= $1
         RETURNING aforo`,
        [dto.cantidad, dto.evento_tipo_entrada_id]
      );

      if (aforoResult.rowCount === 0) {
        throw new Error('No hay suficiente aforo disponible.');
      }

      const purchaseResult = await client.query(
        `INSERT INTO compras (
           usuario_id,
           evento_tipo_entrada_id,
           cantidad,
           total,
           estado
         )
         VALUES ($1, $2, $3, $4, 'PENDIENTE')
         RETURNING id, usuario_id, evento_tipo_entrada_id, cantidad, total, fecha_compra, estado, auth_code, tarjeta_enmascarada`,
        [usuarioId, dto.evento_tipo_entrada_id, dto.cantidad, total]
      );

      await client.query('COMMIT');
      return purchaseResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateEstado(
    purchaseId: number,
    estado: PurchaseRecord['estado'],
    authCode?: string,
    tarjetaEnmascarada?: string
  ): Promise<PurchaseRow | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const currentResult = await client.query(
        `SELECT id, evento_tipo_entrada_id, cantidad, estado
         FROM compras
         WHERE id = $1
         FOR UPDATE`,
        [purchaseId]
      );

      const currentRow = currentResult.rows[0];
      if (!currentRow) {
        await client.query('ROLLBACK');
        return null;
      }

      if (estado === 'RECHAZADO' && currentRow.estado !== 'RECHAZADO') {
        await client.query(
          `UPDATE eventos_tipos_entrada
           SET aforo = aforo + $1
           WHERE id = $2`,
          [currentRow.cantidad, currentRow.evento_tipo_entrada_id]
        );
      }

      const updateResult = await client.query(
        `UPDATE compras
         SET estado = $2,
             auth_code = COALESCE($3, auth_code),
             tarjeta_enmascarada = COALESCE($4, tarjeta_enmascarada)
         WHERE id = $1
         RETURNING id, usuario_id, evento_tipo_entrada_id, cantidad, total, fecha_compra, estado, auth_code, tarjeta_enmascarada`,
        [purchaseId, estado, authCode ?? null, tarjetaEnmascarada ?? null]
      );

      await client.query('COMMIT');
      return updateResult.rows[0] ?? null;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findByUser(usuarioId: number): Promise<PurchaseDetailRow[]> {
    const result = await this.pool.query(
      `SELECT 
         c.id, c.usuario_id, c.evento_tipo_entrada_id, c.cantidad,
        c.total, c.fecha_compra, c.estado, c.auth_code, c.tarjeta_enmascarada,
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

  async findPrecioByEntradaId(eventoTipoEntradaId: number): Promise<number | null> {
    const result = await this.pool.query('SELECT precio FROM eventos_tipos_entrada WHERE id = $1', [
      eventoTipoEntradaId,
    ]);
    return result.rowCount === 0 ? null : Number(result.rows[0].precio);
  }

  async findById(id: number): Promise<Omit<PurchaseWithQR, 'qr_code'> | null> {
    const result = await this.pool.query(
      `SELECT 
        c.id, c.usuario_id, c.evento_tipo_entrada_id, c.cantidad,
        c.total, c.fecha_compra, c.estado, c.auth_code, c.tarjeta_enmascarada,
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
