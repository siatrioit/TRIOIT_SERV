import { portalApi } from './portalClient';
import type { PortalAccessGrant, PortalObject } from '../store/portalAuthStore';

export interface PortalLoginResponse {
  data: {
    token: string;
    user: {
      id: string;
      email: string;
      full_name: string;
      phone?: string | null;
    };
    access: PortalAccessGrant[];
    objects: PortalObject[];
  };
}

export const portalAuthApi = {
  login: (email: string, password: string) =>
    portalApi.post<PortalLoginResponse>('/auth/login', { email, password }),

  me: () =>
    portalApi.get<{
      data: {
        user: PortalLoginResponse['data']['user'];
        access: PortalAccessGrant[];
        objects: PortalObject[];
      };
    }>('/auth/me'),
};
