import { Request, Response } from 'express';
import { EventService, NotFoundError } from './event.service';
import { AuthRequest } from '../middlewares/auth';
import { parseEntradas, parseCategoriaId, parseValor, parseEstado } from './event.parsers';
import { CreateEventDTO, UpdateEventDTO, EventoEstado } from './event.types';
import { EventNotFoundError } from '../utils/EventNotFoundError';

export class EventController {
  constructor(private readonly eventService: EventService) {}

  getAll = async (_req: Request, res: Response): Promise<void> => {
    try {
      const events = await this.eventService.getAll();
      res.json(events);
    } catch (err) {
      console.error('Error fetching events:', err);
      res.status(500).json({ error: 'Error al obtener los eventos' });
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'ID de evento inválido' });
      return;
    }

    try {
      const event = await this.eventService.getById(id);
      res.json(event);
    } catch (err) {
      if (err instanceof NotFoundError) {
        res.status(404).json({ error: err.message });
        return;
      }
      console.error('Error fetching event by id:', err);
      res.status(500).json({ error: 'Error al obtener el evento' });
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const parsed = this.parseUpsertBody(req.body, true);

    if ('error' in parsed) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    try {
      const event = await this.eventService.create(parsed.dto);
      res.status(201).json(event);
    } catch (err: any) {
      console.error('Error creating event:', err?.message || err);
      res.status(500).json({ error: 'Error al crear el evento', details: err?.message });
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'ID de evento inválido' });
      return;
    }

    const parsed = this.parseUpsertBody(req.body, true);

    if ('error' in parsed) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    try {
      const event = await this.eventService.update(id, parsed.dto);
      res.json(event);
    } catch (err: any) {
      if (err instanceof NotFoundError) {
        res.status(404).json({ error: err.message });
        return;
      }
      console.error('Error updating event:', err?.message || err);
      res.status(500).json({ error: 'Error al actualizar el evento', details: err?.message });
    }
  };

  patchEstado = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'ID de evento inválido' });
      return;
    }

    const hasEstadoField = Object.prototype.hasOwnProperty.call(req.body ?? {}, 'estado');

    if (!hasEstadoField) {
      res.status(400).json({ error: 'El campo estado es requerido' });
      return;
    }

    const estado = parseEstado(req.body.estado);
    if (!estado) {
      res.status(400).json({ error: 'El campo estado debe ser: activo, finalizado o inactivo' });
      return;
    }

    try {
      const event = await this.eventService.patchEstado(id, estado);
      res.json(event);
    } catch (err) {
      if (err instanceof NotFoundError) {
        res.status(404).json({ error: err.message });
        return;
      }
      console.error('Error toggling event status:', err);
      res.status(500).json({ error: 'Error al actualizar el estado del evento' });
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'ID de evento inválido' });
      return;
    }

    try {
      await this.eventService.delete(id);
      res.status(204).send();
    } catch (err) {
      if (err instanceof NotFoundError) {
        res.status(404).json({ error: err.message });
        return;
      }
      console.error('Error deleting event:', err);
      res.status(500).json({ error: 'Error al eliminar el evento' });
    }
  };

  toggleSaved = async (req: AuthRequest, res: Response): Promise<void> => {
    const eventId = Number(req.params.id);
    const userId = req.user!.id;

    if (!Number.isInteger(eventId) || eventId <= 0) {
      res.status(400).json({ error: 'ID de evento inválido' });
      return;
    }

    try {
      const result = await this.eventService.toggleSaved(userId, eventId);
      res.json(result);
    } catch (err) {
      if (err instanceof NotFoundError || err instanceof EventNotFoundError) {
        res.status(404).json({ error: 'Evento no encontrado' });
        return;
      }
      console.error('Error toggling saved event:', err);
      res.status(500).json({ error: 'Error al guardar el evento' });
    }
  };

  getPopularityReport = async (_req: Request, res: Response): Promise<void> => {
    try {
      const report = await this.eventService.getPopularityReport();
      res.json(report);
    } catch (err) {
      console.error('Error fetching popularity report:', err);
      res.status(500).json({ error: 'Error al obtener el reporte de popularidad' });
    }
  };

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private parseUpsertBody(
    body: any,
    entradasRequired: boolean
  ): { dto: CreateEventDTO | UpdateEventDTO } | { error: string } {
    const { nombre, categoria_id, fecha, valor, descripcion, imagen_url, estado, entradas } =
      body ?? {};

    if (!nombre || !String(nombre).trim()) {
      return { error: 'El campo nombre es requerido' };
    }

    const normalizedCategoriaId = parseCategoriaId(categoria_id);
    if (Number.isNaN(normalizedCategoriaId)) {
      return { error: 'El campo categoria_id debe ser un número entero válido' };
    }

    const normalizedValor = parseValor(valor);
    if (Number.isNaN(normalizedValor)) {
      return { error: 'El campo valor debe ser numérico' };
    }

    const entradasResult = parseEntradas(entradas, entradasRequired);
    if (entradasResult.error) {
      return { error: entradasResult.error };
    }

    const normalizedEstado = parseEstado(estado) || 'activo' as EventoEstado;

    return {
      dto: {
        nombre: String(nombre).trim(),
        categoria_id: normalizedCategoriaId,
        fecha: fecha ? String(fecha) : null,
        valor: normalizedValor,
        descripcion: descripcion ?? null,
        imagen_url: imagen_url ?? null,
        estado: normalizedEstado,
        entradas: entradasResult.entradas ?? [],
      },
    };
  }
}
