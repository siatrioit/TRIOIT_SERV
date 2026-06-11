"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.portalUnitsRouter = void 0;
const express_1 = require("express");
const units_1 = require("../../services/units");
exports.portalUnitsRouter = (0, express_1.Router)();
exports.portalUnitsRouter.get('/', async (req, res, next) => {
    try {
        const objectId = req.query.object_id;
        if (!objectId) {
            res.status(400).json({ error: 'object_id required' });
            return;
        }
        const { access } = req.portalUser;
        const clientWideIds = access.filter((g) => g.scope === 'client').map((g) => g.client_id);
        const objectScopedIds = access
            .filter((g) => g.scope === 'object' && g.object_id)
            .map((g) => g.object_id);
        const units = await (0, units_1.listPortalUnitsForObject)(objectId, clientWideIds, objectScopedIds);
        res.json({ data: units });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=units.js.map