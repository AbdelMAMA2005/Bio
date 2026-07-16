import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';

import { useCheckHealth, useMyGarden } from '@/api/hooks/useMyGarden';
import { gardenClones } from '@/api/mock/store';

let queryClient: QueryClient;
let wrapper: (props: { children: ReactNode }) => ReactElement;

beforeEach(() => {
  // gcTime: 0 + retry: false keep queries from scheduling timers that outlive the test.
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
});

afterEach(() => {
  queryClient.clear();
});

describe('useMyGarden (integration: hook + mock API layer)', () => {
  it('loads the garden clones from the mock store', async () => {
    const { result, unmount } = await renderHook(() => useMyGarden(), { wrapper });

    expect(result.current.isPending).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(gardenClones.length);
    expect(result.current.data?.[0].plant.nomCommun).toBe(gardenClones[0].plant.nomCommun);

    unmount();
  });
});

describe('useCheckHealth (integration: mutation + garden query invalidation)', () => {
  it('diagnoses the lavande clone as sick and refreshes the garden query', async () => {
    const garden = await renderHook(() => useMyGarden(), { wrapper });
    await waitFor(() => expect(garden.result.current.isSuccess).toBe(true));

    const mutation = await renderHook(() => useCheckHealth(), { wrapper });

    mutation.result.current.mutate('plant-lavande');

    await waitFor(() => expect(mutation.result.current.isSuccess).toBe(true));
    expect(mutation.result.current.data).toMatchObject({ status: 'disease', diseaseName: 'Septoriose' });

    await waitFor(() => {
      const clone = garden.result.current.data?.find((c) => c.item.idPlante === 'plant-lavande');
      expect(clone?.item.etatSante).toBe('malade');
    });

    garden.unmount();
    mutation.unmount();
  });
});
