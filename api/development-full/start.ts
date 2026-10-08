import { fullServer, tick } from './server';
import { fullPorts } from './config';
const server = fullServer();
server.requestTimeout = 25_000;
server.headersTimeout = 10_000;
const run = () => {
  void tick().catch(() => console.error('Local worker failed; persisted jobs remain available.'));
};
const timer = setInterval(run, 60_000);
server.listen(fullPorts().api, '127.0.0.1', () => {
  console.log('Full local API ready.');
  run();
});
const stop = () => {
  clearInterval(timer);
  server.close();
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
