export interface Event {
  id: number;
  nombre: string;
  categoria: string;
  fecha?: Date;
  valor?: number;
  descripcion: string;
  imagen_url?: string;
  activo: boolean;
}

export const db = {
  eventos: [] as Event[],
};
