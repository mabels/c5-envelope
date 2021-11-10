import {
  simpleEnvelope,
  hashIt,
  sortKeys,
  SimpleEnvelope,
  serializeSorted,
} from './simpleEnvelope';
import { Envelope } from '../schema/envelope';

beforeAll(() => {
  // Lock Time
  jest.useFakeTimers('modern');
  jest.setSystemTime(new Date(2021, 5, 20));
  // jest.spyOn(Date, 'now').mockImplementation(() => 1487076708000);
});

it('test simple sha256 creation', () => {
  expect.assertions(2);

  const expectedHash = '3f0a377ba0a4a460ecb616f6507ce0d8cfa3e704025d4fda3ed0c5ca05468728';
  expect(hashIt('test message')).toEqual(expectedHash);
  expect(hashIt('t\u0065\u0073t m\u0065\u0073\u0073ag\u0065')).toEqual(expectedHash);
});

it('test simple envelope', () => {
  expect.assertions(3);

  const data = {
    kind: 'test',
    data: { name: 'object', date: '2021-05-20' },
  };
  const src = 'test case';
  const env: SimpleEnvelope = {
    data,
    src,
  };
  const t = new Date().getTime();

  const expected: Envelope = {
    v: 'A',
    id: `${t}-4a2a6fb97b3afe6a7ca4c13457c441664c7f6a6c2ea7782e1f2dea384cf97cb8`,
    src,
    data,
    dst: [],
    t,
    ttl: 10,
  };
  expect(`${t}`).toEqual(expect.stringMatching(/^[0-9]+/));

  expect(expected.id).toEqual(`${t}-${hashIt(sortKeys(data))}`);
  expect(simpleEnvelope(env)).toEqual(expected);
});

it('test serialization', () => {
  const message: Envelope = {
    v: 'A',
    id: '1624140000000-4a2a6fb97b3afe6a7ca4c13457c441664c7f6a6c2ea7782e1f2dea384cf97cb8',
    src: 'test case',
    data: {
      kind: 'test',
      data: { name: 'object', date: '2021-05-20' },
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
  expect(serializeSorted(message, { multiline: true })).toEqual(expected.prettyprint);
});

afterAll(() => {
  // Unlock Time
  jest.useRealTimers();
});
