import { Router, Request, Response } from "express";
import { pool } from "../config/database";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT id, nombre FROM categorias ORDER BY nombre ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ error: "Error al obtener las categorías" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  const nombre = String(req.body?.nombre ?? "").trim();

  if (!nombre) {
    return res.status(400).json({ error: "El campo nombre es requerido" });
  }

  if (nombre.length > 100) {
    return res.status(400).json({ error: "El nombre no puede superar 100 caracteres" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO categorias (nombre) VALUES ($1) RETURNING id, nombre",
      [nombre]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(409).json({ error: "Ya existe una categoría con ese nombre" });
    }

    console.error("Error creating category:", err);
    res.status(500).json({ error: "Error al crear la categoría" });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID de categoría inválido" });
  }

  const nombre = String(req.body?.nombre ?? "").trim();

  if (!nombre) {
    return res.status(400).json({ error: "El campo nombre es requerido" });
  }

  if (nombre.length > 100) {
    return res.status(400).json({ error: "El nombre no puede superar 100 caracteres" });
  }

  try {
    const result = await pool.query(
      "UPDATE categorias SET nombre = $1 WHERE id = $2 RETURNING id, nombre",
      [nombre, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Categoría no encontrada" });
    }

    return res.json(result.rows[0]);
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(409).json({ error: "Ya existe una categoría con ese nombre" });
    }

    console.error("Error updating category:", err);
    return res.status(500).json({ error: "Error al actualizar la categoría" });
  }
});

export default router;
