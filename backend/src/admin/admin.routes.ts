import { Router } from 'express';
import { pool } from '../config/database';
import {
  authenticateToken as verifyToken,
  authorizeAdmin as verifyAdmin,
} from '../middlewares/auth';
import { AdminRepository } from './admin.repository';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

const router = Router();

const adminRepository = new AdminRepository(pool);
const adminService = new AdminService(adminRepository);
const adminController = new AdminController(adminService);

router.get('/metrics', verifyToken, verifyAdmin, adminController.getGlobalMetrics);

export default router;
