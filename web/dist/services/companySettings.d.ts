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
export type CompanySettingsInput = Partial<Omit<CompanySettings, 'id' | 'updated_at' | 'updated_by'>>;
export declare function getCompanySettings(): Promise<CompanySettings>;
export declare function updateCompanySettings(input: CompanySettingsInput, userId: string): Promise<CompanySettings>;
//# sourceMappingURL=companySettings.d.ts.map