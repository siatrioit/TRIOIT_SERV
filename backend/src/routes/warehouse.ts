import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  createWarehouseItem,
  listMovements,
  listWarehouseItems,
  stockIn,
  updateWarehouseItem,
} from '../services/warehouse';
import { warehouseItemInputSchema, warehouseStockInSchema } from '../schemas/warehouse';

export const warehouseRouter = Router();
warehouseRouter.use(authenticate);

warehouseRouter.get('/', async (req, res, next) => {
  try {
    const search = req.query.search as string | undefined;
    const items = await listWarehouseItems(search);
    res.json({ data: items });
  } catch (err) {
    next(err);
  }
});

warehouseRouter.post(
  '/',
  authorize('admin', 'manager', 'technician'),
  async (req, res, next) => {
    try {
      const body = warehouseItemInputSchema.parse(req.body);
      const item = await createWarehouseItem(body, req.user?.userId);
      res.status(201).json({ data: item });
    } catch (err) {
      next(err);
    }
  }
);

warehouseRouter.put(
  '/:id',
  authorize('admin', 'manager', 'technician'),
  async (req, res, next) => {
    try {
      const body = warehouseItemInputSchema.partial().parse(req.body);
      const item = await updateWarehouseItem(req.params.id, body);
      res.json({ data: item });
    } catch (err) {
      next(err);
    }
  }
);

warehouseRouter.post(
  '/:id/stock-in',
  authorize('admin', 'manager', 'technician'),
  async (req, res, next) => {
    try {
      const body = warehouseStockInSchema.parse(req.body);
      const item = await stockIn(req.params.id, body, req.user?.userId);
      res.json({ data: item });
    } catch (err) {
      next(err);
    }
  }
);

warehouseRouter.get('/:id/movements', async (req, res, next) => {
  try {
    const movements = await listMovements(req.params.id);
    res.json({ data: movements });
  } catch (err) {
    next(err);
  }
});
