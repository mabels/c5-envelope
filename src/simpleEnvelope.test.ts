import * as ogs from "object-graph-streamer";
import {
  simpleEnvelope,
  SimpleEnvelopeProps,
  hashIdGenerator,
} from "./simpleEnvelope";
// import { Envelope } from "../schema/envelope";
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

  const hashC = new ogs.HashCollector();
  ogs.objectGraphStreamer(
    {
      kind: "test",
      data: {
        name: "object",
        date: "2021-05-20",
      },
    },
    (sval: ogs.SVal) => hashC.append(sval)
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
      '{"data":{"data":{"date":"2021-05-20","name":"object"},"kind":"test"},"dst":[],"id":"1624140000000-BbYxQMurpUmj1W6E4EwYM79Rm3quSz1wwtNZDSsFt1bp","src":"test case","t":1624140000000,"ttl":10,"v":"A"}',
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

it("missing data in envelope", () => {
  const payt: PayloadT = Convert.toPayload(
    JSON.stringify({
      kind: "kind",
      data: { y: 4 },
    })
  );
  const message: SimpleEnvelopeProps = {
    src: "test case",
    data: payt,
  };
  const ref = Convert.toEnvelope(simpleEnvelope(message).asJson());
  expect(simpleEnvelope(ref).asEnvelope().data).toEqual(message.data);
});

it("simpleEnvelope with id", () => {
  const payt: PayloadT = Convert.toPayload(
    JSON.stringify({
      kind: "kind",
      data: { y: 4 },
    })
  );
  const message: SimpleEnvelopeProps = {
    src: "test case",
    data: payt,
    id: "myId",
    idGenerator: hashIdGenerator,
  };
  const ref = Convert.toEnvelope(simpleEnvelope(message).asJson());
  expect(simpleEnvelope(ref).asEnvelope().id).toEqual("myId");
});

it("simpleEnvelope with default tHashGenerator", () => {
  const payt: PayloadT = Convert.toPayload(
    JSON.stringify({
      kind: "kind",
      data: { y: 4 },
    })
  );
  const message: SimpleEnvelopeProps = {
    src: "test case",
    data: payt,
    t: 123,
    idGenerator: undefined,
  };
  const ref = Convert.toEnvelope(simpleEnvelope(message).asJson());
  expect(simpleEnvelope(ref).asEnvelope().id).toEqual(
    "123-GUKeStj4aGQRju7p2Dzf31Qi2d2MVuRCw68H1c8gMCnQ"
  );
});

it("simpleEnvelope with custom id generator", () => {
  const payt: PayloadT = Convert.toPayload(
    JSON.stringify({
      kind: "kind",
      data: { y: 4 },
    })
  );
  const message: SimpleEnvelopeProps = {
    src: "test case",
    data: payt,
    idGenerator: hashIdGenerator,
  };
  const ref = Convert.toEnvelope(simpleEnvelope(message).asJson());
  expect(simpleEnvelope(ref).asEnvelope().id).toEqual(
    "GUKeStj4aGQRju7p2Dzf31Qi2d2MVuRCw68H1c8gMCnQ"
  );
});

afterAll(() => {
  // Unlock Time
  jest.useRealTimers();
});
