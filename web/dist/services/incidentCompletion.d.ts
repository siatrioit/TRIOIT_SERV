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
export declare function getCompletionAct(incidentId: string): Promise<CompletionActPublic | null>;
export declare function requestCompletionSignature(incidentId: string, staffUserId: string): Promise<CompletionActPublic>;
export declare function signCompletionAct(params: {
    incidentId: string;
    signerName: string;
    signatureType: 'typed' | 'drawn';
    signatureData: string;
    staffUserId?: string | null;
    portalUserId?: string | null;
}): Promise<CompletionActPublic>;
export declare function generateCompletionActPdf(incidentId: string, staffUserId: string): Promise<CompletionActPublic>;
export declare function getCompletionActPdfPath(incidentId: string): Promise<{
    path: string;
    filename: string;
}>;
//# sourceMappingURL=incidentCompletion.d.ts.map