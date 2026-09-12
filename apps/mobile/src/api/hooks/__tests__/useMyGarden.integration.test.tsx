import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';

import type { BackendCollectionItem } from '@/api/adapters';
import { apiClient } from '@/api/client';
import { useCheckHealth, useMyGarden } from '@/api/hooks/useMyGarden';
import { AuthProvider } from '@/features/auth/AuthProvider';

jest.mock('@/api/client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
  setUnauthorizedHandler: jest.fn(),
  setRefreshHandler: jest.fn(),
}));

const mockedGet = apiClient.get as jest.Mock;
const mockedPost = apiClient.post as jest.Mock;

const backendGarden: BackendCollectionItem[] = [
  {
    id: 'col-monstera',
    idPlante: 'plant-monstera',
    nomScientifique: 'Monstera deliciosa',
    nomCommun: 'Monstera Deliciosa',
    famille: 'Araceae',
    badgeRarete: 'Commun',
    toxicite: 'green',
    etatSante: 'green',
    dateAjout: '2026-06-01T00:00:00.000Z',
    urlImage: null,
    aPropos: null,
    conseilsEntretien: null,
    latitude: null,
    longitude: null,
    prochainArrosage: '2026-07-01T00:00:00.000Z',
  },
  {
    id: 'col-lavande',
    idPlante: 'plant-lavande',
    nomScientifique: 'Lavandula angustifolia',
    nomCommun: 'Lavande vraie',
    famille: 'Lamiaceae',
    badgeRarete: 'Commun',
    toxicite: 'green',
    etatSante: 'red',
    dateAjout: '2026-05-01T00:00:00.000Z',
    urlImage: null,
    aPropos: null,
    conseilsEntretien: null,
    latitude: null,
    longitude: null,
    prochainArrosage: '2026-07-01T00:00:00.000Z',
  },
];

const testUser = { id: 'user-1', pseudo: 'Testeur', email: 'test@planai.app', niveau: 1, xp: 0, pieces: 0, urlAvatar: null };

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
  it('requests GET /collection?type=owned&page=1&limit=20 and adapts the backend response into GardenClone[]', async () => {
    mockedGet.mockResolvedValueOnce({ data: { items: backendGarden, total: backendGarden.length } });

    const { result, unmount } = await renderHook(() => useMyGarden(), { wrapper });

    expect(result.current.isPending).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedGet).toHaveBeenCalledWith('/collection', { params: { type: 'owned', page: 1, limit: 20 } });
    expect(result.current.data).toHaveLength(2);
    expect(result.current.hasNextPage).toBe(false);
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
  it('calls POST /collection/:id/diagnosis, adapts the response, and refreshes the garden query', async () => {
    mockedGet.mockResolvedValue({ data: { items: backendGarden, total: backendGarden.length } });
    mockedPost.mockResolvedValueOnce({
      data: {
        estSain: false,
        probabiliteSante: 0.3,
        suggestions: [
          {
            id: 'disease-1',
            nom: 'Septoriose',
            probabilite: 0.91,
            estNuisible: true,
            traitement: { biologique: 'Retirer les feuilles atteintes.' },
          },
        ],
        scoreGlobal: 91,
      },
    });

    const garden = await renderHook(() => useMyGarden(), { wrapper });
    await waitFor(() => expect(garden.result.current.isSuccess).toBe(true));

    const mutation = await renderHook(() => useCheckHealth(), { wrapper });

    mutation.result.current.mutate({
      collectionId: 'col-lavande',
      idPlante: 'plant-lavande',
      photoUri: 'file:///tmp/leaf.jpg',
    });

    await waitFor(() => expect(mutation.result.current.isSuccess).toBe(true));
    // La photo de la feuille (prise par l'utilisateur, cahier des charges "Détection de
    // maladies") est envoyée en multipart — sans elle, le back n'a rien à analyser pour
    // une plante sans historique de photos.
    expect(mockedPost).toHaveBeenCalledWith(
      '/collection/col-lavande/diagnosis',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    expect(mutation.result.current.data).toMatchObject({ status: 'disease', diseaseName: 'Septoriose', confidence: 91 });

    expect(mockedGet).toHaveBeenCalledTimes(2); // initial fetch + refetch triggered by invalidation

    garden.unmount();
    mutation.unmount();
  });
});
