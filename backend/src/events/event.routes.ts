import { Router } from 'express';
import { pool } from '../config/database';
import { authenticateToken, authorizeAdmin } from '../middlewares/auth';
import { checkEventActive } from '../middlewares/checkEventActive';
import { EventRepository } from './event.repository';
import { EventService } from './event.service';
import { EventController } from './event.controller';

const router = Router();

const eventRepository = new EventRepository(pool);
const eventService = new EventService(eventRepository);
const eventController = new EventController(eventService);

// Public
router.get('/', eventController.getAll);
router.get('/:id', eventController.getById);

// Admin reports
router.get(
  '/reports/popularity',
  authenticateToken,
  authorizeAdmin,
  eventController.getPopularityReport
);

// Authenticated
router.post('/:id/save', authenticateToken, eventController.toggleSaved);

// Admin CRUD
router.post('/', authenticateToken, authorizeAdmin, eventController.create);
router.put('/:id', authenticateToken, authorizeAdmin, eventController.update);
router.patch('/:id', authenticateToken, authorizeAdmin, eventController.patchActivo);
router.delete('/:id', authenticateToken, authorizeAdmin, eventController.delete);

export default router;
