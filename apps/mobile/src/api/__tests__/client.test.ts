import { apiClient, setRefreshHandler, setUnauthorizedHandler } from '@/api/client';

/**
 * Teste directement le handler d'erreur enregistré sur `apiClient.interceptors.response`
 * (accédé via `handlers`, API interne d'axios mais stable et largement utilisée en test) —
 * évite de dépendre d'un serveur HTTP réel ou d'une lib de mock réseau supplémentaire pour
 * vérifier le comportement de renouvellement silencieux sur 401 (voir client.ts).
 */
function getResponseErrorHandler() {
  const handlers = (apiClient.interceptors.response as unknown as { handlers: { rejected: (error: unknown) => unknown }[] })
    .handlers;
  const last = handlers[handlers.length - 1];
  if (!last) throw new Error('No response interceptor registered');
  return last.rejected;
}

function makeAxiosError(status: number, url: string) {
  return {
    response: { status, data: {} },
    config: { url, headers: { set: jest.fn() } },
    message: 'Request failed',
    isAxiosError: true,
  };
}

describe('apiClient 401 handling', () => {
  afterEach(() => {
    setRefreshHandler(null);
    setUnauthorizedHandler(null);
    jest.restoreAllMocks();
  });

  it('retries the original request with a new access token after a successful silent refresh', async () => {
    const refreshHandler = jest.fn().mockResolvedValue('new-access-token');
    setRefreshHandler(refreshHandler);
    const unauthorizedHandler = jest.fn();
    setUnauthorizedHandler(unauthorizedHandler);
    const requestSpy = jest.spyOn(apiClient, 'request').mockResolvedValue({ data: 'ok' });

    const error = makeAxiosError(401, '/collection');
    const rejected = getResponseErrorHandler();
    const result = await rejected(error);

    expect(refreshHandler).toHaveBeenCalledTimes(1);
    expect(error.config.headers.set).toHaveBeenCalledWith('Authorization', 'Bearer new-access-token');
    expect(requestSpy).toHaveBeenCalledWith(error.config);
    expect(unauthorizedHandler).not.toHaveBeenCalled();
    expect(result).toEqual({ data: 'ok' });
  });

  it('falls back to logout when the silent refresh itself fails', async () => {
    const refreshHandler = jest.fn().mockResolvedValue(null);
    setRefreshHandler(refreshHandler);
    const unauthorizedHandler = jest.fn();
    setUnauthorizedHandler(unauthorizedHandler);

    const error = makeAxiosError(401, '/collection');
    const rejected = getResponseErrorHandler();

    await expect(rejected(error)).rejects.toMatchObject({ status: 401 });
    expect(unauthorizedHandler).toHaveBeenCalledTimes(1);
  });

  it('never attempts a silent refresh for a failed /auth/login call (real credential failure)', async () => {
    const refreshHandler = jest.fn();
    setRefreshHandler(refreshHandler);
    const unauthorizedHandler = jest.fn();
    setUnauthorizedHandler(unauthorizedHandler);

    const error = makeAxiosError(401, '/auth/login');
    const rejected = getResponseErrorHandler();

    await expect(rejected(error)).rejects.toMatchObject({ status: 401 });
    expect(refreshHandler).not.toHaveBeenCalled();
    expect(unauthorizedHandler).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent 401s into a single refresh call', async () => {
    let resolveRefresh!: (token: string) => void;
    const refreshHandler = jest.fn(
      () => new Promise<string | null>((resolve) => (resolveRefresh = resolve)),
    );
    setRefreshHandler(refreshHandler);
    jest.spyOn(apiClient, 'request').mockResolvedValue({ data: 'ok' });

    const rejected = getResponseErrorHandler();
    const first = rejected(makeAxiosError(401, '/collection'));
    const second = rejected(makeAxiosError(401, '/feed'));

    resolveRefresh('shared-token');
    await Promise.all([first, second]);

    expect(refreshHandler).toHaveBeenCalledTimes(1);
  });
});
