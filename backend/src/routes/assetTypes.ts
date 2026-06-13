import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import {
  createAssetType,
  createAssetTypeComponent,
  deleteAssetType,
  deleteAssetTypeComponent,
  listActiveAssetTypes,
  listAllAssetTypesAdmin,
  updateAssetType,
  updateAssetTypeComponent,
} from '../services/assetTypes';

export const assetTypesRouter = Router();
assetTypesRouter.use(authenticate);

/** GET /asset-types — aktīvie tipi (formām) */
assetTypesRouter.get('/', async (req, res, next) => {
  try {
    const withComponents = req.query.include_components === '1';
    const data = await listActiveAssetTypes(withComponents);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

export const setupAssetTypesRouter = Router({ mergeParams: true });
setupAssetTypesRouter.use(authenticate, authorize('admin'));

setupAssetTypesRouter.get('/', async (_req, res, next) => {
  try {
    const data = await listAllAssetTypesAdmin();
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

setupAssetTypesRouter.post('/', async (req, res, next) => {
  try {
    const body = z
      .object({
        name: z.string().min(1).max(255),
        code: z.string().min(1).max(50).optional(),
        sort_order: z.number().int().optional(),
      })
      .parse(req.body);
    const data = await createAssetType(body);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

setupAssetTypesRouter.put('/:id', async (req, res, next) => {
  try {
    const body = z
      .object({
        name: z.string().min(1).max(255).optional(),
        sort_order: z.number().int().optional(),
        is_active: z.boolean().optional(),
      })
      .parse(req.body);
    const data = await updateAssetType(req.params.id, body);
    if (!data) throw new AppError(404, 'Tips nav atrasts', 'NOT_FOUND');
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

setupAssetTypesRouter.delete('/:id', async (req, res, next) => {
  try {
    await deleteAssetType(req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

setupAssetTypesRouter.post('/:typeId/components', async (req, res, next) => {
  try {
    const body = z
      .object({
        name: z.string().min(1).max(255),
        sort_order: z.number().int().optional(),
      })
      .parse(req.body);
    const data = await createAssetTypeComponent(req.params.typeId, body);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

setupAssetTypesRouter.put('/components/:componentId', async (req, res, next) => {
  try {
    const body = z
      .object({
        name: z.string().min(1).max(255).optional(),
        sort_order: z.number().int().optional(),
        is_active: z.boolean().optional(),
      })
      .parse(req.body);
    const data = await updateAssetTypeComponent(req.params.componentId, body);
    if (!data) throw new AppError(404, 'Apakšsadaļa nav atrasta', 'NOT_FOUND');
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

setupAssetTypesRouter.delete('/components/:componentId', async (req, res, next) => {
  try {
    await deleteAssetTypeComponent(req.params.componentId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
