import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../db/pool';
import { AppError } from '../middleware/errorHandler';
import { listIncidentMaterials, listWorkLogs } from './incidentWork';
import { logIncidentActivity } from './incidentActivity';
import { resolveStaffActorName } from './unitActivity';

export type CompletionActRow = {
  id: string;
  incident_id: string;
  staff_requested_at: string | null;
  staff_requested_by: string | null;
  client_signer_name: string | null;
  signature_type: 'typed' | 'drawn';
  signature_data: string | null;
  client_signed_at: string | null;
  act_number: string | null;
  act_pdf_path: string | null;
  act_generated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CompletionActPublic = Omit<CompletionActRow, 'signature_data'> & {
  has_signature: boolean;
  has_act: boolean;
  staff_requested_by_name?: string | null;
};

type IncidentForAct = {
  id: string;
  incident_number: string;
  title: string;
  description: string | null;
  resolution: string | null;
  received_at: string;
  completed_at: string | null;
  client_name: string;
  object_name: string | null;
  object_address: string | null;
  unit_serial: string | null;
  unit_type: string | null;
  unit_model: string | null;
  asset_type_name: string | null;
  assigned_user_name: string | null;
};

function uploadsDir(): string {
  const dir =
    process.env.UPLOAD_DIR ||
    path.join(process.cwd(), 'uploads', 'completion-acts');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function fontPath(name: string): string {
  const candidates = [
    path.join(process.cwd(), 'node_modules', 'dejavu-fonts-ttf', 'ttf', name),
    path.join(__dirname, '../../node_modules/dejavu-fonts-ttf/ttf', name),
    path.join(__dirname, '../../../node_modules/dejavu-fonts-ttf/ttf', name),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new AppError(500, 'PDF font not found', 'FONT_MISSING');
}

function formatLvDate(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleDateString('lv-LV', { dateStyle: 'long' });
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export async function getCompletionAct(incidentId: string): Promise<CompletionActPublic | null> {
  const row = await queryOne<
    CompletionActRow & { staff_name?: string | null }
  >(
    `SELECT c.*, u.full_name AS staff_name
     FROM incident_completion_acts c
     LEFT JOIN users u ON u.id = c.staff_requested_by
     WHERE c.incident_id = ?`,
    [incidentId]
  );
  if (!row) return null;
  return toPublic(row);
}

function toPublic(row: CompletionActRow & { staff_name?: string | null }): CompletionActPublic {
  const { signature_data, staff_name, ...rest } = row;
  return {
    ...rest,
    has_signature: Boolean(row.client_signed_at && row.client_signer_name),
    has_act: Boolean(row.act_pdf_path && row.act_generated_at),
    staff_requested_by_name: staff_name ?? null,
  };
}

export async function requestCompletionSignature(
  incidentId: string,
  staffUserId: string
): Promise<CompletionActPublic> {
  const existing = await queryOne<CompletionActRow>(
    'SELECT * FROM incident_completion_acts WHERE incident_id = ?',
    [incidentId]
  );
  if (existing?.client_signed_at) {
    return toPublic(existing);
  }

  const id = existing?.id ?? uuidv4();
  if (existing) {
    await query(
      `UPDATE incident_completion_acts
       SET staff_requested_at = NOW(), staff_requested_by = ?
       WHERE incident_id = ?`,
      [staffUserId, incidentId]
    );
  } else {
    await query(
      `INSERT INTO incident_completion_acts (id, incident_id, staff_requested_at, staff_requested_by)
       VALUES (?, ?, NOW(), ?)`,
      [id, incidentId, staffUserId]
    );
  }

  const row = await getCompletionAct(incidentId);
  return row!;
}

export async function signCompletionAct(params: {
  incidentId: string;
  signerName: string;
  signatureType: 'typed' | 'drawn';
  signatureData: string;
  staffUserId?: string | null;
  portalUserId?: string | null;
}): Promise<CompletionActPublic> {
  const incident = await queryOne('SELECT id FROM incidents WHERE id = ?', [params.incidentId]);
  if (!incident) throw new AppError(404, 'Atgadījums nav atrasts', 'NOT_FOUND');

  const name = params.signerName.trim();
  if (!name) throw new AppError(400, 'Norādiet parakstītāja vārdu', 'SIGNER_NAME_REQUIRED');

  if (params.signatureType === 'drawn' && !params.signatureData.startsWith('data:image/')) {
    throw new AppError(400, 'Nederīgs paraksta attēls', 'INVALID_SIGNATURE');
  }

  let row = await queryOne<CompletionActRow>(
    'SELECT * FROM incident_completion_acts WHERE incident_id = ?',
    [params.incidentId]
  );

  if (!row) {
    const id = uuidv4();
    await query(
      `INSERT INTO incident_completion_acts (
        id, incident_id, staff_requested_at, staff_requested_by,
        client_signer_name, signature_type, signature_data, client_signed_at
      ) VALUES (?, ?, NOW(), ?, ?, ?, ?, NOW())`,
      [
        id,
        params.incidentId,
        params.staffUserId ?? null,
        name,
        params.signatureType,
        params.signatureData,
      ]
    );
  } else {
    await query(
      `UPDATE incident_completion_acts SET
        client_signer_name = ?,
        signature_type = ?,
        signature_data = ?,
        client_signed_at = NOW(),
        staff_requested_by = COALESCE(staff_requested_by, ?),
        staff_requested_at = COALESCE(staff_requested_at, NOW()),
        act_pdf_path = NULL,
        act_generated_at = NULL,
        act_number = NULL
       WHERE incident_id = ?`,
      [
        name,
        params.signatureType,
        params.signatureData,
        params.staffUserId ?? null,
        params.incidentId,
      ]
    );
  }

  const actor = params.staffUserId
    ? { userId: params.staffUserId, userName: await resolveStaffActorName(params.staffUserId) }
    : { userId: params.portalUserId ?? '', userName: name };

  await logIncidentActivity(
    params.incidentId,
    'completion_signed',
    `Klienta apstiprinājums: ${name}`,
    actor.userId ? actor : null,
    { signer_name: name, signature_type: params.signatureType }
  );

  const result = await getCompletionAct(params.incidentId);
  return result!;
}

async function loadIncidentForAct(incidentId: string): Promise<IncidentForAct> {
  const row = await queryOne<IncidentForAct>(
    `SELECT i.id, i.incident_number, i.title, i.description, i.resolution,
            i.received_at, i.completed_at,
            c.name AS client_name,
            co.name AS object_name,
            co.address AS object_address,
            u.serial_number AS unit_serial, u.unit_type, u.model AS unit_model,
            at.name AS asset_type_name,
            au.full_name AS assigned_user_name
     FROM incidents i
     JOIN clients c ON c.id = i.client_id
     LEFT JOIN client_objects co ON co.id = i.object_id
     LEFT JOIN units u ON u.id = i.unit_id
     LEFT JOIN asset_types at ON at.id = u.asset_type_id
     LEFT JOIN users au ON au.id = i.assigned_to
     WHERE i.id = ?`,
    [incidentId]
  );
  if (!row) throw new AppError(404, 'Atgadījums nav atrasts', 'NOT_FOUND');
  return row;
}

function parseSignatureImage(signatureData: string | null): Buffer | null {
  if (!signatureData?.startsWith('data:image/')) return null;
  const base64 = signatureData.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64, 'base64');
}

async function buildPdf(
  incident: IncidentForAct,
  completion: CompletionActRow,
  workLogs: Awaited<ReturnType<typeof listWorkLogs>>,
  materials: Awaited<ReturnType<typeof listIncidentMaterials>>
): Promise<string> {
  const actNumber =
    completion.act_number ||
    `AKT-${incident.incident_number.replace(/[^A-Z0-9-]/gi, '')}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
  const fileName = `${actNumber.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
  const filePath = path.join(uploadsDir(), fileName);

  const regular = fontPath('DejaVuSans.ttf');
  const bold = fontPath('DejaVuSans-Bold.ttf');

  await new Promise<void>((resolve, reject) => {
    void (async () => {
      const { default: PDFDocument } = await import('pdfkit');
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.registerFont('Regular', regular);
    doc.registerFont('Bold', bold);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    doc.font('Bold').fontSize(16).text('TRIO SERV', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(13).text('Remonta darbu izpildes un pieņemšanas-nodošanas akts', {
      align: 'center',
    });
    doc.moveDown(0.8);
    doc.font('Regular').fontSize(10);
    doc.text(`Akts Nr.: ${actNumber}`, { align: 'right' });
    doc.text(`Datums: ${formatLvDate(new Date())}`, { align: 'right' });
    doc.moveDown(1);

    const infoRows: [string, string][] = [
      ['Atgadījums', incident.incident_number],
      ['Nosaukums', incident.title],
      ['Klients', incident.client_name],
    ];
    if (incident.object_name) infoRows.push(['Objekts', incident.object_name]);
    if (incident.object_address) infoRows.push(['Adrese', incident.object_address]);
    const device = [incident.asset_type_name, incident.unit_model, incident.unit_serial]
      .filter(Boolean)
      .join(' · ');
    if (device) infoRows.push(['Ierīce', device]);
    if (incident.assigned_user_name) infoRows.push(['Izpildītājs', incident.assigned_user_name]);
    infoRows.push(['Saņemts', formatLvDate(incident.received_at)]);

    for (const [label, value] of infoRows) {
      doc.font('Bold').text(`${label}: `, { continued: true });
      doc.font('Regular').text(value || '—');
    }

    doc.moveDown(0.8);
    doc.font('Bold').fontSize(11).text('1. Veiktie darbi');
    doc.moveDown(0.3);
    doc.font('Regular').fontSize(10);

    if (workLogs.length === 0) {
      doc.text('Darbu žurnālā nav detalizētu ierakstu.');
    } else {
      workLogs.forEach((log, index) => {
        doc.text(
          `${index + 1}. ${formatLvDate(log.work_date)} — ${log.description} (${formatDuration(log.duration_minutes)}${log.user_name ? `, ${log.user_name}` : ''})`
        );
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
    } else {
      materials.forEach((m) => {
        doc.text(`• ${m.item_name} — ${m.quantity} ${m.item_unit ?? 'gab.'}`);
      });
    }

    doc.moveDown(1);
    doc.font('Bold').fontSize(11).text('3. Pušu apliecinājums');
    doc.moveDown(0.4);
    doc.font('Regular').fontSize(10).text(
      'Izpildītājs apliecina, ka remonta darbi ir veikti pilnā apjomā un atbilstoši noteiktajam ' +
        'apjomam. Pasūtītājs (klients) apliecina darbu pieņemšanu bez iebildumiem un apstiprina, ' +
        'ka ierīce ir nodota ekspluatācijā.',
      { align: 'justify' }
    );

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
    doc.font('Regular').fontSize(9);
    doc.text(incident.assigned_user_name || 'TRIO SERV', doc.page.margins.left, sigY, {
      width: colWidth,
    });

    const clientX = doc.page.margins.left + colWidth + 20;
    const sigImage = parseSignatureImage(completion.signature_data);
    if (sigImage && completion.signature_type === 'drawn') {
      try {
        doc.image(sigImage, clientX, sigY - 5, { width: 140, height: 50 });
      } catch {
        doc.text(completion.client_signer_name || '—', clientX, sigY, { width: colWidth });
      }
    } else {
      doc.font('Regular').fontSize(14).text(completion.client_signer_name || '—', clientX, sigY, {
        width: colWidth,
      });
    }

    const lineY = sigY + 55;
    doc.moveTo(doc.page.margins.left, lineY).lineTo(doc.page.margins.left + colWidth, lineY).stroke();
    doc
      .moveTo(clientX, lineY)
      .lineTo(clientX + colWidth, lineY)
      .stroke();

    doc.font('Regular').fontSize(8);
    doc.text('Paraksts / vārds', doc.page.margins.left, lineY + 4, { width: colWidth });
    doc.text('Paraksts / vārds', clientX, lineY + 4, { width: colWidth });

    const dateY = lineY + 20;
    doc.fontSize(9).text(`Datums: ${formatLvDate(completion.client_signed_at!)}`, clientX, dateY, {
      width: colWidth,
    });
    doc.text(`Datums: ${formatLvDate(new Date())}`, doc.page.margins.left, dateY, {
      width: colWidth,
    });

    doc.moveDown(2);
    doc.fontSize(8).fillColor('#666666').text(
      'Šis akts ir sagatavots elektroniski TRIO SERV sistēmā un ir derīgs bez papildu paraksta, ja ir reģistrēts klienta elektroniskais apstiprinājums.',
      { align: 'center' }
    );

    doc.end();
    stream.on('finish', () => resolve());
    stream.on('error', reject);
    })().catch(reject);
  });

  return filePath;
}

export async function generateCompletionActPdf(
  incidentId: string,
  staffUserId: string
): Promise<CompletionActPublic> {
  const completion = await queryOne<CompletionActRow>(
    'SELECT * FROM incident_completion_acts WHERE incident_id = ?',
    [incidentId]
  );
  if (!completion?.client_signed_at) {
    throw new AppError(400, 'Vispirms nepieciešams klienta paraksts', 'SIGNATURE_REQUIRED');
  }

  const incident = await loadIncidentForAct(incidentId);
  const workLogs = await listWorkLogs(incidentId);
  const materials = await listIncidentMaterials(incidentId);

  const actNumber =
    completion.act_number ||
    `AKT-${incident.incident_number.replace(/[^A-Z0-9-]/gi, '')}-${Date.now().toString(36).slice(-4).toUpperCase()}`;

  const pdfPath = await buildPdf(incident, { ...completion, act_number: actNumber }, workLogs, materials);

  await query(
    `UPDATE incident_completion_acts SET act_number = ?, act_pdf_path = ?, act_generated_at = NOW()
     WHERE incident_id = ?`,
    [actNumber, pdfPath, incidentId]
  );

  await logIncidentActivity(
    incidentId,
    'act_generated',
    `Izveidots darbu izpildes akts ${actNumber}`,
    { userId: staffUserId, userName: await resolveStaffActorName(staffUserId) },
    { act_number: actNumber }
  );

  const result = await getCompletionAct(incidentId);
  return result!;
}

export async function getCompletionActPdfPath(incidentId: string): Promise<{
  path: string;
  filename: string;
}> {
  const row = await queryOne<CompletionActRow>(
    'SELECT act_pdf_path, act_number FROM incident_completion_acts WHERE incident_id = ?',
    [incidentId]
  );
  if (!row?.act_pdf_path || !fs.existsSync(row.act_pdf_path)) {
    throw new AppError(404, 'Akts nav atrasts', 'ACT_NOT_FOUND');
  }
  const filename = `${(row.act_number || 'akts').replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
  return { path: row.act_pdf_path, filename };
}
