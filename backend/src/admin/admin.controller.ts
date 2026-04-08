import { Request, Response } from "express";
import { AdminService } from "./admin.service";

export class AdminController {
    constructor(private readonly adminService: AdminService) {}

    getGlobalMetrics = async (_req: Request, res: Response): Promise<void> => {
        try {
            const metrics = await this.adminService.getGlobalMetrics();
            res.json(metrics);
        } catch (err) {
            console.error("Error fetching admin global metrics:", err);
            res.status(500).json({ error: "Error al obtener métricas globales" });
        }
    };
}
