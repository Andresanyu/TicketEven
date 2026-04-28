export interface TicketReportRow {
  tipo_entrada: string;
  aforo_total: number;
  precio: number;
  vendidas: number;
  disponibles: number;
}

export interface EventCapacityReport {
  event_id: number;
  event_name: string;
  entries: TicketReportRow[];
}

export interface PurchaseRow {
  id: number;
  usuario_id: number;
  evento_tipo_entrada_id: number;
  cantidad: number;
  total: number;
  fecha_compra: string;
  estado: 'completada' | 'cancelada';
}
