"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const errorHandler_1 = require("./middleware/errorHandler");
const auth_1 = require("./routes/auth");
const clients_1 = require("./routes/clients");
const clientObjects_1 = require("./routes/clientObjects");
const contracts_1 = require("./routes/contracts");
const units_1 = require("./routes/units");
const incidents_1 = require("./routes/incidents");
const incidentMessages_1 = require("./routes/incidentMessages");
const services_1 = require("./routes/services");
const invoices_1 = require("./routes/invoices");
const ai_1 = require("./routes/ai");
const users_1 = require("./routes/users");
const portalAccess_1 = require("./routes/portalAccess");
const portal_1 = require("./routes/portal");
const migrate_1 = require("./db/migrate");
const version_1 = require("./version");
dotenv_1.default.config();
const migrationsReady = process.env.AUTO_MIGRATE === 'true'
    ? (0, migrate_1.runMigrations)().catch((err) => {
        console.error('[migrate] Startup migration failed:', err);
        throw err;
    })
    : Promise.resolve();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
const API_PREFIX = process.env.API_PREFIX || '/api/v1';
app.use(async (_req, _res, next) => {
    try {
        await migrationsReady;
        next();
    }
    catch (err) {
        next(err);
    }
});
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Rate limiting
app.use((0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { error: 'Too many requests' },
}));
// Health check (cPanel monitoring)
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        version: version_1.APP_VERSION,
        timestamp: new Date().toISOString(),
    });
});
// API routes
app.use(`${API_PREFIX}/auth`, auth_1.authRouter);
app.use(`${API_PREFIX}/portal`, portal_1.portalRouter);
app.use(`${API_PREFIX}/users`, users_1.usersRouter);
app.use(`${API_PREFIX}/portal-access`, portalAccess_1.portalAccessRouter);
app.use(`${API_PREFIX}/clients/:clientId/objects/:objectId/portal-access`, portalAccess_1.objectPortalAccessRouter);
app.use(`${API_PREFIX}/clients/:clientId/portal-access`, portalAccess_1.clientPortalAccessRouter);
app.use(`${API_PREFIX}/clients/:clientId/objects`, clientObjects_1.clientObjectsRouter);
app.use(`${API_PREFIX}/clients`, clients_1.clientsRouter);
app.use(`${API_PREFIX}/contracts`, contracts_1.contractsRouter);
app.use(`${API_PREFIX}/units`, units_1.unitsRouter);
app.use(`${API_PREFIX}/incidents/:incidentId/messages`, incidentMessages_1.incidentMessagesRouter);
app.use(`${API_PREFIX}/incidents`, incidents_1.incidentsRouter);
app.use(`${API_PREFIX}/services`, services_1.servicesRouter);
app.use(`${API_PREFIX}/invoices`, invoices_1.invoicesRouter);
app.use(`${API_PREFIX}/ai`, ai_1.aiRouter);
// cPanel: statiskais frontend no public/ mapes (viena Node.js aplikācija uz serv.trioit.lv)
const staticDir = process.env.STATIC_DIR;
if (staticDir) {
    const resolved = path_1.default.resolve(staticDir);
    app.use(express_1.default.static(resolved));
    // SPA maršrutēšana — visi ne-API GET pieprasījumi → index.html
    app.get('*', (req, res, next) => {
        if (req.path.startsWith(API_PREFIX) || req.path === '/health') {
            return next();
        }
        res.sendFile(path_1.default.join(resolved, 'index.html'), (err) => {
            if (err)
                next(err);
        });
    });
}
app.use(errorHandler_1.errorHandler);
// cPanel Passenger: TIKAI module.exports — NEDRĪKST app.listen()!
module.exports = app;
// Lokālai izstrādei: LOCAL_DEV=true npm run start
if (process.env.LOCAL_DEV === 'true') {
    app.listen(PORT, () => {
        console.log(`TRIO-SERV running on port ${PORT}`);
        if (staticDir)
            console.log(`Serving static files from ${staticDir}`);
    });
}
exports.default = app;
//# sourceMappingURL=index.js.map