import { CategoryRow, CreateCategoryDTO, UpdateCategoryDTO } from "./category.types";

export interface ICategoryRepository {
    findAll(): Promise<CategoryRow[]>;
    findById(id: number): Promise<CategoryRow | null>;
    create(dto: CreateCategoryDTO): Promise<CategoryRow>;
    update(id: number, dto: UpdateCategoryDTO): Promise<CategoryRow | null>;
    delete(id: number): Promise<CategoryRow | null>;
}