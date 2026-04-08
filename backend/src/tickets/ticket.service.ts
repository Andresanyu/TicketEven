import { ITicketRepository } from "./ticket.repository.interface";
import { EventCapacityReport } from "./ticket.types";

export class TicketService {
  constructor(private readonly repo: ITicketRepository) {}

  async getCapacityReport(eventId: number): Promise<EventCapacityReport> {
    const report = await this.repo.getCapacityReportByEvent(eventId);
    if (!report) throw { status: 404, message: "Evento no encontrado" };
    return report;
  }
}
