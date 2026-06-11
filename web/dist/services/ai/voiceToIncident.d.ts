export interface VoiceIncidentExtraction {
    client_name?: string;
    client_id?: string;
    serial_number?: string;
    unit_id?: string;
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    services: Array<{
        name: string;
        coverage_type: 'contract' | 'extra';
    }>;
    location?: string;
    confidence: number;
}
/**
 * Voice → NLP → strukturēti atgadījuma dati
 */
export declare function extractIncidentFromTranscript(transcript: string): Promise<VoiceIncidentExtraction>;
//# sourceMappingURL=voiceToIncident.d.ts.map