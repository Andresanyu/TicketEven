import { Pool } from 'pg';
import { ICategoryRepository } from './category.repository.interface';
import { CategoryRow, CreateCategoryDTO, UpdateCategoryDTO } from './category.types';

export class CategoryRepository implements ICategoryRepository {
  constructor(private readonly pool: Pool) {}

  async findAll(): Promise<CategoryRow[]> {
    const result = await this.pool.query('SELECT id, nombre FROM categorias ORDER BY nombre ASC');
    return result.rows;
  }

  async findById(id: number): Promise<CategoryRow | null> {
    const result = await this.pool.query('SELECT id, nombre FROM categorias WHERE id = $1', [id]);
    return result.rows[0] ?? null;
  }

  async create(dto: CreateCategoryDTO): Promise<CategoryRow> {
    const result = await this.pool.query(
      'INSERT INTO categorias (nombre) VALUES ($1) RETURNING id, nombre',
      [dto.nombre]
    );
    return result.rows[0];
  }

  async update(id: number, dto: UpdateCategoryDTO): Promise<CategoryRow | null> {
    const result = await this.pool.query(
      'UPDATE categorias SET nombre = $1 WHERE id = $2 RETURNING id, nombre',
      [dto.nombre, id]
    );
    return result.rows[0] ?? null;
  }

  async delete(id: number): Promise<CategoryRow | null> {
    const result = await this.pool.query(
      'DELETE FROM categorias WHERE id = $1 RETURNING id, nombre',
      [id]
    );
    return result.rows[0] ?? null;
  }
}
