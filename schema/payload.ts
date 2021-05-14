export interface Payload<T> {
  readonly kind: string;
  readonly data: T;
}

