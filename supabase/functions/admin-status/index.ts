import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createAdminStatusHandler } from './handler.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

Deno.serve(createAdminStatusHandler({
  env: (name) => Deno.env.get(name),
  staffRole: async (authorization) => {
    const client = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.rpc('admin_me');
    return error ? null : (data?.role ?? null);
  },
}));
