import { Request, Response } from 'express';
import { TicketTypeService } from './ticketType.service';

const PG_UNIQUE_VIOLATION = '23505';

export class TicketTypeController {
  constructor(private readonly ticketTypeService: TicketTypeService) {}

  getAll = async (_req: Request, res: Response): Promise<void> => {
    try {
      const ticketTypes = await this.ticketTypeService.getAll();
      res.json(ticketTypes);
    } catch (err) {
      console.error('Error fetching ticket types:', err);
      res.status(500).json({ error: 'Error al obtener los tipos de entrada' });
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const nombre = String(req.body?.nombre ?? '').trim();

    if (!nombre) {
      res.status(400).json({ error: 'El campo nombre es requerido' });
      return;
    }

    if (nombre.length > 100) {
      res.status(400).json({ error: 'El nombre no puede superar 100 caracteres' });
      return;
    }

    try {
      const ticketType = await this.ticketTypeService.create(nombre);
      res.status(201).json(ticketType);
    } catch (err: any) {
      if (err?.code === PG_UNIQUE_VIOLATION) {
        res.status(409).json({ error: 'Ya existe un tipo de entrada con ese nombre' });
        return;
      }
      console.error('Error creating ticket type:', err);
      res.status(500).json({ error: 'Error al crear el tipo de entrada' });
    }
  };
}
