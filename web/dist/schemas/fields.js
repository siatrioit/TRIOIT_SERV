"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.boolish = exports.optionalEmail = exports.optionalString = void 0;
exports.emptyToUndefined = emptyToUndefined;
const zod_1 = require("zod");
/** Tukšas virknes no formas → undefined */
function emptyToUndefined(val) {
    if (val === '' || val === null)
        return undefined;
    return val;
}
exports.optionalString = zod_1.z.preprocess(emptyToUndefined, zod_1.z.string().optional());
exports.optionalEmail = zod_1.z.preprocess(emptyToUndefined, zod_1.z.string().email().optional());
/** MySQL TINYINT (0/1) vai boolean */
exports.boolish = zod_1.z
    .union([zod_1.z.boolean(), zod_1.z.number(), zod_1.z.string()])
    .transform((v) => v === true || v === 1 || v === '1' || v === 'true');
//# sourceMappingURL=fields.js.map