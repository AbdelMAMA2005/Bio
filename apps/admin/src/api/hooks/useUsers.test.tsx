import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useUpdateUserStatus, useUsers } from './useUsers';
import { apiClient } from '../client';

vi.mock('../client', async () => {
  const actual = await vi.importActual<typeof import('../client')>('../client');
  return {
    ...actual,
    apiClient: { get: vi.fn(), patch: vi.fn(), post: vi.fn(), delete: vi.fn() },
  };
});

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useUsers', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.patch).mockReset();
  });

  it('appelle GET /admin/users avec les bons paramètres et renvoie la page', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { items: [{ id: 'u1', nomUtilisateur: 'Alice' }], total: 1 },
    });

    const { result } = renderHook(() => useUsers({ page: 2, limit: 20, q: 'alice', filtre: 'tous' }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiClient.get).toHaveBeenCalledWith('/admin/users', {
      params: { page: 2, limit: 20, q: 'alice', filtre: 'tous' },
    });
    expect(result.current.data?.total).toBe(1);
  });
});

describe('useUpdateUserStatus', () => {
  it('appelle PATCH /admin/users/:id/status avec le body attendu', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { id: 'u1', statut: 'suspendu' } });

    const { result } = renderHook(() => useUpdateUserStatus(), { wrapper });
    result.current.mutate({ id: 'u1', suspendu: true });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiClient.patch).toHaveBeenCalledWith('/admin/users/u1/status', { suspendu: true });
  });
});
