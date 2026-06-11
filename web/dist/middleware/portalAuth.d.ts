import { Request, Response, NextFunction } from 'express';
import { type PortalAccessGrant } from '../services/portalScope';
export interface PortalAuthPayload {
    type: 'portal';
    portalUserId: string;
    email: string;
}
declare global {
    namespace Express {
        interface Request {
            portalUser?: PortalAuthPayload & {
                access: PortalAccessGrant[];
            };
        }
    }
}
export declare function authenticatePortal(req: Request, _res: Response, next: NextFunction): void;
//# sourceMappingURL=portalAuth.d.ts.map