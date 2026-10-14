/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    environmentOptions: {
      // Même origine que `npm run dev` (port 5174) : le test d'intégration réel
      // (integration.smoke.test.tsx) envoie ainsi un Origin plausible à Supabase plutôt
      // que l'URL jsdom par défaut (about:blank), comme un vrai navigateur.
      jsdom: { url: 'http://localhost:5174' },
    },
    setupFiles: ['./src/test/setup.ts'],
  },
});
