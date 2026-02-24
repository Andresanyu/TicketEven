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

db.eventos.push(
  {
    id: 1,
    nombre: "Festival de Jazz",
    categoria: "Música",
    fecha: new Date("2025-03-15"),
    valor: 85000,
    descripcion: "Festival de música jazz en vivo",
    imagen_url: "https://example.com/jazz.jpg",
    activo: true,
  },
  {
    id: 2,
    nombre: "Copa Regional Fútbol",
    categoria: "Deporte",
    fecha: new Date("2025-04-02"),
    valor: 45000,
    descripcion: "Torneo de fútbol regional",
    imagen_url: "https://example.com/futbol.jpg",
    activo: true,
  }
);