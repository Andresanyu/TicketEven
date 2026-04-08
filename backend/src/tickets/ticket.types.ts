export interface TicketReportRow {
  ticket_type_id: number;
  type_name: string;
  available: number;
  issued: number;
  remaining: number;
}

export interface EventCapacityReport {
  event_id: number;
  event_name: string;
  entries: TicketReportRow[];
}
