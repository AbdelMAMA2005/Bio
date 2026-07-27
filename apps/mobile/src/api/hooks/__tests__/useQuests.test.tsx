import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';

import { apiClient } from '@/api/client';
import { useQuests } from '@/api/hooks/useQuests';
import { AuthProvider } from '@/features/auth/AuthProvider';

jest.mock('@/api/client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
  setUnauthorizedHandler: jest.fn(),
}));

const mockedGet = apiClient.get as jest.Mock;

const testUser = { id: 'user-1', pseudo: 'Testeur', email: 'test@planai.app', niveau: 1, xp: 0, pieces: 15 };

const backendQuests = [
  { id: 'scan-3', libelle: 'Scanner 3 plantes différentes', type: 'quotidien' as const, progression: 1, objectif: 3, complete: false, recompense: { xp: 0, pieces: 0 } },
  { id: 'add-garden', libelle: 'Ajouter une nouvelle plante à son Jardin', type: 'quotidien' as const, progression: 1, objectif: 1, complete: true, recompense: { xp: 20, pieces: 0 } },
  { id: 'publish-tip', libelle: "Publier une photo avec un conseil d'entretien", type: 'quotidien' as const, progression: 0, objectif: 1, complete: false, recompense: { xp: 0, pieces: 0 } },
  { id: 'get-5-likes', libelle: 'Recevoir 5 likes sur une publication', type: 'quotidien' as const, progression: 0, objectif: 5, complete: false, recompense: { xp: 0, pieces: 0 } },
];

let queryClient: QueryClient;
let wrapper: (props: { children: ReactNode }) => ReactElement;

beforeEach(() => {
  mockedGet.mockReset();
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider initialUser={testUser}>{children}</AuthProvider>
    </QueryClientProvider>
  );
});

afterEach(() => {
  queryClient.clear();
});

describe('useQuests (integration: GET /quests/daily réel, plus de données démo codées en dur)', () => {
  it('calls GET /quests/daily and maps the real backend progression/completion/reward', async () => {
    mockedGet.mockImplementation((url: string) => {
      if (url === '/quests/daily') return Promise.resolve({ data: backendQuests });
      if (url === '/users/me') return Promise.resolve({ data: { ...testUser, nomUtilisateur: testUser.pseudo, experience: testUser.xp, insignes: [] } });
      return Promise.reject(new Error(`unexpected url ${url}`));
    });

    const { result } = renderHook(() => useQuests(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedGet).toHaveBeenCalledWith('/quests/daily');
    expect(result.current.data?.quests).toHaveLength(4);

    const addGarden = result.current.data?.quests.find((q) => q.id === 'add-garden');
    expect(addGarden).toMatchObject({ done: true, rewardXp: 20, rewardCoins: undefined, label: 'quests.addGarden' });

    const scan3 = result.current.data?.quests.find((q) => q.id === 'scan-3');
    expect(scan3).toMatchObject({ done: false, label: 'quests.scan3' });
  });

  it('uses the real i18n key for each known quest id instead of the raw French backend libelle', async () => {
    mockedGet.mockImplementation((url: string) => {
      if (url === '/quests/daily') return Promise.resolve({ data: backendQuests });
      return Promise.resolve({ data: { ...testUser, nomUtilisateur: testUser.pseudo, experience: testUser.xp, insignes: [] } });
    });

    const { result } = renderHook(() => useQuests(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.quests.map((q) => q.label)).toEqual([
      'quests.scan3',
      'quests.addGarden',
      'quests.postTip',
      'quests.get5Likes',
    ]);
  });

  it('falls back to the raw backend libelle for an unknown quest id (future catalog addition)', async () => {
    mockedGet.mockImplementation((url: string) => {
      if (url === '/quests/daily') {
        return Promise.resolve({
          data: [{ id: 'future-quest', libelle: 'Un nouveau défi', type: 'quotidien', progression: 0, objectif: 1, complete: false, recompense: { xp: 0, pieces: 0 } }],
        });
      }
      return Promise.resolve({ data: { ...testUser, nomUtilisateur: testUser.pseudo, experience: testUser.xp, insignes: [] } });
    });

    const { result } = renderHook(() => useQuests(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.quests[0].label).toBe('Un nouveau défi');
  });

  it('exposes the coins balance from the authenticated user, not a fixed demo value', async () => {
    mockedGet.mockImplementation((url: string) => {
      if (url === '/quests/daily') return Promise.resolve({ data: backendQuests });
      return Promise.resolve({ data: { ...testUser, nomUtilisateur: testUser.pseudo, experience: testUser.xp, insignes: [] } });
    });

    const { result } = renderHook(() => useQuests(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.coins).toBe(15); // testUser.pieces, pas un solde fixe (340 dans le mock)
  });

  it('refreshes the user profile after fetching quests, since a reward may just have been credited server-side', async () => {
    mockedGet.mockImplementation((url: string) => {
      if (url === '/quests/daily') return Promise.resolve({ data: backendQuests });
      return Promise.resolve({ data: { ...testUser, nomUtilisateur: testUser.pseudo, experience: testUser.xp, insignes: [] } });
    });

    const { result } = renderHook(() => useQuests(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() => expect(mockedGet).toHaveBeenCalledWith('/users/me'));
  });
});
