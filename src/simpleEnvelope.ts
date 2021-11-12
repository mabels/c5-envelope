import { Envelope } from "../schema/envelope";
import { Payload } from "../schema/payload";
import * as crypto from "crypto";
import baseX from 'base-x';

const bs58 = baseX('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz')

export interface SimpleEnvelope<T = unknown> {
  readonly id?: string;
  readonly src: string;
  readonly dst?: string[];
  readonly t?: Date;
  readonly ttl?: number; //Limit the hop count
  readonly data: Payload<T>;
}

interface KeyValue {
  readonly key?: string;
  readonly val?: string;
}

export class ObjCollector {
  public result: any = undefined;
  public current: any[] = [];
  public assign_val(stack: any[], kv: KeyValue) {
    const last = this.current[this.current.length - 1];
    if (Array.isArray(last)) {
      last.push(kv.val);
    } else if (typeof last == "object") {
    } else {
    }
  }
  public append(sval: SVal) {
    if (sval.outState) {
      switch (sval.outState) {
        case OutState.ARRAY_START:
          this.current.push([]);
          break;

        case OutState.OBJECT_START:
          this.current.push({});
          break;

        case OutState.OBJECT_END:
        case OutState.ARRAY_END:
          this.current.pop();
          break;
      }
    }
    if (sval.val) {
      // assign_val(this.current, sval.val);
    }
    if (sval.attribute) {
      // this.assign_val(this.current, )
    }
  }
}

type OutputFn = (str: string) => void;

export class JsonCollector {
  readonly output: OutputFn;
  readonly indent: string;
  readonly commas: string[] = [""];
  readonly elements: number[] = [0];
  readonly nextLine: string;
  attribute?: string;
  // state: OutState = OutState.NONE;
  // suffix: string = "";

  constructor(output: OutputFn, indent: number = 0) {
    this.output = output;
    this.indent = Array(indent).fill(" ").join("");
    this.nextLine = indent ? "\n" : "";
  }

  public get suffix(): string {
    // console.log(">", this.elements);
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
    // console.log(JSON.stringify(sval))
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
          // this.suffix = this.nextLine + Array(this.commas.length - 1).fill(this.indent).join("");
          this.elements.push(0);
          break;

        case OutState.ARRAY_END:
          this.commas.pop();
          this.output(this.suffix + "]");
          this.elements.pop();
          // this.suffix = (this.elements[this.elements.length - 1] ? this.nextLine : "") + Array(this.commas.length - 1).fill(this.indent).join("");
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
          // this.suffix = this.nextLine + Array(this.commas.length - 1).fill(this.indent).join("");
          this.elements.push(0);
          break;

        case OutState.OBJECT_END:
          this.commas.pop();
          this.output(this.suffix + "}");
          this.elements.pop();
          // this.suffix = (this.elements[this.elements.length - 1] ? this.nextLine : "") + Array(this.commas.length - 1).fill(this.indent).join("");
          break;
      }
    }
    if (sval.val) {
      // console.log(`COMMA=${this.commas}=SUFFIX=${JSON.stringify(this.suffix)}`)
      ++this.elements[this.elements.length - 1];
      this.output(
        this.commas[this.commas.length - 1] +
          this.suffix +
          (this.attribute || "") +
          JSON.stringify(sval.val)
      );
      this.attribute = undefined;
      // this.suffix = (this.elements[this.elements.length - 1] ? this.nextLine : "") + Array(this.commas.length - 1).fill(this.indent).join("");
      this.commas[this.commas.length - 1] = ",";
      // }
    }
    if (sval.attribute) {
      ++this.elements[this.elements.length - 1];
      this.attribute =
        JSON.stringify(sval.attribute) + ":" + (this.indent.length ? " " : "");
      // this.output(this.commas[this.commas.length -1]  + this.suffix + JSON.stringify(sval.attribute)  + ":" + (this.indent.length ? " " : ""));
      // this.isAttributes.push(",");
    }
  }
}


export class HashCollector {
  readonly hash: crypto.Hash = crypto.createHash("sha256");

  constructor() {
  }

  public digest() {
    return bs58.encode(this.hash.digest());
  }

  public append(sval: SVal) {
    if (sval.outState) {
      return;
    }
    if (sval.val) {
      let out: string;
      if (sval.val instanceof Date) {
        out = sval.val.toISOString();
      } else {
        out = "" + sval.val;
      }
      // We need some room for the types
      this.hash.update(Buffer.from(out, "utf-8"));
    } 
    if (sval.attribute) {
      this.hash.update(Buffer.from(sval.attribute, "utf-8"));
    }
  }
}

export function simpleEnvelope<T>(env: SimpleEnvelope<T>): Envelope<T> {
  // sortKeys(env.data);
  // const date = env.t || new Date();
  // const en: Envelope<T> = sortKeys({
  //   v: 'A',
  //   id: env.id || `${date.getTime()}-${hashIt(data)}`,
  //   src: env.src,
  //   dst: env.dst || [],
  //   t: date.getTime(),
  //   ttl: env.ttl || 10,
  //   data: { data: undefined as unknown as T, kind: 'dummy' },
  // });
  // // omit data double sort
  // (en as { data: { data: T; kind: string } }).data = data;

  // return en;
  throw Error("not ready simpleEnvelope");
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

type ValType = string | number | boolean | Date;

enum OutState {
  NONE = "NE",
  ARRAY_START = "AS",
  ARRAY_END = "AE",
  OBJECT_START = "OS",
  OBJECT_END = "OE",
}

interface SVal {
  readonly attribute?: string;
  attributeStr?: string;
  readonly val?: ValType;
  valStr?: string;
  readonly outState?: OutState;
}

export function sortKeys<T>(e: T, out: (prob: SVal) => void): void {
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
    out({ val: e as unknown as ValType });
    return;
  }
}

function hashUpdate<T>(e: T, hash: crypto.Hash): T {
  if (Array.isArray(e)) {
    return e.reduce((r, i) => {
      r.push(hashUpdate(i, hash));
      return r;
    }, []);
  } else if (typeof e === "object") {
    return Object.keys(e).reduce((r: Record<string, unknown>, i) => {
      hash.update(i);
      r[i] = hashUpdate((e as any)[i], hash);
      return r;
    }, {}) as T;
  } else {
    hash.update("" + e);
    return e;
  }
}

export function hashIt<T>(
  e: T,
  hash: crypto.Hash = crypto.createHash("sha256")
): string {
  hashUpdate(e, hash);
  return hash.digest("hex");
}

export function serializeSorted(
  message: Envelope,
  opts?: { multiline: boolean }
): string {
  // let input = sortKeys(message);
  // return (opts?.multiline) ? JSON.stringify(input, null, 2) : JSON.stringify(input);
  throw Error("not ready");
}
