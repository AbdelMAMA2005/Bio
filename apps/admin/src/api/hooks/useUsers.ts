import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminRole, AdminUser, AdminUsersPage } from '@planai/shared';
import { avatarUrl, rpc } from '../client';
import { queryKeys } from '../queryKeys';

export type UsersFilter = 'tous' | 'admins' | 'inactifs' | 'suspendus';

export type UsersQuery = {
  page: number;
  limit: number;
  q?: string;
  filtre: UsersFilter;
};

export async function fetchUsers(params: UsersQuery): Promise<AdminUsersPage> {
  const data = await rpc<AdminUsersPage>('admin_users', {
    p_page: params.page,
    p_limit: params.limit,
    p_q: params.q || null,
    p_filtre: params.filtre,
  });
  return { ...data, items: data.items.map((u) => ({ ...u, urlAvatar: avatarUrl(u.urlAvatar) })) };
}

/** Compte exact correspondant à un e-mail (pour « Inviter un admin »), ou null. */
export async function findUserByEmail(email: string): Promise<AdminUser | null> {
  const wanted = email.trim().toLowerCase();
  if (!wanted) return null;
  const { items } = await fetchUsers({ page: 1, limit: 20, q: wanted, filtre: 'tous' });
  return items.find((u) => u.email.toLowerCase() === wanted) ?? null;
}

export function useUsers(params: UsersQuery) {
  return useQuery({
    queryKey: queryKeys.users(params),
    queryFn: () => fetchUsers(params),
    placeholderData: (prev) => prev,
  });
}

function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    queryClient.invalidateQueries({ queryKey: queryKeys.auditLog });
  };
}

export function useUpdateUserRole() {
  const onSuccess = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: AdminRole }) =>
      rpc<void>('admin_set_user_role', { p_user_id: id, p_role: role }),
    onSuccess,
  });
}

export function useUpdateUserStatus() {
  const onSuccess = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, suspendu }: { id: string; suspendu: boolean }) =>
      rpc<void>('admin_set_user_suspended', { p_user_id: id, p_suspendu: suspendu }),
    onSuccess,
  });
}

export function useDeleteUser() {
  const onSuccess = useInvalidateUsers();
  return useMutation({
    mutationFn: (id: string) => rpc<void>('admin_delete_user', { p_user_id: id }),
    onSuccess,
  });
}
