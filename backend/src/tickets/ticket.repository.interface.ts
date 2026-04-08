import { EventCapacityReport } from "./ticket.types";

export interface ITicketRepository {
  getCapacityReportByEvent(eventId: number): Promise<EventCapacityReport | null>;
}
