import { Pool, PoolClient } from "pg";
import { IEventRepository } from "./event.repository.interface";
import {
    EventRow,
    EventTicketTypeInput,
    CreateEventDTO,
    UpdateEventDTO,
    PopularityReport,
} from "./event.types";

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
        COALESCE((
            SELECT json_agg(
                json_build_object(
                    'tipo_entrada_id', ett.tipo_entrada_id,
                    'nombre',          te.nombre,
                    'aforo',           ett.aforo
                )
                ORDER BY te.nombre ASC
            )
            FROM eventos_tipos_entrada ett
            JOIN tipos_entrada te ON te.id = ett.tipo_entrada_id
            WHERE ett.evento_id = e.id
        ), '[]'::json) AS entradas
    FROM eventos e
    LEFT JOIN categorias c ON c.id = e.categoria_id
`;

const ENTRADAS_SELECT_QUERY = `
    SELECT
        ete.tipo_entrada_id,
        tt.nombre,
        ete.aforo
    FROM eventos_tipos_entrada ete
    INNER JOIN tipos_entrada tt ON tt.id = ete.tipo_entrada_id
    WHERE ete.evento_id = $1
    ORDER BY ete.tipo_entrada_id ASC
`;

async function insertEntradas(
    client: PoolClient,
    eventId: number,
    entradas: EventTicketTypeInput[]
): Promise<void> {
    for (const entrada of entradas) {
        await client.query(
            `INSERT INTO eventos_tipos_entrada (evento_id, tipo_entrada_id, aforo)
             VALUES ($1, $2, $3)`,
            [eventId, entrada.tipo_entrada_id, entrada.aforo]
        );
    }
}

async function replaceEntradas(
    client: PoolClient,
    eventId: number,
    entradas: EventTicketTypeInput[]
): Promise<void> {
    await client.query(
        "DELETE FROM eventos_tipos_entrada WHERE evento_id = $1",
        [eventId]
    );
    await insertEntradas(client, eventId, entradas);
}

async function fetchEventWithEntradas(
    client: PoolClient,
    eventId: number
): Promise<EventRow> {
    const [eventResult, entradasResult] = await Promise.all([
        client.query(`${EVENT_SELECT_QUERY} WHERE e.id = $1`, [eventId]),
        client.query(ENTRADAS_SELECT_QUERY, [eventId]),
    ]);

    const event = eventResult.rows[0];
    event.entradas = entradasResult.rows;
    return event;
}

export class EventRepository implements IEventRepository {
    constructor(private readonly pool: Pool) {}

    async findAll(): Promise<EventRow[]> {
        const result = await this.pool.query(
            `${EVENT_SELECT_QUERY} ORDER BY e.id DESC`
        );
        return result.rows;
    }

    async findById(id: number): Promise<EventRow | null> {
        const client = await this.pool.connect();
        try {
            return await fetchEventWithEntradas(client, id);
        } catch {
            return null;
        } finally {
            client.release();
        }
    }

    async create(dto: CreateEventDTO): Promise<EventRow> {
        const client = await this.pool.connect();
        try {
            await client.query("BEGIN");

            const insertResult = await client.query(
                `INSERT INTO eventos (nombre, categoria_id, fecha, valor, descripcion, imagen_url, activo)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING id`,
                [
                    dto.nombre,
                    dto.categoria_id,
                    dto.fecha,
                    dto.valor,
                    dto.descripcion,
                    dto.imagen_url,
                    dto.activo,
                ]
            );

            const eventId = insertResult.rows[0].id;
            await insertEntradas(client, eventId, dto.entradas);

            const event = await fetchEventWithEntradas(client, eventId);
            await client.query("COMMIT");
            return event;
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    }

    async update(id: number, dto: UpdateEventDTO): Promise<EventRow | null> {
        const client = await this.pool.connect();
        try {
            await client.query("BEGIN");

            const updateResult = await client.query(
                `UPDATE eventos
                 SET nombre       = $1,
                     categoria_id = $2,
                     fecha        = $3,
                     valor        = $4,
                     descripcion  = $5,
                     imagen_url   = $6,
                     activo       = $7
                 WHERE id = $8
                 RETURNING id`,
                [
                    dto.nombre,
                    dto.categoria_id,
                    dto.fecha,
                    dto.valor,
                    dto.descripcion,
                    dto.imagen_url,
                    dto.activo,
                    id,
                ]
            );

            if (updateResult.rowCount === 0) {
                await client.query("ROLLBACK");
                return null;
            }

            await replaceEntradas(client, id, dto.entradas);

            const event = await fetchEventWithEntradas(client, id);
            await client.query("COMMIT");
            return event;
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    }

    async patchActivo(id: number, activo: boolean): Promise<EventRow | null> {
        const result = await this.pool.query(
            `UPDATE eventos SET activo = $1 WHERE id = $2 RETURNING id`,
            [activo, id]
        );

        if (result.rowCount === 0) return null;

        const eventResult = await this.pool.query(
            `${EVENT_SELECT_QUERY} WHERE e.id = $1`,
            [id]
        );
        return eventResult.rows[0] ?? null;
    }

    async delete(id: number): Promise<boolean> {
        const result = await this.pool.query(
            "DELETE FROM eventos WHERE id = $1",
            [id]
        );
        return (result.rowCount ?? 0) > 0;
    }

    async toggleSaved(
        userId: number,
        eventId: number
    ): Promise<{ isSaved: boolean }> {
        const eventCheck = await this.pool.query(
            "SELECT id FROM eventos WHERE id = $1",
            [eventId]
        );

        if (!eventCheck.rowCount) {
            throw new EventNotFoundError("Evento no encontrado");
        }

        const deleteResult = await this.pool.query(
            `DELETE FROM saved_events
             WHERE user_id = $1 AND event_id = $2
             RETURNING event_id`,
            [userId, eventId]
        );

        if (deleteResult.rowCount) {
            return { isSaved: false };
        }

        await this.pool.query(
            `INSERT INTO saved_events (user_id, event_id)
             VALUES ($1, $2)
             ON CONFLICT (user_id, event_id) DO NOTHING`,
            [userId, eventId]
        );

        return { isSaved: true };
    }

    async getPopularityReport(): Promise<PopularityReport> {
        const [eventsResult, statsResult] = await Promise.all([
            this.pool.query(`
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
            this.pool.query(`
                SELECT
                    COUNT(DISTINCT user_id)::INTEGER AS total_users,
                    COUNT(*)::INTEGER                AS total_saves
                FROM saved_events
            `),
        ]);

        return {
            events:      eventsResult.rows,
            total_saves: Number(statsResult.rows[0]?.total_saves ?? 0),
            total_users: Number(statsResult.rows[0]?.total_users ?? 0),
        };
    }
}

// Domain errors specific to this repository
export class EventNotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "EventNotFoundError";
    }
}