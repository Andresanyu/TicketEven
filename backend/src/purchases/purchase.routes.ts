import { Router } from 'express';
import { pool } from '../config/database';
import { authenticateToken } from '../middlewares/auth';
import { checkEventActive } from '../middlewares/checkEventActive';
import { PurchaseRepository } from './purchase.repository';
import { PurchaseService } from './purchase.service';
import { PurchaseController } from './purchase.controller';

const router = Router();

const purchaseRepository = new PurchaseRepository(pool);
const purchaseService = new PurchaseService(purchaseRepository);
const purchaseController = new PurchaseController(purchaseService);

router.post('/', authenticateToken, checkEventActive, purchaseController.create);
router.get('/', authenticateToken, purchaseController.getMyPurchases);
router.get('/:id', authenticateToken, purchaseController.getById);

export default router;
