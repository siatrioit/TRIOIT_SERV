import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './routes/auth';
import { clientsRouter } from './routes/clients';
import { clientObjectsRouter } from './routes/clientObjects';
import { contractsRouter } from './routes/contracts';
import { unitsRouter } from './routes/units';
import { incidentsRouter } from './routes/incidents';
import { incidentMessagesRouter } from './routes/incidentMessages';
import { servicesRouter } from './routes/services';
import { invoicesRouter } from './routes/invoices';
import { aiRouter } from './routes/ai';
import { usersRouter } from './routes/users';
import {
  clientPortalAccessRouter,
  objectPortalAccessRouter,
  portalAccessRouter,
} from './routes/portalAccess';
import { portalRouter } from './routes/portal';
import { runMigrations } from './db/migrate';
import { APP_VERSION } from './version';

dotenv.config();

const migrationsReady =
  process.env.AUTO_MIGRATE === 'true'
    ? runMigrations().catch((err) => {
        console.error('[migrate] Startup migration failed:', err);
        throw err;
      })
    : Promise.resolve();

const app = express();
const PORT = process.env.PORT || 3001;
const API_PREFIX = process.env.API_PREFIX || '/api/v1';

app.use(async (_req, _res, next) => {
  try {
    await migrationsReady;
    next();
  } catch (err) {
    next(err);
  }
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests' },
}));

// Health check (cPanel monitoring)
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use(`${API_PREFIX}/auth`, authRouter);
app.use(`${API_PREFIX}/portal`, portalRouter);
app.use(`${API_PREFIX}/users`, usersRouter);
app.use(`${API_PREFIX}/portal-access`, portalAccessRouter);
app.use(`${API_PREFIX}/clients/:clientId/objects/:objectId/portal-access`, objectPortalAccessRouter);
app.use(`${API_PREFIX}/clients/:clientId/portal-access`, clientPortalAccessRouter);
app.use(`${API_PREFIX}/clients/:clientId/objects`, clientObjectsRouter);
app.use(`${API_PREFIX}/clients`, clientsRouter);
app.use(`${API_PREFIX}/contracts`, contractsRouter);
app.use(`${API_PREFIX}/units`, unitsRouter);
app.use(`${API_PREFIX}/incidents/:incidentId/messages`, incidentMessagesRouter);
app.use(`${API_PREFIX}/incidents`, incidentsRouter);
app.use(`${API_PREFIX}/services`, servicesRouter);
app.use(`${API_PREFIX}/invoices`, invoicesRouter);
app.use(`${API_PREFIX}/ai`, aiRouter);

// cPanel: statiskais frontend no public/ mapes (viena Node.js aplikācija uz serv.trioit.lv)
const staticDir = process.env.STATIC_DIR;
if (staticDir) {
  const resolved = path.resolve(staticDir);
  app.use(express.static(resolved));
  // SPA maršrutēšana — visi ne-API GET pieprasījumi → index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith(API_PREFIX) || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(resolved, 'index.html'), (err) => {
      if (err) next(err);
    });
  });
}

app.use(errorHandler);

// cPanel Passenger: TIKAI module.exports — NEDRĪKST app.listen()!
module.exports = app;

// Lokālai izstrādei: LOCAL_DEV=true npm run start
if (process.env.LOCAL_DEV === 'true') {
  app.listen(PORT, () => {
    console.log(`TRIO-SERV running on port ${PORT}`);
    if (staticDir) console.log(`Serving static files from ${staticDir}`);
  });
}

export default app;
