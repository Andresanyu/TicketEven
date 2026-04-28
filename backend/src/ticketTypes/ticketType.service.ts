import { ITicketTypeRepository } from './ticketType.repository.interface';
import { TicketTypeRow } from './ticketType.types';

export class TicketTypeService {
  constructor(private readonly ticketTypeRepository: ITicketTypeRepository) {}

  async getAll(): Promise<TicketTypeRow[]> {
    return this.ticketTypeRepository.findAll();
  }

  async create(nombre: string): Promise<TicketTypeRow> {
    return this.ticketTypeRepository.create({ nombre });
  }
}
