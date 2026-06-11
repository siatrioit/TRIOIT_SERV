# AI aģenta implementācijas stratēģija

## 1. Voice input plūsma

```
┌──────────┐    ┌─────────────┐    ┌──────────────┐
│ Mikrofons│───▶│ Web Speech  │───▶│ Transkripts  │
│ (mobilā) │    │ API (lv-LV) │    │ (teksts)     │
└──────────┘    └─────────────┘    └──────┬───────┘
                                          │
                    ┌─────────────────────▼─────────────────────┐
                    │ POST /ai/voice-to-incident                 │
                    │ OpenAI GPT-4o-mini + JSON mode               │
                    └─────────────────────┬─────────────────────┘
                                          │
              ┌───────────────────────────┼───────────────────────────┐
              ▼                           ▼                           ▼
     ┌────────────────┐         ┌─────────────────┐         ┌─────────────────┐
     │ Klienta lookup │         │ SN ekstrakcija  │         │ Prioritātes     │
     │ (DB fuzzy)     │         │ → units tabula  │         │ noteikšana      │
     └────────────────┘         └─────────────────┘         └─────────────────┘
                                          │
                    ┌─────────────────────▼─────────────────────┐
                    │ confidence >= 0.7 ?                        │
                    │   Jā  → auto-fill forma                    │
                    │   Nē  → needs_review + manuāla korekcija   │
                    └─────────────────────┬─────────────────────┘
                                          ▼
                              POST /ai/confirm-incident
```

## 2. Fallback mehānismi

| Scenārijs | Fallback |
|-----------|----------|
| Web Speech API nav pieejams | Manuāla teksta ievade |
| OpenAI API kļūda | Saglabā tikai transkriptu, forma tukša |
| Klienta nav atrasts | Rāda meklēšanu, lietotājs izvēlas |
| Zema confidence (<0.7) | Dzeltena brīdinājuma josla + obligāta pārbaude |
| Audio upload (/transcribe) | Google/Azure Speech kā backup |

## 3. Training dati / prompt engineering

### Few-shot piemēri promptā

```
Input: "Veikals Centrā, kase numurs trīs četri pieci, nedarbojas, steidzami"
Output: {
  "client_name": "Veikals Centrā",
  "serial_number": "345",
  "priority": "high",
  ...
}

Input: "Profilaktiskā apkope SIA Alfa, dators Dell"
Output: {
  "client_name": "SIA Alfa",
  "priority": "low",
  "services": [{"name": "Diagnostika", "coverage_type": "contract"}]
}
```

### Domain-specific vārdnīca
- Latvijas pilsētu nosaukumi
- POS ražotāji: Verifone, Ingenico, PAX
- Tipiski pakalpojumi no `services` tabulas

## 4. User feedback loop

1. Katra AI korekcija → `ai_corrections` tabula
2. Mēneša pārskats: top kļūdainie lauki
3. Prompt atjaunināšana balstoties uz korekcijām
4. Nākotnē: fine-tuning ar anonimizētiem datiem

```sql
-- Analītika: AI precizitāte
SELECT field_name,
       COUNT(*) as corrections,
       AVG(LENGTH(corrected_value)) as avg_length
FROM ai_corrections
WHERE created_at > NOW() - INTERVAL 30 DAY
GROUP BY field_name
ORDER BY corrections DESC;
```

## 5. Natural Language Queries

Drošība: **nekad** ģenerēt brīvu SQL. Tikai iepriekš definēti intenti:

| Intent | SQL veidne |
|--------|-----------|
| pending_incidents | WHERE status IN ('pending','in_progress') |
| overdue_invoices | WHERE due_date < TODAY AND status NOT IN ('paid') |
| critical_incidents | WHERE priority = 'critical' |
| expiring_contracts | WHERE end_date < TODAY + 30 days |

## 6. Izmaksu optimizācija

- GPT-4o-mini balss ekstrakcijai (~$0.001/req)
- Cache biežākie klientu nosaukumi
- Batch NLP nakts režīmā rēķinu kategorizācijai

## 7. Privātums

- Transkripti netiek sūtīti uz AI bez lietotāja darbības
- OpenAI API: `data_usage: off` (ja pieejams)
- Pēc 90 dienām dzēst `voice_transcript` (cron job)
