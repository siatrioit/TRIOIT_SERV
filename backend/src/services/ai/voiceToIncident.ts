import OpenAI from 'openai';
import { query } from '../../db/pool';

export interface VoiceIncidentExtraction {
  client_name?: string;
  client_id?: string;
  serial_number?: string;
  unit_id?: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  services: Array<{ name: string; coverage_type: 'contract' | 'extra' }>;
  location?: string;
  confidence: number;
}

const SYSTEM_PROMPT = `Tu esi TRIO-SERV lauka servisa sistēmas AI asistents.
Analizē latviešu valodas balss transkriptu un ekstrahē atgadījuma datus JSON formātā.

Atgriez TIKAI derīgu JSON:
{
  "client_name": "klienta nosaukums vai null",
  "serial_number": "sērijas numurs vai null",
  "title": "īss atgadījuma virsraksts",
  "description": "pilns apraksts",
  "priority": "low|medium|high|critical",
  "services": [{"name": "pakalpojuma nosaukums", "coverage_type": "contract|extra"}],
  "location": "adrese/pilsēta vai null",
  "confidence": 0.0-1.0
}

Prioritātes noteikšana:
- critical: sistēma pilnībā nedarbojas, finanšu zaudējumi
- high: POS/kase nedarbojas, darba pārtraukšana
- medium: daļēja disfunkcija
- low: profilaktika, kosmētiski defekti`;

/**
 * Voice → NLP → strukturēti atgadījuma dati
 */
export async function extractIncidentFromTranscript(
  transcript: string
): Promise<VoiceIncidentExtraction> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: transcript },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error('AI returned empty response');

  const parsed = JSON.parse(raw) as VoiceIncidentExtraction;

  // Klienta identifikācija no DB
  if (parsed.client_name) {
    const clients = await query<{ id: string; name: string }>(
      'SELECT id, name FROM clients WHERE name LIKE ? AND is_active = 1 LIMIT 1',
      [`%${parsed.client_name}%`]
    );
    if (clients[0]) parsed.client_id = clients[0].id;
  }

  // Vienības identifikācija pēc sērijas numura
  if (parsed.serial_number) {
    const units = await query<{ id: string; client_id: string }>(
      'SELECT id, client_id FROM units WHERE serial_number LIKE ? LIMIT 1',
      [`%${parsed.serial_number}%`]
    );
    if (units[0]) {
      parsed.unit_id = units[0].id;
      if (!parsed.client_id) parsed.client_id = units[0].client_id;
    }
  }

  return parsed;
}
