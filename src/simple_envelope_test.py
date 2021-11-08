
from datetime import datetime
import unittest
import json

from .lang.python.envelope import EnvelopeT, PayloadT

from .simple_envelope import SimpleEnvelope, create_sha256, simple_envelope

# beforeAll(() => {
#   // Lock Time
#   jest.useFakeTimers('modern');
#   jest.setSystemTime(new Date(2021, 5, 20));
#   // jest.spyOn(Date, 'now').mockImplementation(() => 1487076708000);
# });


class SimpleEnvelopeTest(unittest.TestCase):
    def test_sha256(self):
        self.assertEqual(create_sha256('test message'),
                         '3f0a377ba0a4a460ecb616f6507ce0d8cfa3e704025d4fda3ed0c5ca05468728'
                         )

    def test_envelope(self):
        # python and attribute order is a little flakey
        data = {
            'data': {'name': 'object', 'date': '2021-05-20'},
            'kind': 'test',
        }
        src = 'test case'
        env = SimpleEnvelope(
            data=PayloadT.from_dict(data),
            src=src
        )
        t = datetime.now()
        expected = EnvelopeT.from_dict({
            'v': 'A',
            'id': '{t}-{x}'.format(t=t, x=create_sha256(json.dumps(data))),
            'src': src,
            'data': PayloadT.from_dict(data).to_dict(),
            'dst': [],
            't': t.timestamp(),
            'ttl': 10,
        })
        se = simple_envelope(env)
        self.assertLess(se.t - expected.t, 0.02)
        # print(se.id)
        # print(expected.id)
        self.assertTrue(se.id.endswith(expected.id.split('-')[3]))
        se.id = expected.id
        se.t = expected.t
        self.assertEqual(se.to_dict(), expected.to_dict())


if __name__ == '__main__':
    unittest.main()
