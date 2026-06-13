import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  createIssue,
  createProduct,
  createProductGroup,
  createReceipt,
  deleteProduct,
  deleteProductGroup,
  getIssue,
  getReceipt,
  listIssues,
  listProductGroups,
  listProducts,
  listProductMovements,
  listReceipts,
  postIssue,
  postReceipt,
  updateProduct,
  updateProductGroup,
} from '../services/warehouseCommercial';
import {
  issueInputSchema,
  productGroupInputSchema,
  productInputSchema,
  receiptInputSchema,
} from '../schemas/warehouseCommercial';

export const warehouseCommercialRouter = Router();
warehouseCommercialRouter.use(authenticate);

const canEdit = authorize('admin', 'manager', 'technician');

warehouseCommercialRouter.get('/groups', async (_req, res, next) => {
  try {
    res.json({ data: await listProductGroups() });
  } catch (err) {
    next(err);
  }
});

warehouseCommercialRouter.post('/groups', canEdit, async (req, res, next) => {
  try {
    const body = productGroupInputSchema.parse(req.body);
    res.status(201).json({ data: await createProductGroup(body) });
  } catch (err) {
    next(err);
  }
});

warehouseCommercialRouter.put('/groups/:id', canEdit, async (req, res, next) => {
  try {
    const body = productGroupInputSchema.partial().parse(req.body);
    res.json({ data: await updateProductGroup(req.params.id, body) });
  } catch (err) {
    next(err);
  }
});

warehouseCommercialRouter.delete('/groups/:id', canEdit, async (req, res, next) => {
  try {
    await deleteProductGroup(req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

warehouseCommercialRouter.get('/products', async (req, res, next) => {
  try {
    const search = req.query.search as string | undefined;
    const groupId = req.query.group_id as string | undefined;
    res.json({ data: await listProducts(search, groupId) });
  } catch (err) {
    next(err);
  }
});

warehouseCommercialRouter.post('/products', canEdit, async (req, res, next) => {
  try {
    const body = productInputSchema.parse(req.body);
    res.status(201).json({ data: await createProduct(body, req.user?.userId) });
  } catch (err) {
    next(err);
  }
});

warehouseCommercialRouter.put('/products/:id', canEdit, async (req, res, next) => {
  try {
    const body = productInputSchema.partial().parse(req.body);
    res.json({ data: await updateProduct(req.params.id, body) });
  } catch (err) {
    next(err);
  }
});

warehouseCommercialRouter.delete('/products/:id', canEdit, async (req, res, next) => {
  try {
    await deleteProduct(req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

warehouseCommercialRouter.get('/journal/movements', async (req, res, next) => {
  try {
    const productId = req.query.product_id as string | undefined;
    const limitRaw = req.query.limit as string | undefined;
    const limit = limitRaw ? Number(limitRaw) : undefined;
    res.json({
      data: await listProductMovements({
        productId,
        limit: Number.isFinite(limit) ? limit : undefined,
      }),
    });
  } catch (err) {
    next(err);
  }
});

warehouseCommercialRouter.get('/receipts', async (_req, res, next) => {
  try {
    res.json({ data: await listReceipts() });
  } catch (err) {
    next(err);
  }
});

warehouseCommercialRouter.get('/receipts/:id', async (req, res, next) => {
  try {
    const receipt = await getReceipt(req.params.id);
    if (!receipt) {
      res.status(404).json({ error: 'Pavadzīme nav atrasta', code: 'NOT_FOUND' });
      return;
    }
    res.json({ data: receipt });
  } catch (err) {
    next(err);
  }
});

warehouseCommercialRouter.post('/receipts', canEdit, async (req, res, next) => {
  try {
    const body = receiptInputSchema.parse(req.body);
    res.status(201).json({ data: await createReceipt(body, req.user?.userId) });
  } catch (err) {
    next(err);
  }
});

warehouseCommercialRouter.post('/receipts/:id/post', canEdit, async (req, res, next) => {
  try {
    res.json({ data: await postReceipt(req.params.id, req.user?.userId) });
  } catch (err) {
    next(err);
  }
});

warehouseCommercialRouter.get('/issues', async (_req, res, next) => {
  try {
    res.json({ data: await listIssues() });
  } catch (err) {
    next(err);
  }
});

warehouseCommercialRouter.get('/issues/:id', async (req, res, next) => {
  try {
    const issue = await getIssue(req.params.id);
    if (!issue) {
      res.status(404).json({ error: 'Pavadzīme nav atrasta', code: 'NOT_FOUND' });
      return;
    }
    res.json({ data: issue });
  } catch (err) {
    next(err);
  }
});

warehouseCommercialRouter.post('/issues', canEdit, async (req, res, next) => {
  try {
    const body = issueInputSchema.parse(req.body);
    res.status(201).json({ data: await createIssue(body, req.user?.userId) });
  } catch (err) {
    next(err);
  }
});

warehouseCommercialRouter.post('/issues/:id/post', canEdit, async (req, res, next) => {
  try {
    res.json({ data: await postIssue(req.params.id, req.user?.userId) });
  } catch (err) {
    next(err);
  }
});
