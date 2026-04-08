import { Request, Response } from "express";
import { TicketService } from "./ticket.service";

export class TicketController {
  constructor(private readonly service: TicketService) {}

  getCapacityReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const eventId = parseInt(req.params.eventId);
      if (isNaN(eventId)) {
        res.status(400).json({ message: "ID de evento inválido" });
        return;
      }
      const report = await this.service.getCapacityReport(eventId);
      res.json(report);
    } catch (err: any) {
      res.status(err.status ?? 500).json({ message: err.message ?? "Error interno" });
    }
  };
}
