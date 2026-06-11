"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.portalRouter = void 0;
const express_1 = require("express");
const portalAuth_1 = require("../../middleware/portalAuth");
const auth_1 = require("./auth");
const incidents_1 = require("./incidents");
const objects_1 = require("./objects");
exports.portalRouter = (0, express_1.Router)();
exports.portalRouter.use('/auth', auth_1.portalAuthRouter);
exports.portalRouter.use('/incidents', portalAuth_1.authenticatePortal, incidents_1.portalIncidentsRouter);
exports.portalRouter.use('/objects', portalAuth_1.authenticatePortal, objects_1.portalObjectsRouter);
//# sourceMappingURL=index.js.map