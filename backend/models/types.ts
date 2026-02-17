export interface Event {
  id: string;
  name: string;
  date: string;
  venue: string;
  category: "concert" | "theater" | "sport" | "conference" | "other";
  totalSeats: number;
  availableSeats: number;
  price: number;
  status: "active" | "cancelled" | "sold_out";
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "customer";
  city: string;
  preferences: string[];
  createdAt: string;
}

// In-memory store (replace with DB in production)
export const db = {
  events: [] as Event[],
  users: [] as User[],
};

// Seed data
db.events.push(
  {
    id: "evt-1",
    name: "Festival de Jazz",
    date: "2025-03-15",
    venue: "Teatro Nacional",
    category: "concert",
    totalSeats: 500,
    availableSeats: 120,
    price: 85000,
    status: "active",
    createdAt: new Date().toISOString(),
  },
  {
    id: "evt-2",
    name: "Copa Regional Fútbol",
    date: "2025-04-02",
    venue: "Estadio El Campín",
    category: "sport",
    totalSeats: 2000,
    availableSeats: 850,
    price: 45000,
    status: "active",
    createdAt: new Date().toISOString(),
  }
);

db.users.push(
  {
    id: "usr-1",
    name: "Ana García",
    email: "ana@example.com",
    role: "admin",
    city: "Bogotá",
    preferences: ["concert", "theater"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "usr-2",
    name: "Carlos López",
    email: "carlos@example.com",
    role: "customer",
    city: "Medellín",
    preferences: ["sport"],
    createdAt: new Date().toISOString(),
  }
);