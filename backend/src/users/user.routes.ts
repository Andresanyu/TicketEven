import { Router } from 'express';
import { pool } from '../config/database';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { authenticateToken, authorizeAdmin } from '../middlewares/auth';

const router = Router();

// Dependency injection: repository → service → controller
const userRepository = new UserRepository(pool);
const userService = new UserService(userRepository);
const userController = new UserController(userService);

// Admin
router.get('/', authenticateToken, authorizeAdmin, userController.getAll);

// Saved events (authenticated user)
router.get('/saved-events', authenticateToken, userController.getSavedEventsForCurrentUser);
router.get('/saved-events/:eventId/status', authenticateToken, userController.getSavedEventStatus);
router.delete('/saved-events/:eventId', authenticateToken, userController.deleteSavedEvent);

// Saved events (by user ID — admin or self)
router.get('/:id/saved-events', authenticateToken, userController.getSavedEventsByUserId);

// Auth
router.post('/register', userController.register);
router.post('/login', userController.login);

export default router;
