import { IEventRepository } from './event.repository.interface';
import { EventRow, CreateEventDTO, UpdateEventDTO, PopularityReport } from './event.types';

export class EventService {
  constructor(private readonly eventRepository: IEventRepository) {}

  async getAll(): Promise<EventRow[]> {
    return this.eventRepository.findAll();
  }

  async getById(id: number): Promise<EventRow> {
    const event = await this.eventRepository.findById(id);

    if (!event) {
      throw new NotFoundError('Evento no encontrado');
    }

    return event;
  }

  async create(dto: CreateEventDTO): Promise<EventRow> {
    return this.eventRepository.create(dto);
  }

  async update(id: number, dto: UpdateEventDTO): Promise<EventRow> {
    const event = await this.eventRepository.update(id, dto);

    if (!event) {
      throw new NotFoundError('Evento no encontrado');
    }

    return event;
  }

  async patchActivo(id: number, activo: boolean): Promise<EventRow> {
    const event = await this.eventRepository.patchActivo(id, activo);

    if (!event) {
      throw new NotFoundError('Evento no encontrado');
    }

    return event;
  }

  async delete(id: number): Promise<void> {
    const deleted = await this.eventRepository.delete(id);

    if (!deleted) {
      throw new NotFoundError('Evento no encontrado');
    }
  }

  async toggleSaved(userId: number, eventId: number): Promise<{ isSaved: boolean }> {
    return this.eventRepository.toggleSaved(userId, eventId);
  }

  async getPopularityReport(): Promise<PopularityReport> {
    return this.eventRepository.getPopularityReport();
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}
