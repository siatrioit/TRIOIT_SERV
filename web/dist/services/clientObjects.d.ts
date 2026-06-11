import type { ClientObject } from '../models/types';
import type { ClientObjectInput } from '../schemas/clientObject';
export type ObjectStatus = 'active' | 'closed';
type ClientObjectRow = ClientObject & {
    incident_count?: number;
};
export declare function countObjectIncidents(objectId: string): Promise<number>;
export declare function listClientObjects(clientId: string, status?: ObjectStatus): Promise<ClientObjectRow[]>;
export declare function getClientObject(clientId: string, objectId: string): Promise<ClientObjectRow | null>;
export declare function insertClientObject(clientId: string, input: ClientObjectInput, createdBy?: string): Promise<ClientObject>;
export declare function updateClientObject(clientId: string, objectId: string, input: Partial<ClientObjectInput>): Promise<ClientObject | null>;
export declare function closeClientObject(clientId: string, objectId: string): Promise<ClientObject | null>;
export declare function reopenClientObject(clientId: string, objectId: string): Promise<ClientObject | null>;
export declare function deleteClientObject(clientId: string, objectId: string): Promise<void>;
export declare function syncClientObjects(clientId: string, objects: ClientObjectInput[], createdBy?: string): Promise<ClientObject[]>;
export {};
//# sourceMappingURL=clientObjects.d.ts.map