import { localServer } from './server';
import { localProductRequest } from './handler';
import { observeProvider } from './observe';

if (
  process.env.TABLE_NAME ||
  process.env.ACCESS_TABLE ||
  process.env.PRODUCT_TABLE !== 'local-only'
)
  throw new Error('Production data configuration is not allowed in the local API.');
observeProvider();
const server = localServer(localProductRequest, 'http://127.0.0.1:5175');
server.requestTimeout = 25_000;
server.headersTimeout = 10_000;
server.listen(4175, '127.0.0.1', () => console.log('Isolated local API ready.'));
