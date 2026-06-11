import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, authorize } from '../middleware/auth';
import { extractIncidentFromTranscript } from '../services/ai/voiceToIncident';
import { processNaturalLanguageQuery } from '../services/ai/naturalLanguageQuery';
import { query } from '../db/pool';
import { AppError } from '../middleware/errorHandler';

export const aiRouter = Router();
aiRouter.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

/**
 * POST /ai/voice-to-incident
 * Body: { transcript: string } vai audio file (multipart)
 */
aiRouter.post('/voice-to-incident', authorize('admin', 'manager', 'technician'), async (req, res, next) => {
  try {
    const { transcript } = z.object({
      transcript: z.string().min(5),
    }).parse(req.body);

    const extraction = await extractIncidentFromTranscript(transcript);

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
  } catch (err) {
    next(err);
  }
});

/**
 * POST /ai/confirm-incident
 * Lietotājs apstiprina/correct AI ieteikumu
 */
aiRouter.post('/confirm-incident', authorize('admin', 'manager', 'technician'), async (req, res, next) => {
  try {
    const body = z.object({
      client_id: z.string().uuid(),
      unit_id: z.string().uuid().optional(),
      title: z.string(),
      description: z.string().optional(),
      priority: z.enum(['low', 'medium', 'high', 'critical']),
      voice_transcript: z.string().optional(),
      ai_confidence: z.number().optional(),
      corrections: z.array(z.object({
        field_name: z.string(),
        ai_value: z.string().optional(),
        corrected_value: z.string(),
      })).optional(),
    }).parse(req.body);

    const id = uuidv4();
    const incidentNumber = `INC-${Date.now()}`;

    await query(
      `INSERT INTO incidents (id, incident_number, client_id, unit_id, title, description,
        priority, status, reported_via, voice_transcript, ai_confidence, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 'voice', ?, ?, ?)`,
      [
        id, incidentNumber, body.client_id, body.unit_id, body.title,
        body.description, body.priority, body.voice_transcript,
        body.ai_confidence, req.user?.userId,
      ]
    );

    // Saglabā AI korekcijas feedback loop
    if (body.corrections?.length) {
      for (const c of body.corrections) {
        await query(
          'INSERT INTO ai_corrections (id, incident_id, field_name, ai_value, corrected_value, corrected_by) VALUES (?, ?, ?, ?, ?, ?)',
          [uuidv4(), id, c.field_name, c.ai_value, c.corrected_value, req.user?.userId]
        );
      }
    }

    res.status(201).json({ data: { id, incident_number: incidentNumber } });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /ai/query
 * Natural language vaicājumi
 */
aiRouter.post('/query', async (req, res, next) => {
  try {
    const { query: userQuery } = z.object({
      query: z.string().min(3),
    }).parse(req.body);

    const result = await processNaturalLanguageQuery(userQuery);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /ai/transcribe
 * Audio → teksts (placeholder — integrēt Google/Azure Speech)
 */
aiRouter.post('/transcribe', upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError(400, 'Audio file required');

    // TODO: Integrēt Google Speech-to-Text vai Azure Speech
    // const transcript = await googleSpeechTranscribe(req.file.buffer);
    const transcript = '[Transcription placeholder — konfigurējiet GOOGLE_SPEECH_API_KEY]';

    res.json({ data: { transcript } });
  } catch (err) {
    next(err);
  }
});
