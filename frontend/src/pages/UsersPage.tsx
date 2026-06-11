import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import {
  ROLE_LABELS,
  usersApi,
  type CreateStaffUserPayload,
  type StaffUser,
  type UpdateStaffUserPayload,
} from '../api/users';
import { StaffUserModal } from '../components/users/StaffUserModal';
import { useAuthStore } from '../store/authStore';

type ModalState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; user: StaffUser };

export function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === 'admin';
  const canView = isAdmin || currentUser?.role === 'manager';

  const queryClient = useQueryClient();
  const [modal, setModal] = useState<ModalState>({ open: false });

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
    enabled: canView,
  });

  if (!canView) {
    return <Navigate to="/" replace />;
  }

  const handleSave = async (
    payload: CreateStaffUserPayload | UpdateStaffUserPayload
  ) => {
    try {
      if (modal.open && modal.mode === 'edit') {
        await usersApi.update(modal.user.id, payload as UpdateStaffUserPayload);
      } else {
        await usersApi.create(payload as CreateStaffUserPayload);
      }
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err) {
      throw err;
    }
  };

  const users = data?.data ?? [];

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Lietotāji</h2>
          <p className="text-sm text-gray-500">Darbinieku konti mūsu panelī</p>
        </div>
        {isAdmin && (
          <button
            type="button"
            className="btn-primary !py-2 !px-4 !min-h-0 text-sm shrink-0"
            onClick={() => setModal({ open: true, mode: 'create' })}
          >
            + Jauns
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Ielādē...</div>
      ) : users.length === 0 ? (
        <div className="card text-center text-gray-500 py-8">Nav lietotāju</div>
      ) : (
        <ul className="space-y-3">
          {users.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                onClick={() => isAdmin && setModal({ open: true, mode: 'edit', user })}
                disabled={!isAdmin}
                className={`card w-full text-left ${
                  isAdmin ? 'hover:bg-gray-50 active:bg-gray-100' : 'cursor-default'
                } transition-colors`}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{user.full_name}</p>
                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                    {user.phone && <p className="text-sm text-gray-400">{user.phone}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded-lg">
                      {ROLE_LABELS[user.role]}
                    </span>
                    {!user.is_active && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                        neaktīvs
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {isAdmin && (
        <StaffUserModal
          open={modal.open}
          mode={modal.open && modal.mode === 'edit' ? 'edit' : 'create'}
          initial={modal.open && modal.mode === 'edit' ? modal.user : null}
          onClose={() => setModal({ open: false })}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
