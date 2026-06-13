import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { portalUsersApi, PORTAL_ROLE_LABELS } from '../api/portalUsers';
import {
  ROLE_LABELS,
  usersApi,
  type CreateStaffUserPayload,
  type StaffUser,
  type UpdateStaffUserPayload,
} from '../api/users';
import { PortalUserModal } from '../components/users/PortalUserModal';
import { StaffUserModal } from '../components/users/StaffUserModal';
import { useAuthStore } from '../store/authStore';

type Tab = 'staff' | 'portal';

type StaffModalState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; user: StaffUser };

export function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === 'admin';
  const canView = isAdmin || currentUser?.role === 'manager';

  const [tab, setTab] = useState<Tab>('staff');
  const queryClient = useQueryClient();
  const [staffModal, setStaffModal] = useState<StaffModalState>({ open: false });
  const [portalUserId, setPortalUserId] = useState<string | null>(null);

  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
    enabled: canView && tab === 'staff',
  });

  const { data: portalData, isLoading: portalLoading } = useQuery({
    queryKey: ['portal-users'],
    queryFn: () => portalUsersApi.list(),
    enabled: canView && tab === 'portal',
  });

  if (!canView) {
    return <Navigate to="/" replace />;
  }

  const handleStaffSave = async (
    payload: CreateStaffUserPayload | UpdateStaffUserPayload
  ) => {
    if (staffModal.open && staffModal.mode === 'edit') {
      await usersApi.update(staffModal.user.id, payload as UpdateStaffUserPayload);
    } else {
      await usersApi.create(payload as CreateStaffUserPayload);
    }
    await queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  const staffUsers = staffData?.data ?? [];
  const portalUsers = portalData?.data ?? [];
  const selectedPortalUser = portalUsers.find((u) => u.id === portalUserId) ?? null;

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-medium text-gray-900">Lietotāji</h3>
          <p className="text-sm text-gray-500">
            {tab === 'staff' ? 'Darbinieku konti' : 'Klientu portāla konti'}
          </p>
        </div>
        {isAdmin && tab === 'staff' && (
          <button
            type="button"
            className="btn-primary !py-2 !px-4 !min-h-0 text-sm shrink-0"
            onClick={() => setStaffModal({ open: true, mode: 'create' })}
          >
            + Jauns
          </button>
        )}
      </div>

      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
        <button
          type="button"
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            tab === 'staff' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600'
          }`}
          onClick={() => setTab('staff')}
        >
          Darbinieki
        </button>
        <button
          type="button"
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            tab === 'portal' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600'
          }`}
          onClick={() => setTab('portal')}
        >
          Klientu portāls
        </button>
      </div>

      {tab === 'staff' ? (
        staffLoading ? (
          <div className="text-center py-8 text-gray-400">Ielādē...</div>
        ) : staffUsers.length === 0 ? (
          <div className="card text-center text-gray-500 py-8">Nav lietotāju</div>
        ) : (
          <ul className="space-y-3">
            {staffUsers.map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  onClick={() => isAdmin && setStaffModal({ open: true, mode: 'edit', user })}
                  disabled={!isAdmin}
                  className={`card w-full text-left ${
                    isAdmin ? 'hover:bg-gray-50 active:bg-gray-100' : 'cursor-default'
                  } transition-colors`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{user.full_name}</p>
                      <p className="text-sm text-gray-500 truncate">{user.email}</p>
                    </div>
                    <span className="text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded-lg shrink-0">
                      {ROLE_LABELS[user.role]}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : portalLoading ? (
        <div className="text-center py-8 text-gray-400">Ielādē...</div>
      ) : portalUsers.length === 0 ? (
        <div className="card text-center text-gray-500 py-8">
          Nav klientu portāla lietotāju. Piešķiriet pieeju klienta vai objekta kartīnē.
        </div>
      ) : (
        <ul className="space-y-3">
          {portalUsers.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                onClick={() => isAdmin && setPortalUserId(user.id)}
                disabled={!isAdmin}
                className={`card w-full text-left ${
                  isAdmin ? 'hover:bg-gray-50 active:bg-gray-100' : 'cursor-default'
                } transition-colors`}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{user.full_name}</p>
                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                    {user.access.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        {user.access
                          .map((a) => {
                            const place =
                              a.scope === 'client'
                                ? a.client_name
                                : `${a.client_name} / ${a.object_name}`;
                            return `${place} (${PORTAL_ROLE_LABELS[a.portal_role]})`;
                          })
                          .join(' · ')}
                      </p>
                    )}
                  </div>
                  {!user.is_active && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md shrink-0">
                      neaktīvs
                    </span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {isAdmin && (
        <StaffUserModal
          open={staffModal.open}
          mode={staffModal.open && staffModal.mode === 'edit' ? 'edit' : 'create'}
          initial={staffModal.open && staffModal.mode === 'edit' ? staffModal.user : null}
          onClose={() => setStaffModal({ open: false })}
          onSave={handleStaffSave}
        />
      )}

      {isAdmin && (
        <PortalUserModal
          open={Boolean(portalUserId)}
          user={selectedPortalUser}
          onClose={() => setPortalUserId(null)}
        />
      )}
    </div>
  );
}
