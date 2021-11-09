import math
from datetime import datetime
import unittest
import json

from .lang.python.envelope import EnvelopeT, PayloadT

from .simple_envelope import SimpleEnvelope, create_sha256, simple_envelope, serialize_sorted

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
        self.assertEqual(create_sha256('t\u0065\u0073t m\u0065\u0073\u0073ag\u0065'),
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
            'id': '{t}-{x}'.format(t=math.ceil(t.timestamp()),
                                   x=create_sha256(json.dumps(data,
                                                              sort_keys=True))),
            'src': src,
            'data': PayloadT.from_dict(data).to_dict(),
            'dst': [],
            't': t.timestamp(),
            'ttl': 10,
        })
        self.assertEqual(expected.id, '{t}-cdb38bb26d19ce9fd7b9c25f111e8132a15882519e6cea4feae2a05c594a6527'.format(t=math.ceil(t.timestamp())))
        se = simple_envelope(env)
        self.assertLess(se.t - expected.t, 0.02)
        # print(se.id)
        # print(expected.id)
        self.assertTrue(se.id.endswith(expected.id.split('-')[1]))
        se.id = expected.id
        se.t = expected.t
        self.assertEqual(se.to_dict(), expected.to_dict())

    def test_serialization(self):
        data = {
            'data': {'name': 'object', 'date': '2021-05-20'},
            'kind': 'test',
        }
        src = 'test case'
        t = 1636499792.853732
        message = EnvelopeT.from_dict({
            'v': 'A',
            'id': '{t}-{x}'.format(t=math.ceil(t),
                                   x=create_sha256(json.dumps(data,
                                                              sort_keys=True))),
            'src': src,
            'data': PayloadT.from_dict(data).to_dict(),
            'dst': [],
            't': t,
            'ttl': 10,
        })
        expected = {
            "stringify": """{"data": {"data": {"date": "2021-05-20", "name": "object"}, "kind": "test"}, "dst": [], "id": "1636499793-cdb38bb26d19ce9fd7b9c25f111e8132a15882519e6cea4feae2a05c594a6527", "src": "test case", "t": 1636499792.853732, "ttl": 10.0, "v": "A"}""",
            "pretty_print" : """{
  "data": {
    "data": {
      "date": "2021-05-20",
      "name": "object"
    },
    "kind": "test"
  },
  "dst": [],
  "id": "1636499793-cdb38bb26d19ce9fd7b9c25f111e8132a15882519e6cea4feae2a05c594a6527",
  "src": "test case",
  "t": 1636499792.853732,
  "ttl": 10.0,
  "v": "A"
}"""
        };
        self.assertEqual(serialize_sorted(message, multiline=True),
                         expected['pretty_print'])
        self.assertEqual(serialize_sorted(message),
                         expected['stringify'])


if __name__ == '__main__':
    unittest.main()
