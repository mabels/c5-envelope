import { Envelope } from "../schema/envelope";
import { Payload } from "../schema/payload";
import * as crypto from "crypto";
import baseX from "base-x";

const bs58 = baseX(
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
);

interface JsonProps {
  readonly indent: number;
  readonly newLine: string;
}

export interface SimpleEnvelopeProps<T = unknown> {
  readonly id?: string;
  readonly src: string;
  readonly dst?: string[];
  readonly t?: Date;
  readonly ttl?: number; //Limit the hop count
  readonly data: Payload<T>;
  readonly jsonProp?: Partial<JsonProps>;
}

type OutputFn = (str: string) => void;

export class JsonCollector {
  readonly output: OutputFn;
  readonly indent: string;
  readonly commas: string[] = [""];
  readonly elements: number[] = [0];
  readonly props: JsonProps;
  readonly nextLine: string;
  attribute?: string;

  constructor(output: OutputFn, props: Partial<JsonProps> = {}) {
    this.output = output;
    this.props = {
      indent: props.indent || 0,
      newLine: props.newLine || "\n",
      ...props,
    };
    this.indent = Array(this.props.indent).fill(" ").join("");
    this.nextLine = this.props.indent ? this.props.newLine : "";
  }

  public get suffix(): string {
    if (this.elements[this.elements.length - 1]) {
      return (
        this.nextLine +
        Array(this.commas.length - 1)
          .fill(this.indent)
          .join("")
      );
    } else {
      return "";
    }
  }

  public append(sval: SVal) {
    if (sval.outState) {
      switch (sval.outState) {
        case OutState.ARRAY_START:
          this.output(
            this.commas[this.commas.length - 1] +
              this.suffix +
              (this.attribute || "") +
              "["
          );
          this.attribute = undefined;
          this.commas[this.commas.length - 1] = ",";
          this.commas.push("");
          this.elements.push(0);
          break;

        case OutState.ARRAY_END:
          this.commas.pop();
          this.output(this.suffix + "]");
          this.elements.pop();
          break;

        case OutState.OBJECT_START:
          this.output(
            this.commas[this.commas.length - 1] +
              this.suffix +
              (this.attribute || "") +
              "{"
          );
          this.attribute = undefined;
          this.commas[this.commas.length - 1] = ",";
          this.commas.push("");
          this.elements.push(0);
          break;

        case OutState.OBJECT_END:
          this.commas.pop();
          this.output(this.suffix + "}");
          this.elements.pop();
          break;
      }
    }
    if (sval.val) {
      ++this.elements[this.elements.length - 1];
      const out =
        this.commas[this.commas.length - 1] +
        this.suffix +
        (this.attribute || "") +
        sval.val.toString();
      // console.log(this.commas, this.attribute, sval.val, out);
      this.output(out);
      this.attribute = undefined;
      this.commas[this.commas.length - 1] = ",";
      // }
    }
    if (sval.attribute) {
      ++this.elements[this.elements.length - 1];
      this.attribute =
        JSON.stringify(sval.attribute) + ":" + (this.indent.length ? " " : "");
    }
  }
}

export class HashCollector {
  readonly hash: crypto.Hash = crypto.createHash("sha256");

  constructor() {}

  public digest() {
    return bs58.encode(this.hash.digest());
  }

  public append(sval: SVal) {
    if (sval.outState) {
      return;
    }
    if (sval.attribute) {
      const tmp = Buffer.from(sval.attribute).toString('utf-8')
      console.log('attribute=', tmp)
      this.hash.update(tmp);
    }
    if (sval.val) {
      let out: any = sval.val.asValue();
      if (out instanceof Date) {
        out = out.toISOString()
      } else {
        out = "" + out;
      }
      console.log('val=', out)
      // We need some room for the types
      this.hash.update(Buffer.from(out).toString("utf-8"));
    }
  }
}

export interface JsonHash {
  readonly jsonStr: string;
  readonly hash?: string;
}

export class SimpleEnvelope<T> {
  readonly simpleEnvelopeProps: SimpleEnvelopeProps<T>;
  readonly envJsonStrings: string[] = [];
  readonly envJsonC: JsonCollector;
  public envelope?: Envelope<T>;
  public dataJsonHash?: JsonHash;

  constructor(env: SimpleEnvelopeProps<T>) {
    this.simpleEnvelopeProps = env;
    this.envJsonC = new JsonCollector(
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

  private toDataJson(): JsonHash {
    const dataJsonStrings: string[] = [];
    const dataJsonC = new JsonCollector((part) => dataJsonStrings.push(part), {
      ...this.simpleEnvelopeProps.jsonProp,
      // "data": { "data": { this stuff } } ==> 2
      newLine:
        "\n" +
        Array(2 * ((this.simpleEnvelopeProps.jsonProp || {}).indent || 0))
          .fill(" ")
          .join(""),
    });
    let dataHashC: HashCollector = undefined as unknown as HashCollector;
    let dataProcessor: SValFn;
    if (this.simpleEnvelopeProps.id) {
      dataProcessor = (sval) => {
        dataJsonC.append(sval);
      };
    } else {
      dataHashC = new HashCollector();
      dataProcessor = (sval: SVal) => {
        console.log("dataP:", sval);
        dataHashC.append(sval);
        dataJsonC.append(sval);
      };
    }
    sortKeys(this.simpleEnvelopeProps.data.data, dataProcessor);
    return {
      jsonStr: dataJsonStrings.join(""),
      hash: dataHashC ? dataHashC.digest() : undefined,
    };
  }

  public lazy() {
    this.dataJsonHash = this.toDataJson();
    const date = this.simpleEnvelopeProps.t || new Date();
    const envelope: Envelope<T> = {
      v: "A",
      id:
        this.simpleEnvelopeProps.id ||
        `${date.getTime()}-${this.dataJsonHash.hash}`,
      src: this.simpleEnvelopeProps.src,
      dst: this.simpleEnvelopeProps.dst || [],
      t: date.getTime(),
      ttl: this.simpleEnvelopeProps.ttl || 10,
      data: {
        ...this.simpleEnvelopeProps.data,
        data: undefined as unknown as T,
      },
    };
    let nextValue = false;
    sortKeys(envelope, (sval) => {
      let oval = sval;
      if (sval.attribute === "data") {
        nextValue = true;
      } else if (nextValue) {
        if (sval.val && sval.val.asValue() === undefined) {
          oval = {
            ...sval,
            val: new PlainValType(this.asDataJson()),
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
        data: envelope.data.data,
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

export function lexicalSort(a: number | string, b: number | string): number {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}

type ValueType = string | number | boolean | Date | undefined;

interface ValType {
  toString(): string;
  asValue(): any;
}

class JsonValType implements ValType {
  readonly val: ValueType;

  constructor(val: ValueType) {
    this.val = val;
  }

  public asValue() {
    return this.val;
  }

  public toString() {
    return JSON.stringify(this.val);
  }
}

class PlainValType implements ValType {
  readonly val: string;

  constructor(val: string) {
    this.val = val;
  }

  public asValue() {
    return this.val;
  }

  public toString() {
    return this.val;
  }
}

enum OutState {
  NONE = "NE",
  ARRAY_START = "AS",
  ARRAY_END = "AE",
  OBJECT_START = "OS",
  OBJECT_END = "OE",
}

interface SVal {
  readonly attribute?: string;
  readonly val?: ValType;
  readonly outState?: OutState;
}

type SValFn = (prob: SVal) => void;

export function sortKeys<T>(e: T, out: SValFn): void {
  if (Array.isArray(e)) {
    out({ outState: OutState.ARRAY_START });
    e.forEach((i) => {
      sortKeys(i, out);
    });
    out({ outState: OutState.ARRAY_END });
    return;
  } else if (typeof e === "object" && !(e instanceof Date)) {
    out({ outState: OutState.OBJECT_START });
    Object.keys(e)
      .sort(lexicalSort)
      .forEach((i) => {
        out({ attribute: i });
        sortKeys((e as any)[i], out);
      });
    out({ outState: OutState.OBJECT_END });
    return;
  } else {
    out({ val: new JsonValType(e as unknown as ValueType) });
    return;
  }
}
