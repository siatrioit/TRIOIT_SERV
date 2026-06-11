"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.portalObjectsRouter = void 0;
const express_1 = require("express");
const portalScope_1 = require("../../services/portalScope");
exports.portalObjectsRouter = (0, express_1.Router)();
exports.portalObjectsRouter.get('/', async (req, res, next) => {
    try {
        const objects = await (0, portalScope_1.listAccessibleObjects)(req.portalUser.access);
        res.json({ data: objects });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=objects.js.map