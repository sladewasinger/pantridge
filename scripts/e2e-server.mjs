import { spawnSync, spawn } from 'node:child_process';

// A production build with public test endpoints lets browser tests exercise real
// OIDC session handling without credentials, auth bypasses, or live kitchen data.
const vite = 'node_modules/vite/bin/vite.js';
const build = spawnSync(process.execPath, [vite, 'build', '--outDir', 'artifacts/e2e-web'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_API_URL: 'https://api.pantridge.test',
    VITE_AUTHORITY: 'https://auth.pantridge.test',
    VITE_CLIENT_ID: 'pantridge-test',
    VITE_IDENTITY_PROVIDER: 'Google',
  },
});
if (build.status !== 0) throw new Error('Browser test build failed.');
const server = spawn(
  process.execPath,
  [vite, 'preview', '--outDir', 'artifacts/e2e-web', '--host', '127.0.0.1', '--port', '4174'],
  { stdio: 'inherit' },
);
process.on('SIGTERM', () => {
  server.kill();
  process.exit();
});
