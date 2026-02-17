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
  const { name, date, venue, category, totalSeats, price } = req.body;
  if (!name || !date || !venue || !category || !totalSeats || !price) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }
  const event: Event = {
    id: uuidv4(),
    name,
    date,
    venue,
    category,
    totalSeats: Number(totalSeats),
    availableSeats: Number(totalSeats),
    price: Number(price),
    status: "active",
    createdAt: new Date().toISOString(),
  };
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