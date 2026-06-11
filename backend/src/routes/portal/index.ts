import { Router } from 'express';
import { authenticatePortal } from '../../middleware/portalAuth';
import { portalAuthRouter } from './auth';
import { portalIncidentsRouter } from './incidents';
import { portalObjectsRouter } from './objects';
import { portalUnitsRouter } from './units';

export const portalRouter = Router();

portalRouter.use('/auth', portalAuthRouter);
portalRouter.use('/incidents', authenticatePortal, portalIncidentsRouter);
portalRouter.use('/objects', authenticatePortal, portalObjectsRouter);
portalRouter.use('/units', authenticatePortal, portalUnitsRouter);
