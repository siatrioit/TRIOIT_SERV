import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PortalAccessGrant = {
  id: string;
  client_id: string;
  object_id: string | null;
  scope: 'client' | 'object';
  portal_role?: 'viewer' | 'operator' | 'manager';
  client_name: string;
  object_name?: string | null;
};

export type PortalObject = {
  id: string;
  client_id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  object_code?: string | null;
  status: string;
};

interface PortalUser {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
}

interface PortalAuthState {
  token: string | null;
  user: PortalUser | null;
  access: PortalAccessGrant[];
  objects: PortalObject[];
  setAuth: (
    token: string,
    user: PortalUser,
    access: PortalAccessGrant[],
    objects: PortalObject[]
  ) => void;
  setSession: (access: PortalAccessGrant[], objects: PortalObject[]) => void;
  logout: () => void;
}

export const usePortalAuthStore = create<PortalAuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      access: [],
      objects: [],
      setAuth: (token, user, access, objects) => set({ token, user, access, objects }),
      setSession: (access, objects) => set({ access, objects }),
      logout: () => set({ token: null, user: null, access: [], objects: [] }),
    }),
    { name: 'trio-serv-portal-auth' }
  )
);
