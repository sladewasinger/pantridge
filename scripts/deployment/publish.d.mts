export type Execute = (
  command: string,
  args: string[],
  options?: { encoding: string; stdio: string },
) => string;
export function publishWeb(
  destination: { bucket: string; distribution: string },
  execute?: Execute,
): void;
