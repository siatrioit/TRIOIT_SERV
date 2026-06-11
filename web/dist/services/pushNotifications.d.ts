export type PushPayload = {
    title: string;
    body: string;
    url: string;
    tag?: string;
};
export declare function isPushConfigured(): boolean;
export declare function getVapidPublicKey(): string | null;
export declare function upsertPushSubscription(userId: string, endpoint: string, p256dh: string, auth: string, userAgent?: string | null): Promise<void>;
export declare function removePushSubscription(userId: string, endpoint: string): Promise<void>;
export declare function sendPushToUsers(userIds: string[], payload: PushPayload, excludeUserId?: string | null): Promise<void>;
export declare function firePush(task: () => Promise<void>): void;
export declare function notifyNewIncident(params: {
    incidentId: string;
    incidentNumber: string;
    title: string;
    objectName?: string | null;
    assignedTo: string | null;
    excludeUserId?: string | null;
}): Promise<void>;
export declare function notifyPortalChatMessage(params: {
    incidentId: string;
    incidentNumber: string;
    authorName: string;
    messagePreview: string;
    assignedTo: string | null;
}): Promise<void>;
export declare function notifyIncidentReassigned(params: {
    incidentId: string;
    incidentNumber: string;
    title: string;
    assigneeId: string;
    excludeUserId?: string | null;
}): Promise<void>;
//# sourceMappingURL=pushNotifications.d.ts.map