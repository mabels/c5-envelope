
import { Payload } from './payload';

export interface Envelope<T = unknown> {
  readonly v: 'A'; // version never ever change, chuck norris rules this
  readonly id: string;
  readonly src: string;
  readonly dst: string[];
  readonly t: number; //UTC Nanoseconds since 1970
  readonly ttl: number; //Limit the hop count
  readonly data: Payload<T>;
}
