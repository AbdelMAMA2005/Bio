import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { findUserByEmail, useUpdateUserStatus, useUsers } from './useUsers';
import { ApiError, supabase } from '../client';

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

/** Simule une réponse de supabase.rpc (data ou error PostgREST). */
function mockRpc(result: { data?: unknown; error?: { message: string; code: string } | null }) {
  return vi.spyOn(supabase, 'rpc').mockResolvedValue({ data: result.data ?? null, error: result.error ?? null } as never);
}

afterEach(() => vi.restoreAllMocks());

describe('useUsers', () => {
  it('appelle la RPC admin_users avec les bons paramètres et résout les avatars', async () => {
    const rpc = mockRpc({
      data: { items: [{ id: 'u1', nomUtilisateur: 'Alice', email: 'a@x.fr', urlAvatar: 'u1/avatar.jpg' }], total: 1 },
    });

    const { result } = renderHook(() => useUsers({ page: 2, limit: 20, q: 'alice', filtre: 'tous' }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(rpc).toHaveBeenCalledWith('admin_users', { p_page: 2, p_limit: 20, p_q: 'alice', p_filtre: 'tous' });
    expect(result.current.data?.total).toBe(1);
    expect(result.current.data?.items[0].urlAvatar).toMatch(/\/storage\/v1\/object\/public\/avatars\/u1\/avatar\.jpg$/);
  });

  it('transforme un refus de la base (42501) en ApiError 403', async () => {
    mockRpc({ error: { message: "Accès réservé à l'administration.", code: '42501' } });

    const { result } = renderHook(() => useUsers({ page: 1, limit: 20, filtre: 'tous' }), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).status).toBe(403);
  });
});

describe('useUpdateUserStatus', () => {
  it('appelle la RPC admin_set_user_suspended', async () => {
    const rpc = mockRpc({ data: null });

    const { result } = renderHook(() => useUpdateUserStatus(), { wrapper });
    result.current.mutate({ id: 'u1', suspendu: true });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(rpc).toHaveBeenCalledWith('admin_set_user_suspended', { p_user_id: 'u1', p_suspendu: true });
  });
});

describe('findUserByEmail', () => {
  it("ne renvoie que la correspondance exacte de l'e-mail, sans tenir compte de la casse", async () => {
    mockRpc({
      data: {
        items: [
          { id: 'u1', email: 'paul.martin@x.fr', urlAvatar: null },
          { id: 'u2', email: 'paul@x.fr', urlAvatar: null },
        ],
        total: 2,
      },
    });

    expect((await findUserByEmail(' Paul@X.fr '))?.id).toBe('u2');
  });
});
