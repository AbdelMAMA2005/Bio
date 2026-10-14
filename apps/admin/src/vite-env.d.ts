/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SMOKE_ADMIN_EMAIL?: string;
  readonly VITE_SMOKE_ADMIN_PASSWORD?: string;
}
