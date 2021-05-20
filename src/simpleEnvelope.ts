import { Envelope } from '../schema/envelope';
import { Payload } from '../schema/payload';
import { Crypto } from '@peculiar/webcrypto';

export interface SimpleEnvelope<T = unknown> {
  readonly id?: string;
  readonly src: string;
  readonly dst?: string[];
  readonly t?: Date;
  readonly ttl?: number; //Limit the hop count
  readonly data: Payload<T>;
}

export interface SimpleEnvelope {}

export async function simpleEnvelope<T>(env: SimpleEnvelope<T>): Promise<Envelope<T>> {
  const data = Buffer.from(JSON.stringify(env.data), 'utf-8');
  const crypto = new Crypto();
  const hex = await crypto.subtle.digest(
    'SHA-256', // SHA-1, SHA-256, SHA-384, or SHA-512
    data
  );

  const date = env.t || new Date();
  const id = `${date.getTime()}-${hex}`;
  return {
    v: 'A',
    id: env.id || id,
    src: env.src,
    dst: Array.isArray(env.dst) ? env.dst : [],
    t: date.getTime(),
    ttl: env.ttl || 10,
    data: env.data,
  };
}
