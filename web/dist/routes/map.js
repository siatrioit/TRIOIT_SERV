"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapRouter = void 0;
const express_1 = require("express");
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
//# sourceMappingURL=map.js.map