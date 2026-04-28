import { TicketTypeRow, CreateTicketTypeDTO } from './ticketType.types';

export interface ITicketTypeRepository {
  findAll(): Promise<TicketTypeRow[]>;
  create(dto: CreateTicketTypeDTO): Promise<TicketTypeRow>;
}
