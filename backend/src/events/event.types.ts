export interface EventRow {
    id: number;
    nombre: string;
    categoria: string;
    fecha: string | null;
    valor: number | null;
    descripcion: string | null;
    imagen_url: string | null;
    activo: boolean;
    entradas: EventTicketTypeRow[];
}

export interface EventTicketTypeRow {
    tipo_entrada_id: number;
    nombre: string;
    aforo: number;
}

export interface EventTicketTypeInput {
    tipo_entrada_id: number;
    aforo: number;
}

export interface CreateEventDTO {
    nombre: string;
    categoria_id: number | null;
    fecha: string | null;
    valor: number | null;
    descripcion: string | null;
    imagen_url: string | null;
    activo: boolean;
    entradas: EventTicketTypeInput[];
}

export interface UpdateEventDTO extends CreateEventDTO {}

export interface PopularityReportRow {
    event_id: number;
    event_name: string;
    category_name: string;
    saved_count: number;
}

export interface PopularityReport {
    events: PopularityReportRow[];
    total_saves: number;
    total_users: number;
}

export interface EventTicketTypeRow {
    id: number;  
    tipo_entrada_id: number;
    nombre: string;
    aforo: number;
    precio: number;    
}

export interface EventTicketTypeInput {
    tipo_entrada_id: number;
    aforo: number;
    precio: number;
}