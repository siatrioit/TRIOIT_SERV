"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processNaturalLanguageQuery = processNaturalLanguageQuery;
const openai_1 = __importDefault(require("openai"));
const pool_1 = require("../../db/pool");
/**
 * Natural language vaicājumi: "Parādi visi gaidošie atgadījumi Rīgā"
 */
async function processNaturalLanguageQuery(userQuery) {
    const openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
    // 1. Klasificē vaicājuma tipu
    const classification = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'system',
                content: `Klasificē lietotāja vaicājumu. Atgriez JSON: {"intent": "...", "city": "...", "status": "..."}
Iespējamie intent: pending_incidents, overdue_invoices, expiring_contracts, units_in_repair, critical_incidents, general`,
            },
            { role: 'user', content: userQuery },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
    });
    const intent = JSON.parse(classification.choices[0]?.message?.content || '{}');
    // 2. Izpildi atbilstošo vaicājumu (drošs, iepriekš definēts SQL)
    let data = [];
    let answer = '';
    switch (intent.intent) {
        case 'pending_incidents': {
            const cityFilter = intent.city ? 'AND c.city = ?' : '';
            const params = intent.city ? [intent.city] : [];
            data = await (0, pool_1.query)(`SELECT i.*, c.name as client_name, c.city FROM incidents i
         JOIN clients c ON i.client_id = c.id
         WHERE i.status IN ('pending', 'in_progress') ${cityFilter}
         ORDER BY i.priority DESC, i.received_at ASC LIMIT 50`, params);
            answer = `Atrasti ${data.length} gaidošie atgadījumi${intent.city ? ` pilsētā ${intent.city}` : ''}.`;
            break;
        }
        case 'overdue_invoices': {
            data = await (0, pool_1.query)(`SELECT i.*, c.name as client_name FROM invoices i
         JOIN clients c ON i.client_id = c.id
         WHERE i.status IN ('sent', 'confirmed', 'overdue') AND i.due_date < CURDATE()
         ORDER BY i.due_date ASC LIMIT 50`);
            answer = `Atrasti ${data.length} nokavētie rēķini.`;
            break;
        }
        case 'critical_incidents': {
            data = await (0, pool_1.query)(`SELECT i.*, c.name as client_name FROM incidents i
         JOIN clients c ON i.client_id = c.id
         WHERE i.priority = 'critical' AND i.status != 'completed'
         ORDER BY i.received_at ASC LIMIT 50`);
            answer = `Atrasti ${data.length} kritiski atgadījumi.`;
            break;
        }
        default:
            answer = 'Neizdevās interpretēt vaicājumu. Mēģiniet: "Parādi gaidošos atgadījumus Rīgā" vai "Nokavētie rēķini".';
    }
    return { answer, data };
}
//# sourceMappingURL=naturalLanguageQuery.js.map