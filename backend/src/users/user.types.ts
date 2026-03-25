export interface UserRow {
    id: number;
    nombre: string;
    email: string;
    password_hash?: string;
    rol: string;
    activo: boolean;
    fecha_registro: Date;
}

export interface SavedEventRow {
    saved_at: Date;
    usuario_id: number;
    usuario_nombre: string;
    usuario_email: string;
    evento_id: number;
    evento_nombre: string;
    evento_fecha: Date;
    evento_valor: number;
}

export interface CreateUserDTO {
    nombre: string;
    email: string;
    password_hash: string;
}

// Alias clean type without password_hash for public exposure
export type User = Omit<UserRow, "password_hash">;