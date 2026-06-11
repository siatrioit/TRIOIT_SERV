"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const zod_1 = require("zod");
const uuid_1 = require("uuid");
const auth_1 = require("../middleware/auth");
const voiceToIncident_1 = require("../services/ai/voiceToIncident");
const naturalLanguageQuery_1 = require("../services/ai/naturalLanguageQuery");
const pool_1 = require("../db/pool");
const errorHandler_1 = require("../middleware/errorHandler");
exports.aiRouter = (0, express_1.Router)();
exports.aiRouter.use(auth_1.authenticate);
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
});
/**
 * POST /ai/voice-to-incident
 * Body: { transcript: string } vai audio file (multipart)
 */
exports.aiRouter.post('/voice-to-incident', (0, auth_1.authorize)('admin', 'manager', 'technician'), async (req, res, next) => {
    try {
        const { transcript } = zod_1.z.object({
            transcript: zod_1.z.string().min(5),
        }).parse(req.body);
        const extraction = await (0, voiceToIncident_1.extractIncidentFromTranscript)(transcript);
        // Fallback: zema confidence — prasa manuālu apstiprinājumu
        const needsReview = extraction.confidence < 0.7 || !extraction.client_id;
        res.json({
            data: {
                extraction,
                needs_review: needsReview,
                suggested_incident: {
                    client_id: extraction.client_id,
                    unit_id: extraction.unit_id,
                    title: extraction.title,
                    description: extraction.description,
                    priority: extraction.priority,
                    reported_via: 'voice',
                    voice_transcript: transcript,
                    ai_confidence: extraction.confidence,
                },
            },
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /ai/confirm-incident
 * Lietotājs apstiprina/correct AI ieteikumu
 */
exports.aiRouter.post('/confirm-incident', (0, auth_1.authorize)('admin', 'manager', 'technician'), async (req, res, next) => {
    try {
        const body = zod_1.z.object({
            client_id: zod_1.z.string().uuid(),
            unit_id: zod_1.z.string().uuid().optional(),
            title: zod_1.z.string(),
            description: zod_1.z.string().optional(),
            priority: zod_1.z.enum(['low', 'medium', 'high', 'critical']),
            voice_transcript: zod_1.z.string().optional(),
            ai_confidence: zod_1.z.number().optional(),
            corrections: zod_1.z.array(zod_1.z.object({
                field_name: zod_1.z.string(),
                ai_value: zod_1.z.string().optional(),
                corrected_value: zod_1.z.string(),
            })).optional(),
        }).parse(req.body);
        const id = (0, uuid_1.v4)();
        const incidentNumber = `INC-${Date.now()}`;
        await (0, pool_1.query)(`INSERT INTO incidents (id, incident_number, client_id, unit_id, title, description,
        priority, status, reported_via, voice_transcript, ai_confidence, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 'voice', ?, ?, ?)`, [
            id, incidentNumber, body.client_id, body.unit_id, body.title,
            body.description, body.priority, body.voice_transcript,
            body.ai_confidence, req.user?.userId,
        ]);
        // Saglabā AI korekcijas feedback loop
        if (body.corrections?.length) {
            for (const c of body.corrections) {
                await (0, pool_1.query)('INSERT INTO ai_corrections (id, incident_id, field_name, ai_value, corrected_value, corrected_by) VALUES (?, ?, ?, ?, ?, ?)', [(0, uuid_1.v4)(), id, c.field_name, c.ai_value, c.corrected_value, req.user?.userId]);
            }
        }
        res.status(201).json({ data: { id, incident_number: incidentNumber } });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /ai/query
 * Natural language vaicājumi
 */
exports.aiRouter.post('/query', async (req, res, next) => {
    try {
        const { query: userQuery } = zod_1.z.object({
            query: zod_1.z.string().min(3),
        }).parse(req.body);
        const result = await (0, naturalLanguageQuery_1.processNaturalLanguageQuery)(userQuery);
        res.json({ data: result });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /ai/transcribe
 * Audio → teksts (placeholder — integrēt Google/Azure Speech)
 */
exports.aiRouter.post('/transcribe', upload.single('audio'), async (req, res, next) => {
    try {
        if (!req.file)
            throw new errorHandler_1.AppError(400, 'Audio file required');
        // TODO: Integrēt Google Speech-to-Text vai Azure Speech
        // const transcript = await googleSpeechTranscribe(req.file.buffer);
        const transcript = '[Transcription placeholder — konfigurējiet GOOGLE_SPEECH_API_KEY]';
        res.json({ data: { transcript } });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=ai.js.map