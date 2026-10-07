import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

export const matchHash = (value: unknown) =>
  bytesToHex(sha256(new TextEncoder().encode(JSON.stringify(value))));
