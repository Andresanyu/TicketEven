import { Pool } from "pg";
import { ITicketTypeRepository } from "./ticketType.repository.interface";
import { TicketTypeRow, CreateTicketTypeDTO } from "./ticketType.types";

export class TicketTypeRepository implements ITicketTypeRepository {
    constructor(private readonly pool: Pool) {}

    async findAll(): Promise<TicketTypeRow[]> {
        const result = await this.pool.query(
            "SELECT id, nombre FROM tipos_entrada ORDER BY nombre ASC"
        );
        return result.rows;
    }

    async create(dto: CreateTicketTypeDTO): Promise<TicketTypeRow> {
        const result = await this.pool.query(
            "INSERT INTO tipos_entrada (nombre) VALUES ($1) RETURNING id, nombre",
            [dto.nombre]
        );
        return result.rows[0];
    }
}