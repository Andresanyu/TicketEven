import { Router, Request, Response } from "express";
import { EventUpsertInput } from "../models/types";
import { pool } from "../config/database";

const router = Router();

const EVENT_SELECT_QUERY = `
  SELECT
    e.id,
    e.nombre,
    COALESCE(c.nombre, 'Sin categoría') AS categoria,
    e.fecha,
    e.valor,
    e.descripcion,
    e.imagen_url,
    e.activo,
    e.contador_interes
  FROM eventos e
  LEFT JOIN categorias c ON c.id = e.categoria_id
`;

function parseCategoriaId(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return NaN;
  return parsed;
}

router.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`${EVENT_SELECT_QUERY} ORDER BY e.id DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching events:", err);
    res.status(500).json({ error: "Error al obtener los eventos" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID de evento inválido" });
  }

  try {
    const result = await pool.query(`${EVENT_SELECT_QUERY} WHERE e.id = $1`, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Evento no encontrado" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching event by id:", err);
    res.status(500).json({ error: "Error al obtener el evento" });
  }
});

router.get("/reporte", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `${EVENT_SELECT_QUERY} ORDER BY e.contador_interes DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching events report:", err);
    res.status(500).json({ error: "Error al obtener el reporte de eventos" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  const { nombre, categoria_id, fecha, valor, descripcion, imagen_url, activo } = req.body as EventUpsertInput;

  if (!nombre || !String(nombre).trim()) {
    return res.status(400).json({ error: "El campo nombre es requerido" });
  }

  const normalizedCategoriaId = parseCategoriaId(categoria_id);
  if (Number.isNaN(normalizedCategoriaId)) {
    return res.status(400).json({ error: "El campo categoria_id debe ser un número entero válido" });
  }

  const normalizedValor = valor === undefined || valor === null || valor === "" ? null : Number(valor);
  if (normalizedValor !== null && Number.isNaN(normalizedValor)) {
    return res.status(400).json({ error: "El campo valor debe ser numérico" });
  }

  const normalizedActivo = activo === undefined ? true : Boolean(activo);
  const normalizedFecha = fecha ? new Date(fecha) : null;

  if (normalizedFecha && Number.isNaN(normalizedFecha.getTime())) {
    return res.status(400).json({ error: "El campo fecha es inválido" });
  }

  try {
    const insertResult = await pool.query(
      `
        INSERT INTO eventos (nombre, categoria_id, fecha, valor, descripcion, imagen_url, activo)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `,
      [
        String(nombre).trim(),
        normalizedCategoriaId,
        normalizedFecha,
        normalizedValor,
        descripcion ?? null,
        imagen_url ?? null,
        normalizedActivo,
      ]
    );

    const createdEvent = await pool.query(`${EVENT_SELECT_QUERY} WHERE e.id = $1`, [insertResult.rows[0].id]);
    res.status(201).json(createdEvent.rows[0]);
  } catch (err) {
    console.error("Error inserting event:", err);
    res.status(500).json({ error: "Error al crear el evento" });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID de evento inválido" });
  }

  const { nombre, categoria_id, fecha, valor, descripcion, imagen_url, activo } = req.body as EventUpsertInput;

  if (!nombre || !String(nombre).trim()) {
    return res.status(400).json({ error: "El campo nombre es requerido" });
  }

  const normalizedCategoriaId = parseCategoriaId(categoria_id);
  if (Number.isNaN(normalizedCategoriaId)) {
    return res.status(400).json({ error: "El campo categoria_id debe ser un número entero válido" });
  }

  const normalizedValor = valor === undefined || valor === null || valor === "" ? null : Number(valor);
  if (normalizedValor !== null && Number.isNaN(normalizedValor)) {
    return res.status(400).json({ error: "El campo valor debe ser numérico" });
  }

  const normalizedFecha = fecha ? new Date(fecha) : null;
  if (normalizedFecha && Number.isNaN(normalizedFecha.getTime())) {
    return res.status(400).json({ error: "El campo fecha es inválido" });
  }

  try {
    const updateResult = await pool.query(
      `
        UPDATE eventos
        SET
          nombre = $1,
          categoria_id = $2,
          fecha = $3,
          valor = $4,
          descripcion = $5,
          imagen_url = $6,
          activo = $7
        WHERE id = $8
        RETURNING id
      `,
      [
        String(nombre).trim(),
        normalizedCategoriaId,
        normalizedFecha,
        normalizedValor,
        descripcion ?? null,
        imagen_url ?? null,
        activo ?? null,
        id,
      ]
    );

    if (updateResult.rowCount === 0) {
      return res.status(404).json({ error: "Evento no encontrado" });
    }

    const updatedEvent = await pool.query(`${EVENT_SELECT_QUERY} WHERE e.id = $1`, [id]);
    res.json(updatedEvent.rows[0]);
  } catch (err) {
    console.error("Error updating event:", err);
    res.status(500).json({ error: "Error al actualizar el evento" });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID de evento inválido" });
  }

  const hasActivoField = Object.prototype.hasOwnProperty.call(req.body ?? {}, "activo");
  if (!hasActivoField) {
    return res.status(400).json({ error: "El campo activo es requerido" });
  }

  const activo = Boolean(req.body.activo);

  try {
    const updateResult = await pool.query(
      `
        UPDATE eventos
        SET activo = $1
        WHERE id = $2
        RETURNING id
      `,
      [activo, id]
    );

    if (updateResult.rowCount === 0) {
      return res.status(404).json({ error: "Evento no encontrado" });
    }

    const updatedEvent = await pool.query(`${EVENT_SELECT_QUERY} WHERE e.id = $1`, [id]);
    return res.json(updatedEvent.rows[0]);
  } catch (err) {
    console.error("Error toggling event status:", err);
    return res.status(500).json({ error: "Error al actualizar el estado del evento" });
  }
});

router.patch("/:id/interes", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID de evento inválido" });
  }

  try {
    const updateResult = await pool.query(
      `
        UPDATE eventos
        SET contador_interes = COALESCE(contador_interes, 0) + 1
        WHERE id = $1
        RETURNING contador_interes
      `,
      [id]
    );

    if (updateResult.rowCount === 0) {
      return res.status(404).json({ error: "Evento no encontrado" });
    }

    return res.json({ contador_interes: updateResult.rows[0].contador_interes });
  } catch (err) {
    console.error("Error incrementing event interest counter:", err);
    return res.status(500).json({ error: "Error al registrar interés" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID de evento inválido" });
  }

  try {
    const result = await pool.query("DELETE FROM eventos WHERE id = $1", [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Evento no encontrado" });
    }
    res.status(204).send();
  } catch (err) {
    console.error("Error deleting event:", err);
    res.status(500).json({ error: "Error al eliminar el evento" });
  }
});

export default router;