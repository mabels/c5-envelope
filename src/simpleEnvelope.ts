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
  const hex = await createSHA256(JSON.stringify(env.data));
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

export async function createSHA256(message: string): Promise<string> {
  const text = new TextEncoder().encode(message);
  const crypto = new Crypto();
  const hashBuffer = await crypto.subtle.digest(
    'SHA-256', // SHA-1, SHA-256, SHA-384, or SHA-512
    text
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
  const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex;
}
