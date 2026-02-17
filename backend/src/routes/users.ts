import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { db, User } from "../models/types";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.json(db.users);
});

router.get("/:id", (req: Request, res: Response) => {
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
  res.json(user);
});

router.post("/", (req: Request, res: Response) => {
  const { name, email, role, city, preferences } = req.body;
  if (!name || !email || !role || !city) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }
  if (db.users.find((u) => u.email === email)) {
    return res.status(409).json({ error: "El email ya existe" });
  }
  const user: User = {
    id: uuidv4(),
    name,
    email,
    role: role || "customer",
    city,
    preferences: preferences || [],
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  res.status(201).json(user);
});

router.put("/:id", (req: Request, res: Response) => {
  const index = db.users.findIndex((u) => u.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Usuario no encontrado" });
  db.users[index] = { ...db.users[index], ...req.body };
  res.json(db.users[index]);
});

router.delete("/:id", (req: Request, res: Response) => {
  const index = db.users.findIndex((u) => u.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Usuario no encontrado" });
  db.users.splice(index, 1);
  res.status(204).send();
});

export default router;