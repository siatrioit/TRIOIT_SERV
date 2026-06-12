import type { PortalAccessGrant } from '../store/portalAuthStore';

export function portalUserCanWrite(access: PortalAccessGrant[]): boolean {
  return access.some((g) => g.portal_role === 'operator' || g.portal_role === 'manager');
}
