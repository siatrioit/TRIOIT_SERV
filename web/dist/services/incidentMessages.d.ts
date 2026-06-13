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
export declare function getStaffReadWatermark(incidentId: string, staffUserId: string): Promise<string>;
export declare function listIncidentMessagesWithReadState(incidentId: string, readerType: 'staff' | 'portal', readerId: string): Promise<IncidentMessage[]>;
export declare function assertIncidentExists(incidentId: string): Promise<void>;
export declare function listIncidentMessages(incidentId: string): Promise<IncidentMessage[]>;
export declare function addStaffMessage(incidentId: string, staffUserId: string, body: string): Promise<IncidentMessage>;
export declare function addPortalMessage(incidentId: string, portalUserId: string, grants: PortalAccessGrant[], body: string): Promise<IncidentMessage>;
export declare function markIncidentRead(incidentId: string, readerType: 'staff' | 'portal', readerId: string): Promise<void>;
export declare function countUnreadForPortal(incidentId: string, portalUserId: string): Promise<number>;
export declare function countUnreadForStaff(incidentId: string, staffUserId: string): Promise<number>;
//# sourceMappingURL=incidentMessages.d.ts.map