import process from 'node:process';
import { connectedConfiguration } from '../local/config.mjs';

export function cleanEnvironment() {
  const environment = { ...process.env };
  for (const name of Object.keys(environment))
    if (
      /^(AWS_|VITE_|CLASSIFIER_|STANDARDIZATION_|API_ENABLED$|TABLE_NAME$|PRODUCT_TABLE$|ACCESS_TABLE$|LOCAL_|PANTRIDGE_)/.test(
        name,
      )
    )
      delete environment[name];
  return environment;
}
export async function serverEnvironment(mode, testing, model, reasoning) {
  const configuration = mode === 'real' ? await connectedConfiguration() : undefined;
  const prefix = `pantridge-local-${mode}${testing ? '-test' : ''}`;
  return {
    ...cleanEnvironment(),
    ...configuration?.server,
    ...(model ? { CLASSIFIER_MODEL: model } : {}),
    ...(reasoning ? { CLASSIFIER_REASONING_EFFORT: reasoning } : {}),
    LOCAL_FULL_MODE: mode,
    LOCAL_FULL_TEST: String(testing),
    TABLE_NAME: `${prefix}-kitchen`,
    ACCESS_TABLE: `${prefix}-access`,
    PRODUCT_TABLE: `${prefix}-products`,
    AWS_REGION: configuration?.server.AWS_REGION ?? 'us-west-2',
    AWS_EC2_METADATA_DISABLED: 'true',
    STANDARDIZATION_ENABLED: 'true',
    STANDARDIZATION_REASONING_EFFORT:
      reasoning ?? configuration?.server.STANDARDIZATION_REASONING_EFFORT ?? 'medium',
    API_ENABLED: 'true',
    ...(!configuration
      ? {
          CLASSIFIER_PROVIDER: 'fixture',
          CLASSIFIER_MODEL: 'local-fixture-v1',
          AWS_ACCESS_KEY_ID: 'localdevelopment',
          AWS_SECRET_ACCESS_KEY: 'localdevelopment',
        }
      : {}),
  };
}
