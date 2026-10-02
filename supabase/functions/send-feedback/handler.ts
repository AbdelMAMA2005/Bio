type Kind = 'suggestion' | 'report';
export type Feedback = {
  id: string; user_id: string; kind: Kind; message: string;
  sender_name: string; sender_email: string; created_at: string; email_status: string;
};
export type Dependencies = {
  env: (name: string) => string | undefined;
  authenticate: (authorization: string) => Promise<{ id: string } | null>;
  reserve: (authorization: string, id: string, kind: Kind, message: string) => Promise<{
    data: Feedback | null; error: { message: string; code?: string } | null;
  }>;
  markSent: (id: string, emailId: string) => Promise<void>;
  fetch: typeof fetch;
};
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, 'Content-Type': 'application/json' },
});

export function createFeedbackHandler(deps: Dependencies) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    if (req.method !== 'POST') return reply({ code: 'invalid' }, 405);
    try {
      const authorization = req.headers.get('Authorization');
      if (!authorization) return reply({ code: 'unauthorized' }, 401);
      const user = await deps.authenticate(authorization);
      if (!user) return reply({ code: 'unauthorized' }, 401);
      const text = await req.text();
      if (text.length > 20000) return reply({ code: 'invalid' }, 413);
      let body;
      try { body = JSON.parse(text); } catch { return reply({ code: 'invalid' }, 400); }
      const message = typeof body?.message === 'string' ? body.message.trim() : '';
      if (!['suggestion', 'report'].includes(body?.kind) || message.length < 10 || message.length > 3000 ||
          typeof body?.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.requestId)) {
        return reply({ code: 'invalid' }, 400);
      }
      const apiKey = deps.env('RESEND_API_KEY');
      const from = deps.env('FEEDBACK_FROM_EMAIL');
      const to = deps.env('FEEDBACK_TO_EMAIL');
      if (!apiKey || !from || !to) return reply({ code: 'unavailable' }, 503);
      const { data: feedback, error } = await deps.reserve(authorization, body.requestId, body.kind, message);
      if (error) {
        if (error.message === 'rate_limited') return reply({ code: 'rate_limited' }, 429);
        if (error.code === '22023') return reply({ code: 'invalid' }, 400);
        return reply({ code: 'failed' }, 500);
      }
      if (!feedback || feedback.user_id !== user.id) return reply({ code: 'failed' }, 500);
      if (feedback.email_status === 'sent') return reply({ sent: true });
      const subject = feedback.kind === 'suggestion' ? 'Suggestion - PlantAI' : 'Report - PlantAI';
      const response = await deps.fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `plantai-feedback/${feedback.id}` },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          from, to: [to], subject,
          ...(feedback.sender_email ? { reply_to: feedback.sender_email } : {}),
          text: `${subject}\n\n${feedback.message}\n\n---\nAuteur : ${feedback.sender_name}\nE-mail : ${feedback.sender_email}\nDate : ${feedback.created_at}\nRéférence : ${feedback.id}`,
        }),
      });
      // Never forward provider errors: they can contain the private recipient address.
      if (!response.ok) return reply({ code: response.status === 429 ? 'rate_limited' : 'failed' }, response.status === 429 ? 429 : 502);
      const delivery = await response.json();
      if (typeof delivery?.id !== 'string') return reply({ code: 'failed' }, 502);
      await deps.markSent(feedback.id, delivery.id);
      return reply({ sent: true });
    } catch {
      return reply({ code: 'failed' }, 500);
    }
  };
}
