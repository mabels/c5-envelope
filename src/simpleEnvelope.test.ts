import {
  simpleEnvelope,
  sortKeys,
  SimpleEnvelopeProps,
  JsonCollector,
  HashCollector,
  SimpleEnvelope, hashIdGenerator,
} from "./simpleEnvelope";
import { Envelope } from "../schema/envelope";
import { Convert, PayloadT } from "./lang/ts/envelope";

beforeAll(() => {
  // Lock Time
  jest.useFakeTimers("modern");
  jest.setSystemTime(new Date(1624140000000));
  // jest.spyOn(Date, 'now').mockImplementation(() => 1487076708000);
});

// it("test simple sha256 creation", () => {
//   expect.assertions(2);

//   const expectedHash =
//     "3f0a377ba0a4a460ecb616f6507ce0d8cfa3e704025d4fda3ed0c5ca05468728";
//   expect(hashIt("test message")).toEqual(expectedHash);
//   expect(hashIt("t\u0065\u0073t m\u0065\u0073\u0073ag\u0065")).toEqual(
//     expectedHash
//   );
// });

it("test simple hash", () => {
  // expect.assertions(3);

  const hashC = new HashCollector();
  sortKeys(
    {
      kind: "test",
      data: {
        name: "object",
        date: "2021-05-20",
      },
    },
    (sval) => hashC.append(sval)
  );
  expect(hashC.digest()).toBe("5zWhdtvKuGob1FbW9vUGPQKobcLtYYr5wU8AxQRVraeB");
});

it("test serialization", () => {
  const message: SimpleEnvelopeProps = {
    id: "1624140000000-4a2a6fb97b3afe6a7ca4c13457c441664c7f6a6c2ea7782e1f2dea384cf97cb8",
    src: "test case",
    data: {
      kind: "test",
      data: { name: "object", date: "2021-05-20" },
    },
    dst: [],
    t: new Date(444),
    ttl: 10,
  };

  const expected: { stringify: string } = {
    stringify:
      '{"data":{"data":{"date":"2021-05-20","name":"object"},"kind":"test"},"dst":[],"id":"1624140000000-4a2a6fb97b3afe6a7ca4c13457c441664c7f6a6c2ea7782e1f2dea384cf97cb8","src":"test case","t":444,"ttl":10,"v":"A"}',
  };
  expect(simpleEnvelope(message).asJson()).toEqual(expected.stringify);
});

it("test serialization with hash", () => {
  const message: SimpleEnvelopeProps = {
    src: "test case",
    data: {
      kind: "test",
      data: { name: "object", date: "2021-05-20" },
    },
    dst: [],
    // t: new Date(444),
    ttl: 10,
  };

  const expected: { stringify: string } = {
    stringify:
      '{"data":{"data":{"date":"2021-05-20","name":"object"},"kind":"test"},"dst":[],"id":"1624140000000-BbYxQMurpUmj1W6E4EwYM79Rm3quSz1wwtNZDSsFt1bp\","src":"test case","t":1624140000000,"ttl":10,"v":"A"}',
  };
  expect(simpleEnvelope(message).asJson()).toEqual(expected.stringify);
});

it("test serialization with intend", () => {
  const message: SimpleEnvelopeProps = {
    src: "test case",
    data: {
      kind: "test",
      data: { name: "object", date: "2021-05-20" },
    },
    dst: [],
    // t: new Date(444),
    ttl: 10,
    jsonProp: {
      indent: 2,
    },
  };

  const expected: { stringify: string } = {
    stringify: JSON.stringify(
      JSON.parse(
        '{"data":{"data":{"date":"2021-05-20","name":"object"},"kind":"test"},"dst":[],"id":"1624140000000-BbYxQMurpUmj1W6E4EwYM79Rm3quSz1wwtNZDSsFt1bp","src":"test case","t":1624140000000,"ttl":10,"v":"A"}'
      ),
      null,
      2
    ),
  };
  expect(simpleEnvelope(message).asJson()).toEqual(expected.stringify);
});

it("sort with out with string", () => {
  const fn = jest.fn();
  sortKeys("string", fn);
  expect(fn.mock.calls).toEqual([[{ val: { val: "string" } }]]);
});

it("sort with out with date", () => {
  const fn = jest.fn();
  sortKeys(new Date(444), fn);
  expect(fn.mock.calls).toEqual([[{ val: { val: new Date(444) } }]]);
});

it("sort with out with number", () => {
  const fn = jest.fn();
  sortKeys(4711, fn);
  expect(fn.mock.calls).toEqual([[{ val: { val: 4711 } }]]);
});

it("sort with out with boolean", () => {
  const fn = jest.fn();
  sortKeys(false, fn);
  expect(fn.mock.calls).toEqual([[{ val: { val: false } }]]);
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
    [{ val: { val: 1 } }],
    [{ val: { val: 2 } }],
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
    [{ val: { val: 1 } }],
    [{ val: { val: 2 } }],
    [{ outState: "AE" }],
    [{ outState: "AS" }],
    [{ val: { val: 3 } }],
    [{ val: { val: 4 } }],
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
    [{ val: { val: 2 } }],
    [{ attribute: "y" }],
    [{ val: { val: 1 } }],
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
    [{ val: { val: 2 } }],
    [{ attribute: "b" }],
    [{ val: { val: 1 } }],
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
  const json = new JsonCollector((o) => (out += o), { indent: 2 });
  sortKeys({}, (o) => json.append(o));
  expect(out).toBe("{}");
});

it("JSONCollector indent=2 [] ", () => {
  let out = "";
  const json = new JsonCollector((o) => (out += o), { indent: 2 });
  sortKeys([], (o) => json.append(o));
  expect(out).toBe("[]");
});

it('JSONCollector indent=2 { x: { y: 1, z: "x" }}', () => {
  let out = "";
  const json = new JsonCollector((o) => (out += o), { indent: 2 });
  sortKeys({ x: { y: 1, z: "x" }, y: {}, z: [] }, (o) => json.append(o));
  expect(out).toBe(
    '{\n  "x": {\n    "y": 1,\n    "z": "x"\n  },\n  "y": {},\n  "z": []\n}'
  );
});

it('JSONCollector indent=2 ["xx"]', () => {
  let out = "";
  const json = new JsonCollector((o) => (out += o), { indent: 2 });
  sortKeys(["xx"], (o) => json.append(o));
  expect(out).toBe('[\n  "xx"\n]');
});

it('JSONCollector indent=2 [1, "2"]', () => {
  let out = "";
  const json = new JsonCollector(
    (o) => {
      // console.log("OUT=>", o)
      out += o;
    },
    { indent: 2 }
  );
  sortKeys([1, "2"], (o) => json.append(o));
  expect(out).toBe('[\n  1,\n  "2"\n]');
});

it("JSONCollector [1, new Date(444)]", () => {
  let out = "";
  const json = new JsonCollector((o) => {
    // console.log("OUT=>", o)
    out += o;
  });
  const obj = [1, new Date(444)];
  sortKeys(obj, (o) => json.append(o));
  expect("[1,\"1970-01-01T00:00:00.444Z\"]").toBe(out);
});

it("HashCollector 1", () => {
  const hash = new HashCollector();
  sortKeys({ x: { y: 1, z: "x" }, y: {}, z: [], d: new Date(444) }, (o) =>
    hash.append(o)
  );
  expect(hash.digest()).toBe("5PvJAWGkaKAHax6tsaKGfPYm6JfXxZs15wRTDpSKaZ2G");
});

it("HashCollector 2", () => {
  const hash = new HashCollector();
  sortKeys({ x: { y: 2, z: "x" }, y: {}, z: [], date: new Date(444) }, (o) =>
    hash.append(o)
  );
  expect(hash.digest()).toBe("ECVWfmcNaUGkgvPZe7CojrnRNULxNczKXU8PGns6UDvr");
});

it("HashCollector 3", () => {
  const hash = new HashCollector();
  sortKeys({ x: { x: 1, z: "x" }, y: {}, z: [], date: new Date(444) }, (o) =>
    hash.append(o)
  );
  expect(hash.digest()).toBe("EoYNGMtap1k9iEAGeVtHmJwpMjQLKWJmR27SG6aC9fSg");
});

it("HashCollector 4", () => {
  const hash1 = new HashCollector();
  sortKeys({ x: { x: 1, z: "x" }, y: {}, z: [], date: new Date(444) }, (o) =>
    hash1.append(o)
  );
  const hash2 = new HashCollector();
  sortKeys({ date: new Date(444), x: { x: 1, z: "x" }, y: {}, z: [] }, (o) =>
    hash2.append(o)
  );
  expect(hash1.digest()).toBe(hash2.digest());
});

it('HashCollector 3 internal update', () => {
  const hashCollector = new HashCollector();
  hashCollector.hash.update = jest.fn()
  sortKeys({ x: { r: 1, z: "u" }, y: {}, z: [], date: new Date(444) }, (o) => hashCollector.append(o));
  const result = ((hashCollector.hash.update as jest.Mock).mock.calls).map(([elem]: Buffer[]) => elem.toString());
  expect(result).toEqual(["date", "1970-01-01T00:00:00.444Z", "x", "r", "1", "z", "u", "y", "z"]);
  expect(hashCollector.digest()).toBe("GKot5hBsd81kMupNCXHaqbhv3huEbxAFMLnpcX2hniwn")
});

it('missing data in envelope', () => {
  const payt: PayloadT = Convert.toPayload(JSON.stringify({
    kind: 'kind',
    data: { y: 4 }
  }))
  const message: SimpleEnvelopeProps = {
    src: "test case",
    data: payt
  };
  const ref = Convert.toEnvelope(simpleEnvelope(message).asJson());
  expect(simpleEnvelope(ref).asEnvelope().data).toEqual(message.data)
})

it('simpleEnvelope with id', () => {
  const payt: PayloadT = Convert.toPayload(JSON.stringify({
    kind: 'kind',
    data: { y: 4 }
  }))
  const message: SimpleEnvelopeProps = {
    src: "test case",
    data: payt,
    id: "myId",
    idGenerator: hashIdGenerator
  };
  const ref = Convert.toEnvelope(simpleEnvelope(message).asJson());
  expect(simpleEnvelope(ref).asEnvelope().id).toEqual("myId")
})

it('simpleEnvelope with default tHashGenerator', () => {
  const payt: PayloadT = Convert.toPayload(JSON.stringify({
    kind: 'kind',
    data: { y: 4 }
  }))
  const message: SimpleEnvelopeProps = {
    src: "test case",
    data: payt,
    t: 123,
    idGenerator: undefined
  };
  const ref = Convert.toEnvelope(simpleEnvelope(message).asJson());
  expect(simpleEnvelope(ref).asEnvelope().id).toEqual("123-GUKeStj4aGQRju7p2Dzf31Qi2d2MVuRCw68H1c8gMCnQ")
})

it('simpleEnvelope with custom id generator', () => {
  const payt: PayloadT = Convert.toPayload(JSON.stringify({
    kind: 'kind',
    data: { y: 4 }
  }))
  const message: SimpleEnvelopeProps = {
    src: "test case",
    data: payt,
    idGenerator: hashIdGenerator
  };
  const ref = Convert.toEnvelope(simpleEnvelope(message).asJson());
  expect(simpleEnvelope(ref).asEnvelope().id).toEqual("GUKeStj4aGQRju7p2Dzf31Qi2d2MVuRCw68H1c8gMCnQ")
})

afterAll(() => {
  // Unlock Time
  jest.useRealTimers();
});
