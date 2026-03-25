import { ICategoryRepository } from "./category.repository.interface";
import { CategoryRow } from "./category.types";

export class CategoryService {
    constructor(private readonly categoryRepository: ICategoryRepository) {}

    async getAll(): Promise<CategoryRow[]> {
        return this.categoryRepository.findAll();
    }

    async create(nombre: string): Promise<CategoryRow> {
        return this.categoryRepository.create({ nombre });
    }

    async update(id: number, nombre: string): Promise<CategoryRow> {
        const updated = await this.categoryRepository.update(id, { nombre });

        if (!updated) {
            throw new NotFoundError("Categoría no encontrada");
        }

        return updated;
    }

    async delete(id: number): Promise<CategoryRow> {
        const deleted = await this.categoryRepository.delete(id);

        if (!deleted) {
            throw new NotFoundError("Categoría no encontrada");
        }

        return deleted;
    }
}

export class NotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "NotFoundError";
    }
}

export class ConflictError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ConflictError";
    }
}