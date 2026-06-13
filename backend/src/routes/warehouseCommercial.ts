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

  payReceipt,

  postIssue,

  postReceipt,

  unpostReceipt,

  updateProduct,

  updateProductGroup,

  updateReceipt,

  updateReceiptLines,

} from '../services/warehouseCommercial';

import {

  issueInputSchema,

  productGroupInputSchema,

  productInputSchema,

  receiptHeaderInputSchema,

  receiptLinesInputSchema,

  receiptPaymentInputSchema,

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

    const exactGroup = req.query.exact === '1' || req.query.exact === 'true';

    res.json({ data: await listProducts(search, groupId, exactGroup) });

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



warehouseCommercialRouter.get('/receipts', async (req, res, next) => {

  try {

    const supplierId = req.query.supplier_id as string | undefined;

    const unpaidOnly = req.query.unpaid_only === '1' || req.query.unpaid_only === 'true';

    const sortBy = req.query.sort_by === 'supplier' ? 'supplier' : 'date';

    const sortDir = req.query.sort_dir === 'asc' ? 'asc' : 'desc';

    res.json({

      data: await listReceipts({ supplierId, unpaidOnly, sortBy, sortDir }),

    });

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

    const body = receiptHeaderInputSchema.parse(req.body);

    res.status(201).json({ data: await createReceipt(body, req.user?.userId) });

  } catch (err) {

    next(err);

  }

});



warehouseCommercialRouter.put('/receipts/:id', canEdit, async (req, res, next) => {

  try {

    const body = receiptHeaderInputSchema.partial().parse(req.body);

    res.json({ data: await updateReceipt(req.params.id, body) });

  } catch (err) {

    next(err);

  }

});



warehouseCommercialRouter.put('/receipts/:id/lines', canEdit, async (req, res, next) => {

  try {

    const body = receiptLinesInputSchema.parse(req.body);

    res.json({ data: await updateReceiptLines(req.params.id, body.lines) });

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



warehouseCommercialRouter.post('/receipts/:id/unpost', canEdit, async (req, res, next) => {

  try {

    res.json({ data: await unpostReceipt(req.params.id, req.user?.userId) });

  } catch (err) {

    next(err);

  }

});



warehouseCommercialRouter.post('/receipts/:id/pay', canEdit, async (req, res, next) => {

  try {

    const body = receiptPaymentInputSchema.parse(req.body);

    res.json({ data: await payReceipt(req.params.id, body.amount) });

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


