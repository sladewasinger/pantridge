import { DynamoDBClient as RealClient, type DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { fullConfiguration, localEndpoint } from './config';
export * from '@aws-sdk/client-dynamodb';
// Only the development bundler substitutes this client. There is no production flag for it.
export class DynamoDBClient extends RealClient {
  constructor(configuration: DynamoDBClientConfig) {
    fullConfiguration();
    super({
      ...configuration,
      endpoint: localEndpoint,
      region: 'us-west-2',
      credentials: { accessKeyId: 'localdevelopment', secretAccessKey: 'localdevelopment' },
    });
  }
}
