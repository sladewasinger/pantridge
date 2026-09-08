import { deploymentConfig } from './deployment-config.mjs';
import { run } from './run.mjs';

const output = await deploymentConfig();
run(process.execPath, ['node_modules/typescript/bin/tsc', '--noEmit']);
run(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
  env: { ...process.env, ...output.frontend_environment.value },
});
run(process.execPath, ['scripts/build-api.mjs']);
