import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';

import { apiClient } from '@/api/client';
import { useBadges } from '@/api/hooks/useBadges';

jest.mock('@/api/client', () => ({
  apiClient: { get: jest.fn() },
}));

const mockedGet = apiClient.get as jest.Mock;

let queryClient: QueryClient;
let wrapper: (props: { children: ReactNode }) => ReactElement;

beforeEach(() => {
  mockedGet.mockReset();
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
});

describe('useBadges (integration: GET /users/me -> catalogue croisé avec insignes)', () => {
  it('marks catalog badges present in the backend insignes as obtained', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { id: 'u1', email: 'a@b.com', nomUtilisateur: 'Djawad', experience: 0, niveau: 1, insignes: ['botaniste-debutant'] },
    });

    const { result } = renderHook(() => useBadges(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedGet).toHaveBeenCalledWith('/users/me');
    const obtained = result.current.data?.find((b) => b.id === 'botaniste-debutant');
    expect(obtained?.obtenuLe).not.toBeNull();
    const locked = result.current.data?.find((b) => b.obtenuLe === null);
    expect(locked).toBeDefined();
  });

  it('returns every badge locked when the backend has no insignes yet', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { id: 'u1', email: 'a@b.com', nomUtilisateur: 'Djawad', experience: 0, niveau: 1, insignes: [] },
    });

    const { result } = renderHook(() => useBadges(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.every((b) => b.obtenuLe === null)).toBe(true);
  });
});
