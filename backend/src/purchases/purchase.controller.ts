import { Response } from 'express';
import { PurchaseService } from './purchase.service';
import { AuthRequest } from '../middlewares/auth';
import { CreatePurchaseDTO } from './purchase.types';

export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  create = async (req: AuthRequest, res: Response): Promise<void> => {
    const usuarioId = req.user!.id;

    const parsed = this.parseCreateBody(req.body);
    if ('error' in parsed) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    try {
      const purchase = await this.purchaseService.create(usuarioId, parsed.dto);
      res.status(201).json(purchase);
    } catch (err: any) {
      const status = err.message === 'No hay suficiente aforo disponible.' ? 409 : 400;
      res.status(status).json({ error: err.message });
    }
  };

  getMyPurchases = async (req: AuthRequest, res: Response): Promise<void> => {
    const usuarioId = req.user!.id;

    try {
      const purchases = await this.purchaseService.getByUser(usuarioId);
      res.json(purchases);
    } catch (err) {
      console.error('Error fetching purchases:', err);
      res.status(500).json({ error: 'Error al obtener las compras' });
    }
  };

  getById = async (req: AuthRequest, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const usuarioId = req.user!.id;

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'ID de compra inválido' });
      return;
    }

    try {
      const purchase = await this.purchaseService.getById(id, usuarioId);
      res.json(purchase);
    } catch (err: any) {
      if (err.message === 'Compra no encontrada.') {
        res.status(404).json({ error: err.message });
        return;
      }
      if (err.message === 'No autorizado.') {
        res.status(403).json({ error: err.message });
        return;
      }
      console.error('Error fetching purchase by id:', err);
      res.status(500).json({ error: 'Error al obtener la compra' });
    }
  };

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private parseCreateBody(body: any): { dto: CreatePurchaseDTO } | { error: string } {
    const { evento_tipo_entrada_id, cantidad } = body ?? {};

    if (!evento_tipo_entrada_id) {
      return { error: 'El campo evento_tipo_entrada_id es requerido' };
    }

    const parsedEntradaId = Number(evento_tipo_entrada_id);
    if (!Number.isInteger(parsedEntradaId) || parsedEntradaId <= 0) {
      return { error: 'El campo evento_tipo_entrada_id debe ser un número entero válido' };
    }

    const parsedCantidad = Number(cantidad);
    if (!Number.isInteger(parsedCantidad) || parsedCantidad <= 0) {
      return { error: 'El campo cantidad debe ser un número entero mayor a 0' };
    }

    return {
      dto: {
        evento_tipo_entrada_id: parsedEntradaId,
        cantidad: parsedCantidad,
      },
    };
  }
}
