import { type PortalAccessGrant } from './portalScope';
export type IncidentMessage = {
    id: string;
    incident_id: string;
    author_type: 'staff' | 'portal';
    author_name: string;
    body: string;
    created_at: string;
    is_unread?: boolean;
};
export declare function getLastReadAt(incidentId: string, readerType: 'staff' | 'portal', readerId: string): Promise<string | null>;
export declare function getPortalReadWatermark(incidentId: string, portalUserId: string): Promise<string>;
export declare function listIncidentMessagesWithReadState(incidentId: string, readerType: 'staff' | 'portal', readerId: string): Promise<IncidentMessage[]>;
export declare function assertIncidentExists(incidentId: string): Promise<void>;
export declare function listIncidentMessages(incidentId: string): Promise<IncidentMessage[]>;
export declare function addStaffMessage(incidentId: string, staffUserId: string, body: string): Promise<IncidentMessage>;
export declare function addPortalMessage(incidentId: string, portalUserId: string, grants: PortalAccessGrant[], body: string): Promise<IncidentMessage>;
export declare function markIncidentRead(incidentId: string, readerType: 'staff' | 'portal', readerId: string): Promise<void>;
export declare function countUnreadForPortal(incidentId: string, portalUserId: string): Promise<number>;
/** SQL fragments for portal incident list unread_count (3× same portalUserId param). */
export declare const PORTAL_UNREAD_COUNT_SQL = "(SELECT COUNT(*) FROM incident_messages m\n  WHERE m.incident_id = i.id AND m.author_type = 'staff'\n  AND m.created_at > COALESCE(\n    (SELECT GREATEST(\n      COALESCE(r.last_read_at, '1970-01-01 00:00:00'),\n      COALESCE(\n        (SELECT MAX(p.created_at) FROM incident_messages p\n         WHERE p.incident_id = i.id AND p.author_type = 'portal' AND p.author_portal_id = ?),\n        '1970-01-01 00:00:00'\n      )\n    )\n    FROM incident_message_reads r\n    WHERE r.incident_id = i.id AND r.reader_type = 'portal' AND r.reader_id = ?),\n    COALESCE(\n      (SELECT MAX(p.created_at) FROM incident_messages p\n       WHERE p.incident_id = i.id AND p.author_type = 'portal' AND p.author_portal_id = ?),\n      '1970-01-01 00:00:00'\n    )\n  ))";
export declare function countUnreadForStaff(incidentId: string, staffUserId: string): Promise<number>;
//# sourceMappingURL=incidentMessages.d.ts.map