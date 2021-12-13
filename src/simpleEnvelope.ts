import { Envelope } from "../schema/envelope";
import { Payload } from "../schema/payload";
import * as ogs from "object-graph-streamer";

export interface GeneratorProps<T = unknown> {
  readonly simpleEnvelopeProps: SimpleEnvelopeProps<T>;
  readonly hash: string;
  readonly t: number;
}

export interface SimpleEnvelopeProps<T = unknown> {
  readonly id?: string;
  readonly src: string;
  readonly dst?: string[];
  readonly t?: Date | number;
  readonly ttl?: number; //Limit the hop count
  readonly data: Payload<T>;
  readonly jsonProp?: Partial<ogs.JsonProps>;
  readonly idGenerator?: (props: GeneratorProps<T>) => string;
}

export function tHashIdGenerator<T>(props: GeneratorProps<T>) {
  return `${props.t}-${props.hash}`;
}

export function hashIdGenerator<T>(props: GeneratorProps<T>) {
  return props.hash;
}

export class SimpleEnvelope<T> {
  readonly simpleEnvelopeProps: SimpleEnvelopeProps<T>;
  readonly envJsonStrings: string[] = [];
  readonly envJsonC: ogs.JsonCollector;
  public envelope?: Envelope<T>;
  public dataJsonHash?: ogs.JsonHash;

  constructor(env: SimpleEnvelopeProps<T>) {
    this.simpleEnvelopeProps = {
      ...env,
      idGenerator: env.idGenerator ? env.idGenerator : tHashIdGenerator
    }
    this.envJsonC = new ogs.JsonCollector(
      (part) => this.envJsonStrings.push(part),
      this.simpleEnvelopeProps.jsonProp
    );
  }

  public asDataJson(): string {
    return this.dataJsonHash!.jsonStr;
  }

  public asJson(): string {
    const str = this.lazy().envJsonStrings.join("");
    // Caution
    this.asJson = () => str;
    return str;
  }

  public asEnvelope(): Envelope<T> {
    // Caution
    this.asEnvelope = () => this.envelope!;
    return this.lazy().envelope!;
  }

  private toDataJson(): ogs.JsonHash {
    const dataJsonStrings: string[] = [];
    const dataJsonC = new ogs.JsonCollector((part) => dataJsonStrings.push(part), {
      ...this.simpleEnvelopeProps.jsonProp,
      // "data": { "data": { this stuff } } ==> 2
      newLine:
        "\n" +
        Array(2 * ((this.simpleEnvelopeProps.jsonProp || {}).indent || 0))
          .fill(" ")
          .join(""),
    });
    let dataHashC: ogs.HashCollector = undefined as unknown as ogs.HashCollector;
    let dataProcessor: ogs.SValFn;
    if (this.simpleEnvelopeProps.id) {
      dataProcessor = (sval: ogs.SVal) => {
        dataJsonC.append(sval);
      };
    } else {
      dataHashC = new ogs.HashCollector();
      dataProcessor = (sval: ogs.SVal) => {
        // console.log("dataP:", sval);
        dataHashC.append(sval);
        dataJsonC.append(sval);
      };
    }
    ogs.objectGraphStreamer(this.simpleEnvelopeProps.data.data, dataProcessor);
    // da muss das hin
    return {
      jsonStr: dataJsonStrings.join(""),
      hash: dataHashC ? dataHashC.digest() : undefined,
    };
  }

  public lazy() {
    this.dataJsonHash = this.toDataJson();
    let t: number;
    if (this.simpleEnvelopeProps.t instanceof Date) {
      t = this.simpleEnvelopeProps.t.getTime();
    } else {
      t = this.simpleEnvelopeProps.t || (new Date()).getTime();
    }
    const envelope: Envelope<T> = {
      v: "A",
      id:
        this.simpleEnvelopeProps.id || this.simpleEnvelopeProps.idGenerator!({
          t, hash: this.dataJsonHash.hash!, simpleEnvelopeProps: this.simpleEnvelopeProps
          }),
      src: this.simpleEnvelopeProps.src,
      dst: this.simpleEnvelopeProps.dst || [],
      t: t,
      ttl: this.simpleEnvelopeProps.ttl || 10,
      data: {
        ...this.simpleEnvelopeProps.data,
        data: undefined as unknown as T,
      },
    };
    let nextValue = false;
    ogs.objectGraphStreamer(envelope, (sval: ogs.SVal) => {
      let oval = sval;
      if (sval.attribute === "data") {
        nextValue = true;
      } else if (nextValue) {
        if (sval.val && sval.val.asValue() === undefined) {
          oval = {
            ...sval,
            val: new ogs.PlainValType(this.asDataJson()),
          };
        }
        nextValue = false;
      }
      this.envJsonC.append(oval);
    });
    this.envelope = {
      ...envelope,
      data: {
        ...envelope.data,
        data: this.simpleEnvelopeProps.data.data
      },
    };
    // Caution
    this.lazy = () => this;
    return this;
  }
}

export function simpleEnvelope<T>(
  env: SimpleEnvelopeProps<T>
): SimpleEnvelope<T> {
  return new SimpleEnvelope(env);
}
