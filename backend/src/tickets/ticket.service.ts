import { ITicketRepository } from "./ticket.repository.interface";
import { EventCapacityReport } from "./ticket.types";

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class TicketService {
  constructor(private readonly repo: ITicketRepository) {}

  async getCapacityReport(eventId: number): Promise<EventCapacityReport> {
    const report = await this.repo.getCapacityReportByEvent(eventId);
    if (!report) throw new NotFoundError("Evento no encontrado");
    return report;
  }
}