import { Envelope } from '../schema/envelope';
import { Crypto } from '@peculiar/webcrypto';

export async function simpleEnvelope<T>(env: Partial<Envelope<T>>): Promise<Envelope<T>> {
  const data = Buffer.from(JSON.stringify(env.data),"utf-8");
  const crypto = new Crypto();
  const hex = await crypto.subtle.digest(
  "SHA-256", // SHA-1, SHA-256, SHA-384, or SHA-512
  data
);
  const date = new Date();
  const id = `${date.getTime()}-${hex}`;
  return {
    src: '',
    data: env.data,
    id,
    v: 'A',
    ttl: 16,
    t: date.getTime(),
    dst: [],
    ...env,
  };
}
