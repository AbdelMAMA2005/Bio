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
      // Même origine que `npm run dev` (port 5174) : le CORS dev de l'API
      // (apps/api/src/main.ts, `devLanOrigin`) laisse passer localhost:*, mais le test
      // d'intégration réel (integration.smoke.test.tsx) doit envoyer un Origin plausible,
      // pas l'URL jsdom par défaut (about:blank), pour se comporter comme un vrai navigateur.
      jsdom: { url: 'http://localhost:5174' },
    },
    setupFiles: ['./src/test/setup.ts'],
  },
});
