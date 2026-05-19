import { EventRow, CreateEventDTO, UpdateEventDTO, PopularityReport, EventoEstado } from './event.types';

export interface IEventRepository {
  findAll(): Promise<EventRow[]>;
  findAllPublic(): Promise<EventRow[]>;
  findById(id: number): Promise<EventRow | null>;
  create(dto: CreateEventDTO): Promise<EventRow>;
  update(id: number, dto: UpdateEventDTO): Promise<EventRow | null>;
  patchEstado(id: number, estado: EventoEstado): Promise<EventRow | null>;
  delete(id: number): Promise<boolean>;

  toggleSaved(userId: number, eventId: number): Promise<{ isSaved: boolean }>;
  getPopularityReport(): Promise<PopularityReport>;
}
