import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createFeedbackHandler } from './handler.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const clientFor = (authorization: string) => createClient(url, anonKey, {
  global: { headers: { Authorization: authorization } },
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve(createFeedbackHandler({
  env: (name) => Deno.env.get(name),
  authenticate: async (authorization) => {
    const { data, error } = await clientFor(authorization).auth.getUser();
    return error ? null : data.user;
  },
  reserve: async (authorization, id, kind, message) => {
    const { data, error } = await clientFor(authorization).rpc('reserve_app_feedback', {
      p_id: id, p_kind: kind, p_message: message,
    });
    return { data, error };
  },
  markSent: async (id, emailId) => {
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await admin.from('app_feedback').update({
      email_status: 'sent', email_id: emailId, sent_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) throw error;
  },
  fetch,
}));
