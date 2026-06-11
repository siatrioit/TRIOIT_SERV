"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.servicesRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const uuid_1 = require("uuid");
const auth_1 = require("../middleware/auth");
const pool_1 = require("../db/pool");
exports.servicesRouter = (0, express_1.Router)();
exports.servicesRouter.use(auth_1.authenticate);
const serviceSchema = zod_1.z.object({
    code: zod_1.z.string().min(1).max(50),
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().optional(),
    coverage_type: zod_1.z.enum(['contract', 'extra']).default('extra'),
    base_price: zod_1.z.number().min(0),
    transport_price: zod_1.z.number().min(0).default(0),
    unit: zod_1.z.string().default('EUR'),
});
exports.servicesRouter.get('/', async (req, res, next) => {
    try {
        const coverage = req.query.coverage_type;
        let where = 'WHERE is_active = 1';
        const params = [];
        if (coverage) {
            where += ' AND coverage_type = ?';
            params.push(coverage);
        }
        const services = await (0, pool_1.query)(`SELECT * FROM services ${where} ORDER BY code ASC`, params);
        res.json({ data: services });
    }
    catch (err) {
        next(err);
    }
});
exports.servicesRouter.post('/', (0, auth_1.authorize)('admin', 'manager'), async (req, res, next) => {
    try {
        const body = serviceSchema.parse(req.body);
        const id = (0, uuid_1.v4)();
        await (0, pool_1.query)(`INSERT INTO services (id, code, name, description, coverage_type, base_price, transport_price, unit)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [id, body.code, body.name, body.description, body.coverage_type, body.base_price, body.transport_price, body.unit]);
        const service = await (0, pool_1.queryOne)('SELECT * FROM services WHERE id = ?', [id]);
        res.status(201).json({ data: service });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=services.js.map