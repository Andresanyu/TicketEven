import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { db, Event } from "../models/types";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.json(db.events);
});

router.get("/:id", (req: Request, res: Response) => {
  const event = db.events.find((e) => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: "Evento no encontrado" });
  res.json(event);
});

router.post("/", (req: Request, res: Response) => {
  const { nombre, categoria, fecha, valor, descripcion, imagen_url, activo } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: "El campo nombre es requerido" });
  }

  const categoryMap: Record<string, Event["category"]> = {
    concierto: "concert",
    teatro: "theater",
    deporte: "sport",
    conferencia: "conference",
    other: "other",
    concert: "concert",
    theater: "theater",
    sport: "sport",
    conference: "conference",
  };

  const normalizedCategory =
    categoryMap[String(categoria || "").toLowerCase()] ?? "other";

  const normalizedPrice = valor === undefined || valor === null ? 0 : Number(valor);
  if (Number.isNaN(normalizedPrice)) {
    return res.status(400).json({ error: "El campo valor debe ser numérico" });
  }

  const event: Event = {
    id: uuidv4(),
    name: nombre,
    date: fecha ? new Date(fecha).toISOString() : new Date().toISOString(),
    venue: descripcion || "Sin ubicación",
    category: normalizedCategory,
    totalSeats: 0,
    availableSeats: 0,
    price: normalizedPrice,
    status: activo === false ? "cancelled" : "active",
    createdAt: new Date().toISOString(),
  };

  void imagen_url;

  db.events.push(event);
  res.status(201).json(event);
});

router.put("/:id", (req: Request, res: Response) => {
  const index = db.events.findIndex((e) => e.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Evento no encontrado" });
  db.events[index] = { ...db.events[index], ...req.body };
  res.json(db.events[index]);
});

router.delete("/:id", (req: Request, res: Response) => {
  const index = db.events.findIndex((e) => e.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Evento no encontrado" });
  db.events.splice(index, 1);
  res.status(204).send();
});

export default router;