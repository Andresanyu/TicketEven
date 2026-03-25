import { Router } from "express";
import { pool } from "../config/database";
import { CategoryRepository } from "./category.repository";
import { CategoryService } from "./category.service";
import { CategoryController } from "./category.controller";

const router = Router();

const categoryRepository = new CategoryRepository(pool);
const categoryService    = new CategoryService(categoryRepository);
const categoryController = new CategoryController(categoryService);

router.get("/",      categoryController.getAll);
router.post("/",     categoryController.create);
router.put("/:id",   categoryController.update);
router.delete("/:id", categoryController.delete);

export default router;