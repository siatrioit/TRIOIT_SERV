"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCompletionAct = getCompletionAct;
exports.requestCompletionSignature = requestCompletionSignature;
exports.signCompletionAct = signCompletionAct;
exports.generateCompletionActPdf = generateCompletionActPdf;
exports.getCompletionActPdfPath = getCompletionActPdfPath;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const pool_1 = require("../db/pool");
const errorHandler_1 = require("../middleware/errorHandler");
const incidentWork_1 = require("./incidentWork");
const incidentActivity_1 = require("./incidentActivity");
const unitActivity_1 = require("./unitActivity");
const companySettings_1 = require("./companySettings");
async function assertIncidentClosedForCompletion(incidentId) {
    const row = await (0, pool_1.queryOne)(`SELECT st.category FROM incidents i
     INNER JOIN incident_statuses st ON st.code = i.status
     WHERE i.id = ?`, [incidentId]);
    if (!row)
        throw new errorHandler_1.AppError(404, 'Atgadījums nav atrasts', 'NOT_FOUND');
    if (row.category !== 'closed') {
        throw new errorHandler_1.AppError(400, 'Darba apstiprināšana pieejama tikai pēc statusa maiņas uz Atrisināts vai Slēgts', 'INCIDENT_NOT_CLOSED');
    }
}
function uploadsDir() {
    const dir = process.env.UPLOAD_DIR ||
        path_1.default.join(process.cwd(), 'uploads', 'completion-acts');
    fs_1.default.mkdirSync(dir, { recursive: true });
    return dir;
}
function fontPath(name) {
    const candidates = [
        path_1.default.join(process.cwd(), 'node_modules', 'dejavu-fonts-ttf', 'ttf', name),
        path_1.default.join(__dirname, '../../node_modules/dejavu-fonts-ttf/ttf', name),
        path_1.default.join(__dirname, '../../../node_modules/dejavu-fonts-ttf/ttf', name),
    ];
    for (const candidate of candidates) {
        if (fs_1.default.existsSync(candidate))
            return candidate;
    }
    throw new errorHandler_1.AppError(500, 'PDF font not found', 'FONT_MISSING');
}
function formatLvDate(value) {
    const d = value instanceof Date ? value : new Date(value);
    return d.toLocaleDateString('lv-LV', { dateStyle: 'long' });
}
function formatDuration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0)
        return `${m} min`;
    if (m === 0)
        return `${h} h`;
    return `${h} h ${m} min`;
}
async function getCompletionAct(incidentId) {
    const row = await (0, pool_1.queryOne)(`SELECT c.*, u.full_name AS staff_name
     FROM incident_completion_acts c
     LEFT JOIN users u ON u.id = c.staff_requested_by
     WHERE c.incident_id = ?`, [incidentId]);
    if (!row)
        return null;
    return toPublic(row);
}
function toPublic(row) {
    const { signature_data, staff_name, ...rest } = row;
    return {
        ...rest,
        has_signature: Boolean(row.client_signed_at && row.client_signer_name),
        has_act: Boolean(row.act_pdf_path && row.act_generated_at),
        staff_requested_by_name: staff_name ?? null,
    };
}
async function requestCompletionSignature(incidentId, staffUserId) {
    await assertIncidentClosedForCompletion(incidentId);
    const existing = await (0, pool_1.queryOne)('SELECT * FROM incident_completion_acts WHERE incident_id = ?', [incidentId]);
    if (existing?.client_signed_at) {
        return toPublic(existing);
    }
    const id = existing?.id ?? (0, uuid_1.v4)();
    if (existing) {
        await (0, pool_1.query)(`UPDATE incident_completion_acts
       SET staff_requested_at = NOW(), staff_requested_by = ?
       WHERE incident_id = ?`, [staffUserId, incidentId]);
    }
    else {
        await (0, pool_1.query)(`INSERT INTO incident_completion_acts (id, incident_id, staff_requested_at, staff_requested_by)
       VALUES (?, ?, NOW(), ?)`, [id, incidentId, staffUserId]);
    }
    const row = await getCompletionAct(incidentId);
    return row;
}
async function signCompletionAct(params) {
    await assertIncidentClosedForCompletion(params.incidentId);
    const incident = await (0, pool_1.queryOne)('SELECT id FROM incidents WHERE id = ?', [params.incidentId]);
    if (!incident)
        throw new errorHandler_1.AppError(404, 'Atgadījums nav atrasts', 'NOT_FOUND');
    let name = params.signerName.trim();
    if (params.portalUserId && params.signatureType === 'drawn') {
        const portalUser = await (0, pool_1.queryOne)('SELECT full_name FROM portal_users WHERE id = ?', [params.portalUserId]);
        if (portalUser?.full_name?.trim()) {
            name = portalUser.full_name.trim();
        }
    }
    if (!name)
        throw new errorHandler_1.AppError(400, 'Norādiet parakstītāja vārdu', 'SIGNER_NAME_REQUIRED');
    if (params.signatureType === 'drawn' && !params.signatureData.startsWith('data:image/')) {
        throw new errorHandler_1.AppError(400, 'Nederīgs paraksta attēls', 'INVALID_SIGNATURE');
    }
    let row = await (0, pool_1.queryOne)('SELECT * FROM incident_completion_acts WHERE incident_id = ?', [params.incidentId]);
    if (!row) {
        const id = (0, uuid_1.v4)();
        await (0, pool_1.query)(`INSERT INTO incident_completion_acts (
        id, incident_id, staff_requested_at, staff_requested_by,
        client_signer_name, signature_type, signature_data, client_signed_at
      ) VALUES (?, ?, NOW(), ?, ?, ?, ?, NOW())`, [
            id,
            params.incidentId,
            params.staffUserId ?? null,
            name,
            params.signatureType,
            params.signatureData,
        ]);
    }
    else {
        await (0, pool_1.query)(`UPDATE incident_completion_acts SET
        client_signer_name = ?,
        signature_type = ?,
        signature_data = ?,
        client_signed_at = NOW(),
        staff_requested_by = COALESCE(staff_requested_by, ?),
        staff_requested_at = COALESCE(staff_requested_at, NOW()),
        act_pdf_path = NULL,
        act_generated_at = NULL,
        act_number = NULL
       WHERE incident_id = ?`, [
            name,
            params.signatureType,
            params.signatureData,
            params.staffUserId ?? null,
            params.incidentId,
        ]);
    }
    const actor = params.staffUserId
        ? { userId: params.staffUserId, userName: await (0, unitActivity_1.resolveStaffActorName)(params.staffUserId) }
        : { userId: params.portalUserId ?? '', userName: name };
    await (0, incidentActivity_1.logIncidentActivity)(params.incidentId, 'completion_signed', `Klienta apstiprinājums: ${name}`, actor.userId ? actor : null, { signer_name: name, signature_type: params.signatureType });
    const result = await getCompletionAct(params.incidentId);
    return result;
}
async function loadIncidentForAct(incidentId) {
    const row = await (0, pool_1.queryOne)(`SELECT i.id, i.incident_number, i.title, i.description, i.resolution,
            i.received_at, i.completed_at,
            c.name AS client_name,
            co.name AS object_name,
            co.address AS object_address,
            u.serial_number AS unit_serial, u.unit_type, u.model AS unit_model,
            at.name AS asset_type_name,
            au.full_name AS assigned_user_name,
            au.signature_data AS assigned_user_signature
     FROM incidents i
     JOIN clients c ON c.id = i.client_id
     LEFT JOIN client_objects co ON co.id = i.object_id
     LEFT JOIN units u ON u.id = i.unit_id
     LEFT JOIN asset_types at ON at.id = u.asset_type_id
     LEFT JOIN users au ON au.id = i.assigned_to
     WHERE i.id = ?`, [incidentId]);
    if (!row)
        throw new errorHandler_1.AppError(404, 'Atgadījums nav atrasts', 'NOT_FOUND');
    return row;
}
function parseSignatureImage(signatureData) {
    if (!signatureData?.startsWith('data:image/'))
        return null;
    const base64 = signatureData.replace(/^data:image\/\w+;base64,/, '');
    return Buffer.from(base64, 'base64');
}
async function buildPdf(incident, completion, workLogs, materials) {
    const actNumber = completion.act_number ||
        `AKT-${incident.incident_number.replace(/[^A-Z0-9-]/gi, '')}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const fileName = `${actNumber.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
    const filePath = path_1.default.join(uploadsDir(), fileName);
    const regular = fontPath('DejaVuSans.ttf');
    const bold = fontPath('DejaVuSans-Bold.ttf');
    const company = await (0, companySettings_1.getCompanySettings)();
    const sortedWorkLogs = [...workLogs].reverse();
    await new Promise((resolve, reject) => {
        void (async () => {
            const { default: PDFDocument } = await Promise.resolve().then(() => __importStar(require('pdfkit')));
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const stream = fs_1.default.createWriteStream(filePath);
            doc.pipe(stream);
            doc.registerFont('Regular', regular);
            doc.registerFont('Bold', bold);
            const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
            doc.font('Bold').fontSize(16).text(company.company_name || 'TRIO IT', { align: 'center' });
            doc.font('Regular').fontSize(9);
            for (const line of [company.header_line1, company.header_line2, company.header_line3]) {
                if (line?.trim()) {
                    doc.text(line.trim(), { align: 'center' });
                }
            }
            doc.moveDown(0.3);
            doc.font('Bold').fontSize(13).text('Remonta darbu izpildes un pieņemšanas-nodošanas akts', {
                align: 'center',
            });
            doc.moveDown(0.8);
            doc.font('Regular').fontSize(10);
            doc.text(`Akts Nr.: ${actNumber}`, { align: 'right' });
            doc.text(`Datums: ${formatLvDate(new Date())}`, { align: 'right' });
            doc.moveDown(1);
            const infoRows = [
                ['Atgadījums', incident.incident_number],
                ['Nosaukums', incident.title],
                ['Klients', incident.client_name],
            ];
            if (incident.object_name)
                infoRows.push(['Objekts', incident.object_name]);
            if (incident.object_address)
                infoRows.push(['Adrese', incident.object_address]);
            const device = [incident.asset_type_name, incident.unit_model, incident.unit_serial]
                .filter(Boolean)
                .join(' · ');
            if (device)
                infoRows.push(['Ierīce', device]);
            if (incident.assigned_user_name)
                infoRows.push(['Izpildītājs', incident.assigned_user_name]);
            infoRows.push(['Izsaukums saņemts', formatLvDate(incident.received_at)]);
            if (incident.completed_at) {
                infoRows.push(['Atrisināts', formatLvDate(incident.completed_at)]);
            }
            for (const [label, value] of infoRows) {
                doc.font('Bold').text(`${label}: `, { continued: true });
                doc.font('Regular').text(value || '—');
            }
            doc.moveDown(0.8);
            doc.font('Bold').fontSize(11).text('1. Veiktie darbi');
            doc.moveDown(0.3);
            doc.font('Regular').fontSize(10);
            if (sortedWorkLogs.length === 0) {
                doc.text('Darbu žurnālā nav detalizētu ierakstu.');
            }
            else {
                sortedWorkLogs.forEach((log, index) => {
                    doc.text(`${index + 1}. ${formatLvDate(log.work_date)} — ${log.description} (${formatDuration(log.duration_minutes)}${log.user_name ? `, ${log.user_name}` : ''})`);
                });
            }
            if (incident.resolution) {
                doc.moveDown(0.5);
                doc.font('Bold').text('Risinājuma kopsavilkums:');
                doc.font('Regular').text(incident.resolution);
            }
            doc.moveDown(0.8);
            doc.font('Bold').fontSize(11).text('2. Izmantotie materiāli');
            doc.moveDown(0.3);
            doc.font('Regular').fontSize(10);
            if (materials.length === 0) {
                doc.text('Materiāli nav reģistrēti.');
            }
            else {
                materials.forEach((m) => {
                    doc.text(`• ${m.item_name} — ${m.quantity} ${m.item_unit ?? 'gab.'}`);
                });
            }
            doc.moveDown(1);
            doc.font('Bold').fontSize(11).text('3. Pušu apliecinājums');
            doc.moveDown(0.4);
            doc.font('Regular').fontSize(10).text('Izpildītājs apliecina, ka remonta darbi ir veikti pilnā apjomā un atbilstoši noteiktajam ' +
                'apjomam. Pasūtītājs (klients) apliecina darbu pieņemšanu bez iebildumiem un apstiprina, ' +
                'ka ierīce ir nodota ekspluatācijā.', { align: 'justify' });
            doc.moveDown(1.2);
            const colWidth = pageWidth / 2 - 10;
            const yStart = doc.y;
            doc.font('Bold').fontSize(10).text('Izpildītājs', doc.page.margins.left, yStart, {
                width: colWidth,
            });
            doc.text('Pasūtītājs (klients)', doc.page.margins.left + colWidth + 20, yStart, {
                width: colWidth,
            });
            const sigY = yStart + 18;
            const executorX = doc.page.margins.left;
            const clientX = doc.page.margins.left + colWidth + 20;
            const staffSigImage = parseSignatureImage(incident.assigned_user_signature);
            if (staffSigImage) {
                try {
                    doc.image(staffSigImage, executorX, sigY - 5, { width: 140, height: 50 });
                }
                catch {
                    /* leave blank */
                }
            }
            const clientSigImage = completion.signature_type === 'drawn' ? parseSignatureImage(completion.signature_data) : null;
            if (clientSigImage) {
                try {
                    doc.image(clientSigImage, clientX, sigY - 5, { width: 140, height: 50 });
                }
                catch {
                    doc.font('Regular').fontSize(14).text(completion.client_signer_name || '—', clientX, sigY, {
                        width: colWidth,
                    });
                }
            }
            else {
                doc.font('Regular').fontSize(14).text(completion.client_signer_name || '—', clientX, sigY, {
                    width: colWidth,
                });
            }
            const lineY = sigY + 55;
            doc.moveTo(executorX, lineY).lineTo(executorX + colWidth, lineY).stroke();
            doc.moveTo(clientX, lineY).lineTo(clientX + colWidth, lineY).stroke();
            doc.font('Regular').fontSize(8);
            doc.text('Paraksts', executorX, lineY + 4, { width: colWidth });
            doc.text('Paraksts', clientX, lineY + 4, { width: colWidth });
            const dateY = lineY + 20;
            doc.fontSize(9).text(`Datums: ${formatLvDate(completion.client_signed_at)}`, clientX, dateY, {
                width: colWidth,
            });
            doc.text(`Datums: ${formatLvDate(new Date())}`, executorX, dateY, {
                width: colWidth,
            });
            doc.moveDown(2);
            doc.fontSize(8).fillColor('#666666').text('Šis akts ir sagatavots elektroniski TRIO IT apkalpes sistēmā un ir derīgs bez papildu paraksta, ja ir reģistrēts klienta elektroniskais apstiprinājums.', { align: 'center' });
            doc.end();
            stream.on('finish', () => resolve());
            stream.on('error', reject);
        })().catch(reject);
    });
    return filePath;
}
async function generateCompletionActPdf(incidentId, staffUserId) {
    const completion = await (0, pool_1.queryOne)('SELECT * FROM incident_completion_acts WHERE incident_id = ?', [incidentId]);
    if (!completion?.client_signed_at) {
        throw new errorHandler_1.AppError(400, 'Vispirms nepieciešams klienta paraksts', 'SIGNATURE_REQUIRED');
    }
    const incident = await loadIncidentForAct(incidentId);
    const workLogs = await (0, incidentWork_1.listWorkLogs)(incidentId);
    const materials = await (0, incidentWork_1.listIncidentMaterials)(incidentId);
    const actNumber = completion.act_number ||
        `AKT-${incident.incident_number.replace(/[^A-Z0-9-]/gi, '')}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const pdfPath = await buildPdf(incident, { ...completion, act_number: actNumber }, workLogs, materials);
    await (0, pool_1.query)(`UPDATE incident_completion_acts SET act_number = ?, act_pdf_path = ?, act_generated_at = NOW()
     WHERE incident_id = ?`, [actNumber, pdfPath, incidentId]);
    await (0, incidentActivity_1.logIncidentActivity)(incidentId, 'act_generated', `Izveidots darbu izpildes akts ${actNumber}`, { userId: staffUserId, userName: await (0, unitActivity_1.resolveStaffActorName)(staffUserId) }, { act_number: actNumber });
    const result = await getCompletionAct(incidentId);
    return result;
}
async function getCompletionActPdfPath(incidentId) {
    const row = await (0, pool_1.queryOne)('SELECT act_pdf_path, act_number FROM incident_completion_acts WHERE incident_id = ?', [incidentId]);
    if (!row?.act_pdf_path || !fs_1.default.existsSync(row.act_pdf_path)) {
        throw new errorHandler_1.AppError(404, 'Akts nav atrasts', 'ACT_NOT_FOUND');
    }
    const filename = `${(row.act_number || 'akts').replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
    return { path: row.act_pdf_path, filename };
}
//# sourceMappingURL=incidentCompletion.js.map