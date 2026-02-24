export interface EventResponse {
  id: number;
  nombre: string;
  categoria: string;
  fecha: Date | null;
  valor: number | null;
  descripcion: string | null;
  imagen_url: string | null;
  activo: boolean | null;
}

export interface EventUpsertInput {
  nombre: string;
  categoria_id: number | string | null;
  fecha?: string | Date | null;
  valor?: number | string | null;
  descripcion?: string | null;
  imagen_url?: string | null;
  activo?: boolean | null;
}
