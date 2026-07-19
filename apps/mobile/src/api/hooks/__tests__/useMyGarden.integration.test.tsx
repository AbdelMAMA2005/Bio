import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';

import type { BackendCollectionItem } from '@/api/adapters';
import { apiClient } from '@/api/client';
import { useCheckHealth, useMyGarden } from '@/api/hooks/useMyGarden';
import { AuthProvider } from '@/features/auth/AuthProvider';

jest.mock('@/api/client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

const mockedGet = apiClient.get as jest.Mock;

const backendGarden: BackendCollectionItem[] = [
  {
    id: 'col-monstera',
    idPlante: 'plant-monstera',
    nomScientifique: 'Monstera deliciosa',
    nomCommun: 'Monstera Deliciosa',
    badgeRarete: 'Commun',
    toxicite: 'green',
    etatSante: 'green',
    dateAjout: '2026-06-01T00:00:00.000Z',
    urlImage: null,
    latitude: null,
    longitude: null,
  },
  {
    id: 'col-lavande',
    idPlante: 'plant-lavande',
    nomScientifique: 'Lavandula angustifolia',
    nomCommun: 'Lavande vraie',
    badgeRarete: 'Commun',
    toxicite: 'green',
    etatSante: 'red',
    dateAjout: '2026-05-01T00:00:00.000Z',
    urlImage: null,
    latitude: null,
    longitude: null,
  },
];

const testUser = { id: 'user-1', pseudo: 'Testeur', email: 'test@planai.app', niveau: 1, xp: 0 };

let queryClient: QueryClient;
let wrapper: (props: { children: ReactNode }) => ReactElement;

beforeEach(() => {
  mockedGet.mockReset();
  // gcTime: 0 + retry: false keep queries from scheduling timers that outlive the test.
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider initialUser={testUser}>{children}</AuthProvider>
    </QueryClientProvider>
  );
});

afterEach(() => {
  queryClient.clear();
});

describe('useMyGarden (integration: hook + real API client, HTTP layer mocked)', () => {
  it('requests GET /collection?type=owned and adapts the backend response into GardenClone[]', async () => {
    mockedGet.mockResolvedValueOnce({ data: backendGarden });

    const { result, unmount } = await renderHook(() => useMyGarden(), { wrapper });

    expect(result.current.isPending).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedGet).toHaveBeenCalledWith('/collection', { params: { type: 'owned' } });
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0]).toMatchObject({
      item: { id: 'col-monstera', idUtilisateur: 'user-1', etatSante: 'sain' },
      plant: { nomCommun: 'Monstera Deliciosa', toxicite: 'non_toxique' },
    });
    // etatSante "red" from the backend must be mapped to the front's "malade".
    expect(result.current.data?.[1].item.etatSante).toBe('malade');

    unmount();
  });

  it('surfaces a network failure as an error state instead of throwing', async () => {
    mockedGet.mockRejectedValueOnce(new Error('Network Error'));

    const { result, unmount } = await renderHook(() => useMyGarden(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    unmount();
  });
});

describe('useCheckHealth (integration: mutation + garden query invalidation)', () => {
  it('diagnoses the lavande clone as sick and refreshes the garden query', async () => {
    mockedGet.mockResolvedValue({ data: backendGarden });

    const garden = await renderHook(() => useMyGarden(), { wrapper });
    await waitFor(() => expect(garden.result.current.isSuccess).toBe(true));

    const mutation = await renderHook(() => useCheckHealth(), { wrapper });

    mutation.result.current.mutate('plant-lavande');

    await waitFor(() => expect(mutation.result.current.isSuccess).toBe(true));
    expect(mutation.result.current.data).toMatchObject({ status: 'disease', diseaseName: 'Septoriose' });

    expect(mockedGet).toHaveBeenCalledTimes(2); // initial fetch + refetch triggered by invalidation

    garden.unmount();
    mutation.unmount();
  });
});
