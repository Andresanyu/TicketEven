import { Router, Request, Response } from "express";
import { EventUpsertInput } from "../models/types";
import { pool } from "../config/database";
import { authenticateToken, authorizeAdmin, AuthRequest } from "../middlewares/auth";

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
    e.activo
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

router.get("/reports/popularity", authenticateToken, authorizeAdmin, async (_req: Request, res: Response) => {
  try {
    const [eventsResult, statsResult] = await Promise.all([
      pool.query(`
        SELECT
          e.id                                AS event_id,
          e.nombre                            AS event_name,
          COALESCE(c.nombre, 'Sin categoría') AS category_name,
          COUNT(se.user_id)::INTEGER          AS saved_count
        FROM eventos e
        LEFT JOIN categorias c ON c.id = e.categoria_id
        LEFT JOIN saved_events se ON se.event_id = e.id
        GROUP BY e.id, e.nombre, c.nombre
        ORDER BY saved_count DESC, e.nombre ASC
      `),
      pool.query(`
        SELECT
          COUNT(DISTINCT user_id)::INTEGER AS total_users,
          COUNT(*)::INTEGER                AS total_saves
        FROM saved_events
      `)
    ]);

    res.json({
      events:      eventsResult.rows,
      total_saves: Number(statsResult.rows[0]?.total_saves ?? 0),
      total_users: Number(statsResult.rows[0]?.total_users ?? 0),
    });
  } catch (err) {
    console.error("Error fetching popularity report:", err);
    res.status(500).json({ error: "Error al obtener el reporte de popularidad" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID de evento inválido" });
  }

  try {
    const eventResult = await pool.query(`${EVENT_SELECT_QUERY} WHERE e.id = $1`, [id]);
    if (eventResult.rowCount === 0) {
      return res.status(404).json({ error: "Evento no encontrado" });
    }

    const event = eventResult.rows[0];

    // Fetch associated ticket entries
    const entradasResult = await pool.query(
      `SELECT
        ete.tipo_entrada_id,
        tt.nombre,
        ete.aforo
      FROM eventos_tipos_entrada ete
      INNER JOIN tipos_entrada tt ON tt.id = ete.tipo_entrada_id
      WHERE ete.evento_id = $1
      ORDER BY ete.tipo_entrada_id ASC`,
      [id]
    );

    event.entradas = entradasResult.rows;
    res.json(event);
  } catch (err) {
    console.error("Error fetching event by id:", err);
    res.status(500).json({ error: "Error al obtener el evento" });
  }
});

router.post("/:id/save", authenticateToken, async (req: AuthRequest, res: Response) => {
  const eventId = Number(req.params.id);
  const userId = req.user!.id;

  if (!Number.isInteger(eventId) || eventId <= 0) {
    return res.status(400).json({ error: "ID de evento inválido" });
  }

  try {
    const eventCheck = await pool.query("SELECT id FROM eventos WHERE id = $1", [eventId]);
    if (!eventCheck.rowCount) {
      return res.status(404).json({ error: "Evento no encontrado" });
    }

    const deleteResult = await pool.query(
      `DELETE FROM saved_events
       WHERE user_id = $1 AND event_id = $2
       RETURNING event_id`,
      [userId, eventId]
    );

    if (deleteResult.rowCount) {
      return res.json({ isSaved: false });
    }

    await pool.query(
      `INSERT INTO saved_events (user_id, event_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, event_id) DO NOTHING`,
      [userId, eventId]
    );

    return res.json({ isSaved: true });
  } catch (err) {
    console.error("Error toggling saved event:", err);
    return res.status(500).json({ error: "Error al guardar el evento" });
  }
});

router.post("/", authenticateToken, authorizeAdmin, async (req: Request, res: Response) => {
  const { nombre, categoria_id, fecha, valor, descripcion, imagen_url, activo, entradas } = req.body as EventUpsertInput & { entradas?: any[] };

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
  const normalizedFecha = fecha ? String(fecha) : null;

  // Validate entradas array
  const entradasArray = Array.isArray(entradas) ? entradas : [];
  const validatedEntradas: Array<{ tipo_entrada_id: number; aforo: number }> = [];
  
  for (const entrada of entradasArray) {
    const tipoEntradaId = Number(entrada?.tipo_entrada_id);
    const aforo = Number(entrada?.aforo);
    
    if (!Number.isInteger(tipoEntradaId) || tipoEntradaId <= 0) {
      return res.status(400).json({ error: "Invalid tipo_entrada_id in entradas array" });
    }
    
    if (!Number.isInteger(aforo) || aforo < 0) {
      return res.status(400).json({ error: "Invalid aforo in entradas array" });
    }
    
    validatedEntradas.push({ tipo_entrada_id: tipoEntradaId, aforo });
  }

  if (validatedEntradas.length === 0) {
    return res.status(400).json({ error: "At least one entrada is required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Insert event
    const insertResult = await client.query(
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

    const eventId = insertResult.rows[0].id;

    // Insert entradas
    for (const entrada of validatedEntradas) {
      await client.query(
        `INSERT INTO eventos_tipos_entrada (evento_id, tipo_entrada_id, aforo)
         VALUES ($1, $2, $3)`,
        [eventId, entrada.tipo_entrada_id, entrada.aforo]
      );
    }

    await client.query("COMMIT");

    // Fetch created event with entradas
    const entradasResult = await client.query(
      `SELECT
        ete.tipo_entrada_id,
        tt.nombre,
        ete.aforo
      FROM eventos_tipos_entrada ete
      INNER JOIN tipos_entrada tt ON tt.id = ete.tipo_entrada_id
      WHERE ete.evento_id = $1
      ORDER BY ete.tipo_entrada_id ASC`,
      [eventId]
    );

    const createdEvent = await client.query(`${EVENT_SELECT_QUERY} WHERE e.id = $1`, [eventId]);
    if (!createdEvent.rows[0]) {
      throw new Error("Failed to fetch created event");
    }

    const result = createdEvent.rows[0];
    result.entradas = entradasResult.rows;

    res.status(201).json(result);
  } catch (err: any) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackErr) {
      console.error("Error during ROLLBACK:", rollbackErr);
    }
    console.error("Error creating event:", err?.message || err);
    console.error("Full error:", err);
    res.status(500).json({ error: "Error al crear el evento", details: err?.message });
  } finally {
    client.release();
  }
});

router.put("/:id", authenticateToken, authorizeAdmin, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID de evento inválido" });
  }

  const { nombre, categoria_id, fecha, valor, descripcion, imagen_url, activo, entradas } = req.body as EventUpsertInput & { entradas?: any[] };

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

  const normalizedFecha = fecha ? String(fecha) : null;

  // Validate entradas array
  const entradasArray = Array.isArray(entradas) ? entradas : [];
  const validatedEntradas: Array<{ tipo_entrada_id: number; aforo: number }> = [];
  
  for (const entrada of entradasArray) {
    const tipoEntradaId = Number(entrada?.tipo_entrada_id);
    const aforo = Number(entrada?.aforo);
    
    if (!Number.isInteger(tipoEntradaId) || tipoEntradaId <= 0) {
      return res.status(400).json({ error: "Invalid tipo_entrada_id in entradas array" });
    }
    
    if (!Number.isInteger(aforo) || aforo < 0) {
      return res.status(400).json({ error: "Invalid aforo in entradas array" });
    }
    
    validatedEntradas.push({ tipo_entrada_id: tipoEntradaId, aforo });
  }

  if (validatedEntradas.length === 0) {
    return res.status(400).json({ error: "At least one entrada is required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Update event
    const updateResult = await client.query(
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
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Evento no encontrado" });
    }

    // Delete old entradas
    await client.query("DELETE FROM eventos_tipos_entrada WHERE evento_id = $1", [id]);

    // Insert new entradas
    for (const entrada of validatedEntradas) {
      await client.query(
        `INSERT INTO eventos_tipos_entrada (evento_id, tipo_entrada_id, aforo)
         VALUES ($1, $2, $3)`,
        [id, entrada.tipo_entrada_id, entrada.aforo]
      );
    }

    await client.query("COMMIT");

    // Fetch updated event with entradas
    const entradasResult = await client.query(
      `SELECT
        ete.tipo_entrada_id,
        tt.nombre,
        ete.aforo
      FROM eventos_tipos_entrada ete
      INNER JOIN tipos_entrada tt ON tt.id = ete.tipo_entrada_id
      WHERE ete.evento_id = $1
      ORDER BY ete.tipo_entrada_id ASC`,
      [id]
    );

    const updatedEvent = await client.query(`${EVENT_SELECT_QUERY} WHERE e.id = $1`, [id]);
    const result = updatedEvent.rows[0];
    result.entradas = entradasResult.rows;

    res.json(result);
  } catch (err: any) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackErr) {
      console.error("Error during ROLLBACK:", rollbackErr);
    }
    console.error("Error updating event:", err?.message || err);
    console.error("Full error:", err);
    res.status(500).json({ error: "Error al actualizar el evento", details: err?.message });
  } finally {
    client.release();
  }
});

router.patch("/:id", authenticateToken, authorizeAdmin, async (req: Request, res: Response) => {
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

router.delete("/:id", authenticateToken, authorizeAdmin, async (req: Request, res: Response) => {
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