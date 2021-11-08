import { simpleEnvelope, createSHA256, SimpleEnvelope } from './simpleEnvelope';
import { Envelope } from '../schema/envelope';

beforeAll(() => {
  // Lock Time
  jest.useFakeTimers('modern');
  jest.setSystemTime(new Date(2021, 5, 20));
  // jest.spyOn(Date, 'now').mockImplementation(() => 1487076708000);
});

it('test simple sha256 creation', async () => {
  expect.assertions(1);

  await expect(createSHA256('test message')).resolves.toEqual(
    '3f0a377ba0a4a460ecb616f6507ce0d8cfa3e704025d4fda3ed0c5ca05468728'
  );
});

it('test simple envelope', async () => {
  // expect.assertions(1);

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
    id: `${t}-${await createSHA256(JSON.stringify(data))}`,
    src,
    data,
    dst: [],
    t,
    ttl: 10,
  };
  expect(`${t}`).toEqual('1624140000000')

  expect(expected.id).toEqual(`${t}-2b9cdc38d459ed98dfa583fae1388de2f69384561b9bca0491f037c3ce0743a9`)

  await expect(simpleEnvelope(env)).resolves.toEqual(expected);
});

afterAll(() => {
  // Unlock Time
  jest.useRealTimers();
});
