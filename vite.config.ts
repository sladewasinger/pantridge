import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve, dirname } from 'node:path';
import { buildMarker } from './scripts/deployment/build-marker';

export default defineConfig(({ command }) => {
  const full = process.env.PANTRIDGE_FULL === 'true';
  const testing = process.env.PANTRIDGE_FULL_TEST === 'true';
  const origins = testing
    ? ['127.0.0.1:5178', '127.0.0.1:5179']
    : ['127.0.0.1:5176', '127.0.0.1:5177'];
  if (full && command !== 'serve')
    throw new Error('Full local mode cannot produce a release build.');
  return {
    server:
      full || process.env.PANTRIDGE_LOCAL_CONNECTED === 'true'
        ? {
            proxy: {
              '/api': {
                target: full
                  ? `http://127.0.0.1:${testing ? 4178 : 4176}`
                  : 'http://127.0.0.1:4175',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ''),
                configure: (proxy) => {
                  if (!full) return;
                  proxy.on('proxyReq', (outgoing, incoming) => {
                    const host = incoming.headers.host;
                    if (!incoming.headers.origin && origins.includes(host ?? ''))
                      outgoing.setHeader('Origin', `http://${host}`);
                  });
                },
              },
            },
          }
        : undefined,
    plugins: [
      ...(full
        ? [
            {
              name: 'full-local-session',
              enforce: 'pre' as const,
              resolveId(source: string, importer?: string) {
                if (importer && resolve(dirname(importer), source) === resolve('src/auth/session'))
                  return resolve('src/development/full/session.ts');
              },
            },
          ]
        : []),
      react(),
      buildMarker(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['icon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'Pantridge',
          short_name: 'Pantridge',
          description: 'Your kitchen, at a glance.',
          theme_color: '#f7f2e6',
          background_color: '#f7f2e6',
          display: 'standalone',
          start_url: '/',
          icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          navigateFallbackDenylist: [/^\/api/],
          cleanupOutdatedCaches: true,
        },
      }),
    ],
  };
});
