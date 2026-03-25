import { Router } from "express";
import { pool } from "../config/database";
import { authenticateToken, authorizeAdmin } from "../middlewares/auth";
import { TicketTypeRepository } from "./ticketType.repository";
import { TicketTypeService } from "./ticketType.service";
import { TicketTypeController } from "./ticketType.controller";

const router = Router();

const ticketTypeRepository = new TicketTypeRepository(pool);
const ticketTypeService    = new TicketTypeService(ticketTypeRepository);
const ticketTypeController = new TicketTypeController(ticketTypeService);

router.get("/",    ticketTypeController.getAll);
router.post("/", authenticateToken, authorizeAdmin, ticketTypeController.create);

export default router;