"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const mapMarkers_1 = require("../services/mapMarkers");
exports.mapRouter = (0, express_1.Router)();
exports.mapRouter.use(auth_1.authenticate);
/** GET /map/markers — aktīvi objekti ar koordinātām un atvērtiem atgadījumiem */
exports.mapRouter.get('/markers', async (_req, res, next) => {
    try {
        const data = await (0, mapMarkers_1.listMapMarkers)();
        res.json({ data });
    }
    catch (err) {
        next(err);
    }
});
/** PATCH /map/markers/:objectId/coordinates — saglabā ģeokodētās koordinātas */
exports.mapRouter.patch('/markers/:objectId/coordinates', (0, auth_1.authorize)('admin', 'manager', 'technician'), async (req, res, next) => {
    try {
        const body = zod_1.z
            .object({
            latitude: zod_1.z.number().min(-90).max(90),
            longitude: zod_1.z.number().min(-180).max(180),
        })
            .parse(req.body);
        await (0, mapMarkers_1.saveMapMarkerCoords)(req.params.objectId, body.latitude, body.longitude);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=map.js.map