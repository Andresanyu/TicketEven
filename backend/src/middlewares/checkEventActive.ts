// src/middlewares/checkEventActive.ts
import { Request, Response, NextFunction } from "express";
import { pool } from "../config/database";

export const checkEventActive = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { evento_tipo_entrada_id } = req.body;

    if (!evento_tipo_entrada_id) {
      res.status(400).json({ error: "Se requiere evento_tipo_entrada_id." });
      return;
    }

    const result = await pool.query(
      `SELECT e.activo 
       FROM eventos_tipos_entrada ete
       JOIN eventos e ON e.id = ete.evento_id
       WHERE ete.id = $1`,
      [evento_tipo_entrada_id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: "Tipo de entrada para el evento no encontrado." });
      return;
    }

    if (!result.rows[0].activo) {
      res.status(403).json({
        error: "El evento no está activo. No se pueden comprar boletas.",
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({ error: "Error al verificar el estado del evento." });
  }
};