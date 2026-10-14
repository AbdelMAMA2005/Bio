import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAdminStatusHandler, type Dependencies } from './handler.ts';

const request = (authorization: string | null = 'Bearer token') =>
  new Request('https://example.test/admin-status', {
    method: 'POST', headers: authorization ? { Authorization: authorization } : {},
  });

const setup = (overrides: Partial<Dependencies> = {}) => createAdminStatusHandler({
  env: (name) => ({ PLANTNET_API_KEY: 'secret-plantnet', GEMINI_API_KEY: '  ' } as Record<string, string>)[name],
  staffRole: async () => 'admin',
  ...overrides,
});

test('refuse une requête sans jeton', async () => {
  assert.equal((await setup()(request(null))).status, 401);
});

test('refuse un membre qui n\'est pas dans l\'équipe', async () => {
  const res = await setup({ staffRole: async () => null })(request());
  assert.equal(res.status, 403);
});

test('indique la présence des clés sans jamais renvoyer leur valeur', async () => {
  const res = await setup()(request());
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.ok(!text.includes('secret-plantnet'));
  const { keys } = JSON.parse(text);
  assert.deepEqual(keys.map((k: { env: string; status: string }) => [k.env, k.status]), [
    ['PLANTNET_API_KEY', 'connecte'],
    ['GEMINI_API_KEY', 'absent'],
    ['RESEND_API_KEY', 'absent'],
  ]);
});

test('accepte un modérateur', async () => {
  assert.equal((await setup({ staffRole: async () => 'moderateur' })(request())).status, 200);
});
