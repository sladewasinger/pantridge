import console from 'node:console';
const { fetch } = globalThis;
const base = 'http://127.0.0.1:4176/v1/';
const headers = { Origin: 'http://127.0.0.1:5176', 'Sec-Fetch-Site': 'same-origin' };
const session = await fetch(`${base}dev/session?account=dev-alice`, { headers });
headers.Authorization = `Bearer ${(await session.json()).token}`;
const status = await (await fetch(`${base}dev/status`, { headers })).json();
if (status.mode !== 'real' || status.namespace !== 'real')
  throw new Error('Start dev:full --real-ai first.');
const inputs = [
  ['Eggs', 'Spinach', 'Cheddar cheese'],
  ['Cooked brown rice', 'Canned black beans', 'Salsa'],
  ['Dry penne pasta', 'Canned tomatoes', 'Olive oil'],
];
for (const names of inputs) {
  const body = {
    kind: 'recipe',
    useUp: false,
    inventory: names.map((name) => ({ name, useSoon: false })),
  };
  const begin = Date.now();
  const response = await fetch(`${base}products/resolve`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  console.log(
    JSON.stringify({
      model: status.model,
      status: response.status,
      elapsedMs: Date.now() - begin,
      result,
    }),
  );
  if (!response.ok || !Array.isArray(result.recipes)) throw new Error('Recipe smoke test failed.');
}
const after = await (await fetch(`${base}dev/status`, { headers })).json();
console.log(JSON.stringify({ providerCalls: after.calls - status.calls }));
