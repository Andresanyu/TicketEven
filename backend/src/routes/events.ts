import { Router, Request, Response } from "express";
import { db, Event } from "../models/types";
import { pool } from "../config/database";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  pool.query("SELECT * FROM eventos", (err: Error | null, result) => {
    if (err) {
      console.error("Error fetching events:", err);
      return res.status(500).json({ error: "Error al obtener los eventos" });
    }
    res.json(result.rows);
  });
});

router.get("/:id", (req: Request, res: Response) => {
  const event = db.eventos.find((e) => e.id === Number(req.params.id));
  if (!event) return res.status(404).json({ error: "Evento no encontrado" });
  res.json(event);
});

router.post("/", (req: Request, res: Response) => {
  const { nombre, categoria, fecha, valor, descripcion, imagen_url, activo } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: "El campo nombre es requerido" });
  }

  const normalizedValor = valor === undefined || valor === null ? 0 : Number(valor);
  if (Number.isNaN(normalizedValor)) {
    return res.status(400).json({ error: "El campo valor debe ser numérico" });
  }

  pool.query("SELECT COALESCE(MAX(id), 0) AS last_id FROM eventos", (maxErr: Error | null, maxResult) => {
    if (maxErr) {
      console.error("Error getting last event id:", maxErr);
      return res.status(500).json({ error: "Error al crear el evento" });
    }

    const newId = Number(maxResult.rows[0].last_id) + 1;

    const event: Event = {
      id: newId,
      nombre: nombre,
      categoria: categoria || "Sin categoría",
      fecha: fecha ? new Date(fecha) : undefined,
      valor: normalizedValor,
      descripcion: descripcion || "Sin descripción",
      imagen_url: imagen_url || undefined,
      activo: activo !== false,
    };

    console.log("Creating event:", event);
    pool.query(
      "INSERT INTO eventos (id, nombre, categoria, fecha, valor, descripcion, imagen_url, activo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [event.id, event.nombre, event.categoria, event.fecha, event.valor, event.descripcion, event.imagen_url, event.activo],
      (err: Error | null) => {
        if (err) {
          console.error("Error inserting event:", err);
          return res.status(500).json({ error: "Error al crear el evento" });
        }
        db.eventos.push(event);
        res.status(201).json(event);
      }
    );
  });
});

router.put("/:id", (req: Request, res: Response) => {
  const index = db.eventos.findIndex((e) => e.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: "Evento no encontrado" });
  db.eventos[index] = { ...db.eventos[index], ...req.body };
  res.json(db.eventos[index]);
});

router.delete("/:id", (req: Request, res: Response) => {
  const index = db.eventos.findIndex((e) => e.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: "Evento no encontrado" });
  db.eventos.splice(index, 1);
  res.status(204).send();
});

export default router;