import { Router, Request, Response } from "express";
import { pool } from "../config/database";
import { authenticateToken, authorizeAdmin } from "../middlewares/auth";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT id, nombre FROM tipos_entrada ORDER BY nombre ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching ticket types:", err);
    res.status(500).json({ error: "Error al obtener los tipos de entrada" });
  }
});

router.post("/", authenticateToken, authorizeAdmin, async (req: Request, res: Response) => {
  const nombre = String(req.body?.nombre ?? "").trim();

  if (!nombre) {
    return res.status(400).json({ error: "El campo nombre es requerido" });
  }

  if (nombre.length > 100) {
    return res.status(400).json({ error: "El nombre no puede superar 100 caracteres" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO tipos_entrada (nombre) VALUES ($1) RETURNING id, nombre",
      [nombre]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(409).json({ error: "Ya existe un tipo de entrada con ese nombre" });
    }

    console.error("Error creating ticket type:", err);
    return res.status(500).json({ error: "Error al crear el tipo de entrada" });
  }
});

export default router;
