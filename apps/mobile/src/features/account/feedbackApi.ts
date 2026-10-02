import { supabase } from '@/lib/supabase';

export type FeedbackKind = 'suggestion' | 'report';
export type FeedbackErrorCode = 'unavailable' | 'rate_limited' | 'unauthorized' | 'invalid' | 'failed';

export class FeedbackError extends Error {
  constructor(public code: FeedbackErrorCode) { super(code); }
}

export async function sendFeedback(kind: FeedbackKind, message: string, requestId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('send-feedback', {
    body: { kind, message: message.trim(), requestId },
  });
  if (error) {
    let code: FeedbackErrorCode = 'failed';
    try {
      const response = error.context as Response;
      const body = await response.clone().json();
      if (['unavailable', 'rate_limited', 'unauthorized', 'invalid'].includes(body?.code)) code = body.code;
      else if (response.status === 401) code = 'unauthorized';
    } catch { /* Network failures have no HTTP response. */ }
    throw new FeedbackError(code);
  }
  if (data?.sent !== true) throw new FeedbackError('failed');
}
