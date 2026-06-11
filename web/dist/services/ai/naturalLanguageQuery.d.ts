export interface NLQueryResult {
    answer: string;
    data?: unknown[];
    sql_used?: string;
}
/**
 * Natural language vaicājumi: "Parādi visi gaidošie atgadījumi Rīgā"
 */
export declare function processNaturalLanguageQuery(userQuery: string): Promise<NLQueryResult>;
//# sourceMappingURL=naturalLanguageQuery.d.ts.map