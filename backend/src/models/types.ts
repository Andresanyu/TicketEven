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

export interface UserResponse {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  fecha_registro: Date;
}

export interface UserSavedEventResponse {
  saved_at: Date;
  usuario_id: number;
  usuario_nombre: string;
  usuario_email: string;
  evento_id: number;
  evento_nombre: string;
  evento_fecha: Date;
  evento_valor: number;
}