import { Router } from 'express';
import { Pool } from 'pg';
import { TicketRepository } from './ticket.repository';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller';
import { authenticateToken, authorizeAdmin } from '../middlewares/auth';

export function createTicketRouter(pool: Pool): Router {
  const router = Router();
  const repo = new TicketRepository(pool);
  const service = new TicketService(repo);
  const controller = new TicketController(service);

  router.get(
    '/capacity-report/:eventId',
    authenticateToken,
    authorizeAdmin,
    controller.getCapacityReport
  );

  return router;
}
