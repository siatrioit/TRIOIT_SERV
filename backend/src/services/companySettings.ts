import { query, queryOne } from '../db/pool';

export type CompanySettings = {
  id: string;
  company_name: string;
  header_line1: string | null;
  header_line2: string | null;
  header_line3: string | null;
  registration_number: string | null;
  vat_number: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  bank_name: string | null;
  bank_account: string | null;
  updated_at: string;
  updated_by: string | null;
};

export type CompanySettingsInput = Partial<
  Omit<CompanySettings, 'id' | 'updated_at' | 'updated_by'>
>;

const SELECT_FIELDS = `
  id, company_name, header_line1, header_line2, header_line3,
  registration_number, vat_number, address, phone, email,
  bank_name, bank_account, updated_at, updated_by
`;

export async function getCompanySettings(): Promise<CompanySettings> {
  const row = await queryOne<CompanySettings>(
    `SELECT ${SELECT_FIELDS} FROM company_settings ORDER BY updated_at DESC LIMIT 1`
  );
  if (row) return row;
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

export async function updateCompanySettings(
  input: CompanySettingsInput,
  userId: string
): Promise<CompanySettings> {
  const existing = await getCompanySettings();
  if (!existing.id) {
    throw new Error('Company settings row missing');
  }

  const fields = Object.keys(input).filter(
    (k) => (input as Record<string, unknown>)[k] !== undefined
  );
  if (fields.length === 0) return existing;

  const setParts = fields.map((f) => `${f} = ?`);
  const values = fields.map((f) => {
    const v = (input as Record<string, unknown>)[f];
    return typeof v === 'string' ? v.trim() || null : (v ?? null);
  });

  await query(
    `UPDATE company_settings SET ${setParts.join(', ')}, updated_by = ? WHERE id = ?`,
    [...values, userId, existing.id]
  );

  return getCompanySettings();
}
