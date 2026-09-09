export class AccessError extends Error {
  constructor(
    public status: number,
    message: string,
    public retryAfter = 0,
  ) {
    super(message);
  }
}
export function limit(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < 1)
    throw new Error(`Invalid access configuration: ${name}`);
  return value;
}
export function assertEnabled() {
  if (process.env.API_ENABLED === 'false')
    throw new AccessError(503, 'Cloud features are paused. Your local kitchen still works.', 300);
}
export function assertActive(status: unknown) {
  if (status !== 'active')
    throw new AccessError(
      403,
      'This account is suspended. Contact the app owner to restore cloud access.',
    );
}
