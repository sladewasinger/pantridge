export const localEndpoint = 'http://127.0.0.1:8006';
export const localAccounts = ['dev-alice', 'dev-bob'] as const;
export const fullPorts = () =>
  process.env.LOCAL_FULL_TEST === 'true'
    ? { api: 4178, devices: [5178, 5179] }
    : { api: 4176, devices: [5176, 5177] };
export const localOrigins = () => fullPorts().devices.map((port) => `http://127.0.0.1:${port}`);
export function fullConfiguration() {
  const mode = process.env.LOCAL_FULL_MODE;
  if (!['fixture', 'real'].includes(mode ?? '')) throw new Error('Full local mode is required.');
  if (process.env.LOCAL_FULL_TEST === 'true' && mode !== 'fixture')
    throw new Error('Tests require fixture AI.');
  const namespace = `${mode}${process.env.LOCAL_FULL_TEST === 'true' ? '-test' : ''}`;
  const prefix = `pantridge-local-${namespace}`;
  const tables = {
    TABLE_NAME: `${prefix}-kitchen`,
    ACCESS_TABLE: `${prefix}-access`,
    PRODUCT_TABLE: `${prefix}-products`,
  };
  for (const [name, expected] of Object.entries(tables))
    if (process.env[name] !== expected) throw new Error('Full local table configuration rejected.');
  return { mode, tables, namespace };
}
