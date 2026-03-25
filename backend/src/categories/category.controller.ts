import { Request, Response } from "express";
import { CategoryService, NotFoundError, ConflictError } from "./category.service";

const PG_UNIQUE_VIOLATION = "23505";

export class CategoryController {
    constructor(private readonly categoryService: CategoryService) {}

    getAll = async (_req: Request, res: Response): Promise<void> => {
        try {
            const categories = await this.categoryService.getAll();
            res.json(categories);
        } catch (err) {
            console.error("Error fetching categories:", err);
            res.status(500).json({ error: "Error al obtener las categorías" });
        }
    };

    create = async (req: Request, res: Response): Promise<void> => {
        const nombre = String(req.body?.nombre ?? "").trim();

        if (!nombre) {
            res.status(400).json({ error: "El campo nombre es requerido" });
            return;
        }

        if (nombre.length > 100) {
            res.status(400).json({ error: "El nombre no puede superar 100 caracteres" });
            return;
        }

        try {
            const category = await this.categoryService.create(nombre);
            res.status(201).json(category);
        } catch (err: any) {
            if (err?.code === PG_UNIQUE_VIOLATION || err instanceof ConflictError) {
                res.status(409).json({ error: "Ya existe una categoría con ese nombre" });
                return;
            }
            console.error("Error creating category:", err);
            res.status(500).json({ error: "Error al crear la categoría" });
        }
    };

    update = async (req: Request, res: Response): Promise<void> => {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            res.status(400).json({ error: "ID de categoría inválido" });
            return;
        }

        const nombre = String(req.body?.nombre ?? "").trim();

        if (!nombre) {
            res.status(400).json({ error: "El campo nombre es requerido" });
            return;
        }

        if (nombre.length > 100) {
            res.status(400).json({ error: "El nombre no puede superar 100 caracteres" });
            return;
        }

        try {
            const category = await this.categoryService.update(id, nombre);
            res.json(category);
        } catch (err: any) {
            if (err instanceof NotFoundError) {
                res.status(404).json({ error: err.message });
                return;
            }
            if (err?.code === PG_UNIQUE_VIOLATION || err instanceof ConflictError) {
                res.status(409).json({ error: "Ya existe una categoría con ese nombre" });
                return;
            }
            console.error("Error updating category:", err);
            res.status(500).json({ error: "Error al actualizar la categoría" });
        }
    };

    delete = async (req: Request, res: Response): Promise<void> => {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            res.status(400).json({ error: "ID de categoría inválido" });
            return;
        }

        try {
            const categoria = await this.categoryService.delete(id);
            res.json({ message: "Categoría eliminada correctamente", categoria });
        } catch (err) {
            if (err instanceof NotFoundError) {
                res.status(404).json({ error: err.message });
                return;
            }
            console.error("Error deleting category:", err);
            res.status(500).json({ error: "Error al eliminar la categoría" });
        }
    };
}