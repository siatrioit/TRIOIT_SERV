"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCompanySettings = getCompanySettings;
exports.updateCompanySettings = updateCompanySettings;
const pool_1 = require("../db/pool");
const SELECT_FIELDS = `
  id, company_name, header_line1, header_line2, header_line3,
  registration_number, vat_number, address, phone, email,
  bank_name, bank_account, updated_at, updated_by
`;
async function getCompanySettings() {
    const row = await (0, pool_1.queryOne)(`SELECT ${SELECT_FIELDS} FROM company_settings ORDER BY updated_at DESC LIMIT 1`);
    if (row)
        return row;
    return {
        id: '',
        company_name: 'TRIO IT',
        header_line1: null,
        header_line2: null,
        header_line3: null,
        registration_number: null,
        vat_number: null,
        address: null,
        phone: null,
        email: null,
        bank_name: null,
        bank_account: null,
        updated_at: new Date().toISOString(),
        updated_by: null,
    };
}
async function updateCompanySettings(input, userId) {
    const existing = await getCompanySettings();
    if (!existing.id) {
        throw new Error('Company settings row missing');
    }
    const fields = Object.keys(input).filter((k) => input[k] !== undefined);
    if (fields.length === 0)
        return existing;
    const setParts = fields.map((f) => `${f} = ?`);
    const values = fields.map((f) => {
        const v = input[f];
        return typeof v === 'string' ? v.trim() || null : (v ?? null);
    });
    await (0, pool_1.query)(`UPDATE company_settings SET ${setParts.join(', ')}, updated_by = ? WHERE id = ?`, [...values, userId, existing.id]);
    return getCompanySettings();
}
//# sourceMappingURL=companySettings.js.map