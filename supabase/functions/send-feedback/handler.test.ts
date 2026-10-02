import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFeedbackHandler, type Dependencies, type Feedback } from './handler.ts';

const id = '11111111-1111-4111-8111-111111111111';
const feedback: Feedback = {
  id, user_id: 'user-1', kind: 'suggestion', message: 'Ajouter un calendrier des plantes.',
  sender_name: 'Camille', sender_email: 'camille@example.com',
  created_at: '2026-09-30T16:00:00Z', email_status: 'pending',
};
const request = (body: unknown = { requestId: id, kind: 'suggestion', message: feedback.message }) =>
  new Request('https://example.test/send-feedback', {
    method: 'POST', headers: { Authorization: 'Bearer user-token' }, body: JSON.stringify(body),
  });

function setup(overrides: Partial<Dependencies> = {}) {
  const calls: { url: string; payload: any; headers: Headers }[] = [];
  const marked: string[] = [];
  const secrets: Record<string, string> = {
    RESEND_API_KEY: 'test-key', FEEDBACK_FROM_EMAIL: 'PlantAI <support@example.com>',
    FEEDBACK_TO_EMAIL: 'owner@example.com',
  };
  const handler = createFeedbackHandler({
    env: (name) => secrets[name],
    authenticate: async () => ({ id: 'user-1' }),
    reserve: async (_auth, _id, kind, message) => ({ data: { ...feedback, kind, message }, error: null }),
    markSent: async (feedbackId) => { marked.push(feedbackId); },
    fetch: async (url, init) => {
      calls.push({ url: String(url), payload: JSON.parse(String(init?.body)), headers: new Headers(init?.headers) });
      return new Response(JSON.stringify({ id: 'email-1' }), { status: 200 });
    },
    ...overrides,
  });
  return { handler, calls, marked };
}

test('both categories use searchable subjects and the private server recipient', async () => {
  for (const [kind, subject] of [['suggestion', 'Suggestion - PlantAI'], ['report', 'Report - PlantAI']]) {
    const { handler, calls, marked } = setup();
    const response = await handler(request({ requestId: id, kind, message: feedback.message, to: 'attacker@example.com' }));
    assert.equal(response.status, 200);
    const body = await response.text();
    assert.deepEqual(JSON.parse(body), { sent: true });
    assert.ok(!body.includes('owner@example.com'));
    assert.equal(calls[0].payload.subject, subject);
    assert.deepEqual(calls[0].payload.to, ['owner@example.com']);
    assert.equal(calls[0].payload.reply_to, feedback.sender_email);
    assert.ok(calls[0].payload.text.includes(feedback.message));
    assert.equal(calls[0].headers.get('Idempotency-Key'), `plantai-feedback/${id}`);
    assert.deepEqual(marked, [id]);
  }
});
test('requires a valid authenticated user before sending', async () => {
  const { handler, calls } = setup({ authenticate: async () => null });
  assert.equal((await handler(request())).status, 401);
  assert.equal(calls.length, 0);
});
test('rejects invalid categories, empty messages and oversized messages', async () => {
  for (const body of [
    { requestId: id, kind: 'other', message: feedback.message },
    { requestId: id, kind: 'report', message: '   ' },
    { requestId: id, kind: 'report', message: 'x'.repeat(3001) },
    { requestId: 'invalid', kind: 'report', message: feedback.message },
  ]) {
    const { handler, calls } = setup();
    assert.equal((await handler(request(body))).status, 400);
    assert.equal(calls.length, 0);
  }
});
test('does not claim success when mail secrets are missing', async () => {
  const { handler, calls } = setup({ env: () => undefined });
  const response = await handler(request());
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { code: 'unavailable' });
  assert.equal(calls.length, 0);
});
test('rate limits stop mail before calling the provider', async () => {
  const { handler, calls } = setup({ reserve: async () => ({ data: null, error: { message: 'rate_limited' } }) });
  assert.equal((await handler(request())).status, 429);
  assert.equal(calls.length, 0);
});
test('retries of a completed request return success without another email', async () => {
  const { handler, calls } = setup({ reserve: async () => ({ data: { ...feedback, email_status: 'sent' }, error: null }) });
  assert.deepEqual(await (await handler(request())).json(), { sent: true });
  assert.equal(calls.length, 0);
});
test('provider errors never disclose the recipient or claim success', async () => {
  const { handler, marked } = setup({ fetch: async () => new Response('Unable to send to owner@example.com', { status: 403 }) });
  const response = await handler(request());
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { code: 'failed' });
  assert.equal(marked.length, 0);
});
test('a network failure remains a failure', async () => {
  const { handler, marked } = setup({ fetch: async () => { throw new Error('Offline'); } });
  assert.equal((await handler(request())).status, 500);
  assert.equal(marked.length, 0);
});
