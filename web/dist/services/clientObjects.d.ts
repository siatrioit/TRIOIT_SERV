import type { ClientObject } from '../models/types';
import type { ClientObjectInput } from '../schemas/clientObject';
export declare function listClientObjects(clientId: string): Promise<ClientObject[]>;
export declare function insertClientObject(clientId: string, input: ClientObjectInput, createdBy?: string): Promise<ClientObject>;
export declare function updateClientObject(clientId: string, objectId: string, input: Partial<ClientObjectInput>): Promise<ClientObject | null>;
export declare function syncClientObjects(clientId: string, objects: ClientObjectInput[], createdBy?: string): Promise<ClientObject[]>;
//# sourceMappingURL=clientObjects.d.ts.map