import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminRole, AdminUsersPage } from '@planai/shared';
import { apiClient } from '../client';
import { queryKeys } from '../queryKeys';

export type UsersFilter = 'tous' | 'admins' | 'inactifs' | 'suspendus';

export type UsersQuery = {
  page: number;
  limit: number;
  q?: string;
  filtre: UsersFilter;
};

export function useUsers(params: UsersQuery) {
  return useQuery({
    queryKey: queryKeys.users(params),
    queryFn: async () => {
      const { data } = await apiClient.get<AdminUsersPage>('/admin/users', { params });
      return data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: AdminRole }) => {
      const { data } = await apiClient.patch(`/admin/users/${id}/role`, { role });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, suspendu }: { id: string; suspendu: boolean }) => {
      const { data } = await apiClient.patch(`/admin/users/${id}/status`, { suspendu });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/admin/users/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}
