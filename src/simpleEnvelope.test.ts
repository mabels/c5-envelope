import {
  simpleEnvelope,
  hashIt,
  sortKeys,
  SimpleEnvelope,
  serializeSorted,
  JsonCollector,
  HashCollector,
} from "./simpleEnvelope";
import { Envelope } from "../schema/envelope";
import { assert } from "console";

beforeAll(() => {
  // Lock Time
  jest.useFakeTimers("modern");
  jest.setSystemTime(new Date(2021, 5, 20));
  // jest.spyOn(Date, 'now').mockImplementation(() => 1487076708000);
});

it("test simple sha256 creation", () => {
  expect.assertions(2);

  const expectedHash =
    "3f0a377ba0a4a460ecb616f6507ce0d8cfa3e704025d4fda3ed0c5ca05468728";
  expect(hashIt("test message")).toEqual(expectedHash);
  expect(hashIt("t\u0065\u0073t m\u0065\u0073\u0073ag\u0065")).toEqual(
    expectedHash
  );
});

it("test simple envelope", () => {
  expect.assertions(3);

  const data = {
    kind: "test",
    data: { name: "object", date: "2021-05-20" },
  };
  const src = "test case";
  const env: SimpleEnvelope = {
    data,
    src,
  };
  const t = new Date().getTime();

  const expected: Envelope = {
    v: "A",
    id: `${t}-4a2a6fb97b3afe6a7ca4c13457c441664c7f6a6c2ea7782e1f2dea384cf97cb8`,
    src,
    data,
    dst: [],
    t,
    ttl: 10,
  };
  expect(`${t}`).toEqual(expect.stringMatching(/^[0-9]+/));

  // expect(expected.id).toEqual(`${t}-${hashIt(sortKeys(data, () => void))}`);
  expect(simpleEnvelope(env)).toEqual(expected);
});

it("test serialization", () => {
  const message: Envelope = {
    v: "A",
    id: "1624140000000-4a2a6fb97b3afe6a7ca4c13457c441664c7f6a6c2ea7782e1f2dea384cf97cb8",
    src: "test case",
    data: {
      kind: "test",
      data: { name: "object", date: "2021-05-20" },
    },
    dst: [],
    t: 1624140000000,
    ttl: 10,
  };

  const expected: { stringify: string; prettyprint: string } = {
    stringify:
      '{"data":{"data":{"date":"2021-05-20","name":"object"},"kind":"test"},"dst":[],"id":"1624140000000-4a2a6fb97b3afe6a7ca4c13457c441664c7f6a6c2ea7782e1f2dea384cf97cb8","src":"test case","t":1624140000000,"ttl":10,"v":"A"}',
    prettyprint:
      '{\n\
  "data": {\n\
    "data": {\n\
      "date": "2021-05-20",\n\
      "name": "object"\n\
    },\n\
    "kind": "test"\n\
  },\n\
  "dst": [],\n\
  "id": "1624140000000-4a2a6fb97b3afe6a7ca4c13457c441664c7f6a6c2ea7782e1f2dea384cf97cb8",\n\
  "src": "test case",\n\
  "t": 1624140000000,\n\
  "ttl": 10,\n\
  "v": "A"\n\
}',
  };
  expect(serializeSorted(message)).toEqual(expected.stringify);
  expect(serializeSorted(message, { multiline: true })).toEqual(
    expected.prettyprint
  );
});

it("sort with out with string", () => {
  const fn = jest.fn();
  sortKeys("string", fn);
  expect(fn.mock.calls).toEqual([[{ val: "string" }]]);
});

it("sort with out with number", () => {
  const fn = jest.fn();
  sortKeys(4711, fn);
  expect(fn.mock.calls).toEqual([[{ val: 4711 }]]);
});

it("sort with out with boolean", () => {
  const fn = jest.fn();
  sortKeys(false, fn);
  expect(fn.mock.calls).toEqual([[{ val: false }]]);
});

it("sort with out with array of empty", () => {
  const fn = jest.fn();
  sortKeys([], fn);
  expect(fn.mock.calls).toEqual([[{ outState: "AS" }], [{ outState: "AE" }]]);
});

it("sort with out with array of [1,2]", () => {
  const fn = jest.fn();
  sortKeys([1, 2], fn);
  expect(fn.mock.calls).toEqual([
    [{ outState: "AS" }],
    [{ val: 1 }],
    [{ val: 2 }],
    [{ outState: "AE" }],
  ]);
});

it("sort with out with array of [[1,2],[3,4]]", () => {
  const fn = jest.fn();
  sortKeys(
    [
      [1, 2],
      [3, 4],
    ],
    fn
  );
  expect(fn.mock.calls).toEqual([
    [{ outState: "AS" }],
    [{ outState: "AS" }],
    [{ val: 1 }],
    [{ val: 2 }],
    [{ outState: "AE" }],
    [{ outState: "AS" }],
    [{ val: 3 }],
    [{ val: 4 }],
    [{ outState: "AE" }],
    [{ outState: "AE" }],
  ]);
});

it("sort with out with obj of {}", () => {
  const fn = jest.fn();
  sortKeys({}, fn);
  expect(fn.mock.calls).toEqual([[{ outState: "OS" }], [{ outState: "OE" }]]);
});

it("sort with out with obj of { y: 1, x: 2 }", () => {
  const fn = jest.fn();
  sortKeys({ y: 1, x: 2 }, fn);
  expect(fn.mock.calls).toEqual([
    [{ outState: "OS" }],
    [{ attribute: "x" }],
    [{ val: 2 }],
    [{ attribute: "y" }],
    [{ val: 1 }],
    [{ outState: "OE" }],
  ]);
});

it("sort with out with obj of { y: { b: 1, a: 2 }  }", () => {
  const fn = jest.fn();
  sortKeys({ y: { b: 1, a: 2 } }, fn);
  expect(fn.mock.calls).toEqual([
    [{ outState: "OS" }],
    [{ attribute: "y" }],
    [{ outState: "OS" }],
    [{ attribute: "a" }],
    [{ val: 2 }],
    [{ attribute: "b" }],
    [{ val: 1 }],
    [{ outState: "OE" }],
    [{ outState: "OE" }],
  ]);
});

it("JSONCollector {}", () => {
  let out = "";
  const json = new JsonCollector((o) => (out += o));
  sortKeys({}, (o) => json.append(o));
  expect(out).toBe("{}");
});
it("JSONCollector []", () => {
  let out = "";
  const json = new JsonCollector((o) => (out += o));
  sortKeys([], (o) => json.append(o));
  expect(out).toBe("[]");
});

it('JSONCollector { x: { y: 1, z: "x" }, y: {}, z: []}', () => {
  let out = "";
  const json = new JsonCollector((o) => (out += o));
  sortKeys({ x: { y: 1, z: "x" }, y: {}, z: [] }, (o) => json.append(o));
  expect(out).toBe('{"x":{"y":1,"z":"x"},"y":{},"z":[]}');
});

it('JSONCollector ["xx"]', () => {
  let out = "";
  const json = new JsonCollector((o) => (out += o));
  sortKeys(["xx"], (o) => json.append(o));
  expect(out).toBe('["xx"]');
});

it('JSONCollector [1, "2"]', () => {
  let out = "";
  const json = new JsonCollector((o) => (out += o));
  sortKeys([1, "2"], (o) => json.append(o));
  expect(out).toBe('[1,"2"]');
});

it('JSONCollector [1, ["2", "A"]]', () => {
  let out = "";
  const json = new JsonCollector((o) => (out += o));
  sortKeys([1, ["2", "A"], "E"], (o) => json.append(o));
  expect(out).toBe('[1,["2","A"],"E"]');
});

it("JSONCollector indent=2 {} ", () => {
  let out = "";
  const json = new JsonCollector((o) => (out += o), 2);
  sortKeys({}, (o) => json.append(o));
  expect(out).toBe("{}");
});

it("JSONCollector indent=2 [] ", () => {
  let out = "";
  const json = new JsonCollector((o) => (out += o), 2);
  sortKeys([], (o) => json.append(o));
  expect(out).toBe("[]");
});

it('JSONCollector indent=2 { x: { y: 1, z: "x" }}', () => {
  let out = "";
  const json = new JsonCollector((o) => (out += o), 2);
  sortKeys({ x: { y: 1, z: "x" }, y: {}, z: [] }, (o) => json.append(o));
  console.log("XXXX[", out, "]XXXX");
  expect(out).toBe(
    '{\n  "x": {\n    "y": 1,\n    "z": "x"\n  },\n  "y": {},\n  "z": []\n}'
  );
});

it('JSONCollector indent=2 ["xx"]', () => {
  let out = "";
  const json = new JsonCollector((o) => (out += o), 2);
  sortKeys(["xx"], (o) => json.append(o));
  expect(out).toBe('[\n  "xx"\n]');
});

it('JSONCollector indent=2 [1, "2"]', () => {
  let out = "";
  const json = new JsonCollector((o) => {
    // console.log("OUT=>", o)
    out += o;
  }, 2);
  sortKeys([1, "2"], (o) => json.append(o));
  expect(out).toBe('[\n  1,\n  "2"\n]');
});

it('JSONCollector [1, new Date(444)]', () => {
  let out = "";
  const json = new JsonCollector((o) => {
    // console.log("OUT=>", o)
    out += o;
  });
  const obj = [1, new Date(444)];
  sortKeys(obj, (o) => json.append(o));
  expect(JSON.stringify(obj)).toBe(out);
});

it('HashCollector 1', () => {
  const hash = new HashCollector();
  sortKeys({ x: { y: 1, z: "x" }, y: {}, z: [], d: new Date(444) }, (o) => hash.append(o));
  expect(hash.digest()).toBe('5PvJAWGkaKAHax6tsaKGfPYm6JfXxZs15wRTDpSKaZ2G');
});

it('HashCollector 2', () => {
  const hash = new HashCollector();
  sortKeys({ x: { y: 2, z: "x" }, y: {}, z: [] }, (o) => hash.append(o));
  expect(hash.digest()).toBe('9EwiKWBvxxXGnVaEgQ5N6mwpeGPny2c4QYuCsY1hMG7s');
});

it('HashCollector 3', () => {
  const hash = new HashCollector();
  sortKeys({ x: { x: 1, z: "x" }, y: {}, z: [] }, (o) => hash.append(o));
  expect(hash.digest()).toBe('5ktWSQ4GuCoHHScpfcNEsckY6YRzZoe2c6WTzmZPYiq8');
});

it('HashCollector 3 internal update', () => {
  const hashCollector = new HashCollector();
  hashCollector.hash.update = jest.fn()
  sortKeys({ x: { x: 1, z: "x" }, y: {}, z: [], date: new Date(444) }, (o) => hashCollector.append(o));
  const result = ((hashCollector.hash.update as jest.Mock).mock.calls)
      .reduce((acc: string[], elem: Buffer[]) => {
        elem.map((s: Buffer) => acc.push(s.toString()));
        return acc;
      }, []);
  expect(result).toEqual(["date", "1970-01-01T00:00:00.444Z", "x", "x", "1", "z", "x", "y", "z"]);
});

afterAll(() => {
  // Unlock Time
  jest.useRealTimers();
});
