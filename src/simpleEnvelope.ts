import { Envelope } from '../schema/envelope';
import { Payload } from '../schema/payload';
import * as crypto from 'crypto';

export interface SimpleEnvelope<T = unknown> {
  readonly id?: string;
  readonly src: string;
  readonly dst?: string[];
  readonly t?: Date;
  readonly ttl?: number; //Limit the hop count
  readonly data: Payload<T>;
}

export function simpleEnvelope<T>(env: SimpleEnvelope<T>): Envelope<T> {
  const data = sortKeys(env.data);
  const date = env.t || new Date();
  const en: Envelope<T> = sortKeys({
    v: 'A',
    id: env.id || `${date.getTime()}-${hashIt(data)}`,
    src: env.src,
    dst: env.dst || [],
    t: date.getTime(),
    ttl: env.ttl || 10,
    data: { data: undefined as unknown as T, kind: 'dummy' },
  });
  // omit data double sort
  (en as { data: { data: T; kind: string } }).data = data;

  return en;
}

export function lexicalSort(a: number | string, b: number | string): number {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}

export function sortKeys<T>(e: T): T {
  if (Array.isArray(e)) {
    return e.reduce((r, i) => {
      r.push(sortKeys(i));
      return r;
    }, []);
  } else if (typeof e === 'object') {
    return Array.from(Object.keys(e))
      .sort(lexicalSort)
      .reduce((r: Record<string, unknown>, i) => {
        r[i] = sortKeys((e as any)[i]);
        return r;
      }, {}) as T;
  } else {
    return e;
  }
}

function hashUpdate<T>(e: T, hash: crypto.Hash): T {
  if (Array.isArray(e)) {
    return e.reduce((r, i) => {
      r.push(hashUpdate(i, hash));
      return r;
    }, []);
  } else if (typeof e === 'object') {
    return Object.keys(e).reduce((r: Record<string, unknown>, i) => {
      hash.update(i);
      r[i] = hashUpdate((e as any)[i], hash);
      return r;
    }, {}) as T;
  } else {
    hash.update('' + e);
    return e;
  }
}

export function hashIt<T>(e: T, hash: crypto.Hash = crypto.createHash('sha256')): string {
  hashUpdate(e, hash);
  return hash.digest('hex');
}

export function serializeSorted(
  message: Envelope,
  opts?: { multiline: boolean }
): string {
  let input = sortKeys(message);
  return (opts?.multiline) ? JSON.stringify(input, null, 2) : JSON.stringify(input);
}
