import { Request, Response, NextFunction } from "express";
import { pool } from "../config/database";

export const checkEventActive = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await pool.query(
      "SELECT activo FROM eventos WHERE id = $1",
      [req.params.id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: "Evento no encontrado." });
      return;
    }

    if (!result.rows[0].activo) {
      res.status(403).json({
        error: "El evento no está activo. No se puede modificar su aforo.",
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({ error: "Error al verificar el estado del evento." });
  }
};