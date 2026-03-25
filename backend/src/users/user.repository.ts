import { Pool } from "pg";
import { IUserRepository } from "./User.repository.interface";
import { UserRow, SavedEventRow, CreateUserDTO } from "./user.types";

const USERS_SELECT = `
    SELECT
        u.id,
        u.nombre,
        u.email,
        u.rol,
        u.activo,
        u.fecha_registro
    FROM usuarios u
`;

const SAVED_EVENTS_SELECT = `
    SELECT
        se.saved_at,
        u.id       AS usuario_id,
        u.nombre   AS usuario_nombre,
        u.email    AS usuario_email,
        e.id       AS evento_id,
        e.nombre   AS evento_nombre,
        e.fecha    AS evento_fecha,
        e.valor    AS evento_valor
    FROM saved_events se
    JOIN usuarios u ON u.id = se.user_id
    JOIN eventos  e ON e.id = se.event_id
`;

export class UserRepository implements IUserRepository {
    constructor(private readonly pool: Pool) {}

    async findAll(): Promise<UserRow[]> {
        const result = await this.pool.query(`${USERS_SELECT} ORDER BY u.id DESC`);
        return result.rows;
    }

    async findById(id: number): Promise<UserRow | null> {
        const result = await this.pool.query(
            `${USERS_SELECT} WHERE u.id = $1`,
            [id]
        );
        return result.rows[0] ?? null;
    }

    async findByEmail(email: string): Promise<UserRow | null> {
        const result = await this.pool.query(
            `SELECT id, nombre, email, password_hash, rol, activo
             FROM usuarios
             WHERE email = $1`,
            [email]
        );
        return result.rows[0] ?? null;
    }

    async create(dto: CreateUserDTO): Promise<UserRow> {
        const result = await this.pool.query(
            `INSERT INTO usuarios (nombre, email, password_hash, rol)
             VALUES ($1, $2, $3, 'externo')
             RETURNING id, nombre, email, rol, activo, fecha_registro`,
            [dto.nombre, dto.email, dto.password_hash]
        );
        return result.rows[0];
    }

    async findSavedEventsByUserId(userId: number): Promise<SavedEventRow[]> {
        const result = await this.pool.query(
            `${SAVED_EVENTS_SELECT}
             WHERE u.id = $1
             ORDER BY se.saved_at DESC`,
            [userId]
        );
        return result.rows;
    }

    async findSavedEvent(userId: number, eventId: number): Promise<{ event_id: number } | null> {
        const result = await this.pool.query(
            `SELECT event_id
             FROM saved_events
             WHERE user_id = $1 AND event_id = $2
             LIMIT 1`,
            [userId, eventId]
        );
        return result.rows[0] ?? null;
    }

    async deleteSavedEvent(userId: number, eventId: number): Promise<boolean> {
        const result = await this.pool.query(
            `DELETE FROM saved_events
             WHERE user_id = $1 AND event_id = $2
             RETURNING event_id`,
            [userId, eventId]
        );
        return (result.rowCount ?? 0) > 0;
    }
}