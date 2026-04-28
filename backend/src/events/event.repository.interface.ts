import { EventRow, CreateEventDTO, UpdateEventDTO, PopularityReport } from './event.types';

export interface IEventRepository {
  findAll(): Promise<EventRow[]>;
  findById(id: number): Promise<EventRow | null>;
  create(dto: CreateEventDTO): Promise<EventRow>;
  update(id: number, dto: UpdateEventDTO): Promise<EventRow | null>;
  patchActivo(id: number, activo: boolean): Promise<EventRow | null>;
  delete(id: number): Promise<boolean>;

  toggleSaved(userId: number, eventId: number): Promise<{ isSaved: boolean }>;
  getPopularityReport(): Promise<PopularityReport>;
}
