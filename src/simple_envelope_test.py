from datetime import datetime, timezone, tzinfo
import hashlib
import json
import unittest
import unittest.mock

from .lang.python.envelope import EnvelopeT, PayloadT

from .simple_envelope import HashCollector, JsonCollector, JsonProps, SimpleEnvelopeProps, simpleEnvelope, sortKeys


class Mockdatetime:
    def now(self):
        return datetime.fromtimestamp(1624140000)

mockdatetime = Mockdatetime()

def toSVals(calls: list[unittest.mock.call]):
    return list(map(lambda x: list(map(lambda x: x.to_dict(), x.args)), calls))

class SimpleEnvelopeTest(unittest.TestCase):

    def test_simple_hash(self):
        hashC = HashCollector()
        sortKeys({
            'kind': "test",
            'data': {
                'name': "object",
                'date': "2021-05-20",
            },
        },
            lambda sval: hashC.append(sval))
        self.assertEqual(
            hashC.digest(), "5zWhdtvKuGob1FbW9vUGPQKobcLtYYr5wU8AxQRVraeB")

    def test_serialization(self):
        self.maxDiff = None
        message: SimpleEnvelopeProps = SimpleEnvelopeProps(**{
            'src': "test case",
            'data': PayloadT.from_dict({
                'kind': "test",
                'data': {'name': "object", 'date': "2021-05-20"}
            }),
            'id': "1624140000000-4a2a6fb97b3afe6a7ca4c13457c441664c7f6a6c2ea7782e1f2dea384cf97cb8",
            'dst': [],
            't': datetime.fromtimestamp(0.444, tz=timezone.utc),
            'ttl': 10
        })

        stringify = '{"data":{"data":{"date":"2021-05-20","name":"object"},"kind":"test"},"dst":[],"id":"1624140000000-4a2a6fb97b3afe6a7ca4c13457c441664c7f6a6c2ea7782e1f2dea384cf97cb8","src":"test case","t":444,"ttl":10,"v":"A"}'
        # print(f'---:{stringify}')
        jsonStr = simpleEnvelope(message).asJson()
        # print(f'===:{jsonStr}')
        self.assertEqual(jsonStr, stringify)

    def test_serialization_with_hash(self):
        self.maxDiff = None
        message: SimpleEnvelopeProps = SimpleEnvelopeProps(**{
            'src': "test case",
            'data': PayloadT.from_dict({
                'kind': "test",
                'data': {'name': "object", 'date': "2021-05-20"},
            }),
            'dst': [],
            'ttl': 10,
            'datetime': mockdatetime
        })
        stringify = '{"data":{"data":{"date":"2021-05-20","name":"object"},"kind":"test"},"dst":[],"id":"1624140000000-BbYxQMurpUmj1W6E4EwYM79Rm3quSz1wwtNZDSsFt1bp\","src":"test case","t":1624140000000,"ttl":10,"v":"A"}'
        self.assertEqual(simpleEnvelope(message).asJson(), stringify)

    def test_serialization_with_intend(self):
        self.maxDiff = None
        message: SimpleEnvelopeProps = SimpleEnvelopeProps(**{
            'src': "test case",
            'data': PayloadT.from_dict({
                'kind': "test",
                'data': {'name': "object", 'date': "2021-05-20"},
            }),
            'dst': [],
            'ttl': 10,
            'jsonProp': JsonProps(**{
                'indent': 2,
            }),
            'datetime': mockdatetime
        })
        stringify = json.dumps(
            json.loads(
                '{"data":{"data":{"date":"2021-05-20","name":"object"},"kind":"test"},"dst":[],"id":"1624140000000-BbYxQMurpUmj1W6E4EwYM79Rm3quSz1wwtNZDSsFt1bp","src":"test case","t":1624140000000,"ttl":10,"v":"A"}'
            ),
            indent=2)
        self.assertEqual(simpleEnvelope(message).asJson(), stringify)

    def test_sort_with_out_with_string(self):
        fn = unittest.mock.Mock()
        sortKeys("string", fn)
        self.assertEqual(toSVals(fn.mock_calls), [[{'val': {'val': "string"}}]])

    def test_sort_with_out_with_date(self):
        fn = unittest.mock.Mock()
        sortKeys(datetime.fromtimestamp(0.444, tz=timezone.utc), fn)
        self.assertEqual(toSVals(fn.mock_calls), 
            [[{'val': {'val': datetime.fromtimestamp(0.444, tz=timezone.utc)}}]])

    def test_sort_with_out_with_number(self):
        fn = unittest.mock.Mock()
        sortKeys(4711, fn)
        self.assertEqual(toSVals(fn.mock_calls), [[{'val': {'val': 4711}}]])

    def test_sort_with_out_with_boolean(self):
        fn = unittest.mock.Mock()
        sortKeys(False, fn)
        self.assertEqual(toSVals(fn.mock_calls), [[{'val': {'val': False}}]])

    def test_sort_with_out_with_array_of_empty(self):
        fn = unittest.mock.Mock()
        sortKeys([], fn)
        self.assertEqual(toSVals(fn.mock_calls), 
            [[{'outState': "AS"}], [{'outState': "AE"}]])

    def test_sort_with_out_with_array_of_1_2(self):
        fn = unittest.mock.Mock()
        sortKeys([1, 2], fn)
        self.assertEqual(toSVals(fn.mock_calls), [
            [{'outState': "AS"}],
            [{'val': {'val': 1}}],
            [{'val': {'val': 2}}],
            [{'outState': "AE"}],
        ])

    def test_sort_with_out_with_array_of_1_2_3_4(self):
        fn = unittest.mock.Mock()
        sortKeys(
            [
                [1, 2],
                [3, 4],
            ],
            fn
        )
        self.assertEqual(toSVals(fn.mock_calls), [
            [{'outState': "AS"}],
            [{'outState': "AS"}],
            [{'val': {'val': 1}}],
            [{'val': {'val': 2}}],
            [{'outState': "AE"}],
            [{'outState': "AS"}],
            [{'val': {'val': 3}}],
            [{'val': {'val': 4}}],
            [{'outState': "AE"}],
            [{'outState': "AE"}],
        ])

    def test_sort_with_out_with_obj_of_empty_obj(self):
        fn = unittest.mock.Mock()
        sortKeys({}, fn)
        self.assertEqual(toSVals(fn.mock_calls), 
            [[{'outState': "OS"}], [{'outState': "OE"}]])

    def test_sort_with_out_with_obj_of_obj_y_1_x_2(self):
        fn = unittest.mock.Mock()
        sortKeys({'y': 1, 'x': 2}, fn)
        self.assertEqual(toSVals(fn.mock_calls), [
            [{'outState': "OS"}],
            [{'attribute': "x"}],
            [{'val': {'val': 2}}],
            [{'attribute': "y"}],
            [{'val': {'val': 1}}],
            [{'outState': "OE"}],
        ])

    def test_sort_with_out_with_obj_of_obj_y_b_1_a_2(self):
        fn = unittest.mock.Mock()
        sortKeys({'y': {'b': 1, 'a': 2}}, fn)
        self.assertEqual(toSVals(fn.mock_calls), [
            [{'outState': "OS"}],
            [{'attribute': "y"}],
            [{'outState': "OS"}],
            [{'attribute': "a"}],
            [{'val': {'val': 2}}],
            [{'attribute': "b"}],
            [{'val': {'val': 1}}],
            [{'outState': "OE"}],
            [{'outState': "OE"}],
        ])

    def test_JSONCollector_empty_obj(self):
        out = []
        json = JsonCollector(lambda o: out.append(o))
        sortKeys({}, lambda o: json.append(o))
        self.assertEqual("".join(out), "{}")

    def test_JSONCollector_empty_array(self):
        out = []
        json = JsonCollector(lambda o: out.append(o))
        sortKeys([], lambda o: json.append(o))
        self.assertEqual("".join(out), "[]")

    def test_JSONCollector_x_y_1_z_x_y_z(self):
        out = []
        json = JsonCollector(lambda o: out.append(o))
        sortKeys({'x': {'y': 1, 'z': "x"}, 'y': {}, 'z': []},
                 lambda o: json.append(o))
        self.assertEqual("".join(out), '{"x":{"y":1,"z":"x"},"y":{},"z":[]}')

    def test_JSONCollector_array_xx(self):
        out = []
        json = JsonCollector(lambda o: out.append(o))
        sortKeys(["xx"], lambda o: json.append(o))
        self.assertEqual("".join(out), '["xx"]')

    def test_JSONCollector_array_1_2(self):
        out = []
        json = JsonCollector(lambda o: out.append(o))
        sortKeys([1, "2"], lambda o: json.append(o))
        self.assertEqual("".join(out), '[1,"2"]')

    def test_JSONCollector_1_2_A(self):
        out = []
        json = JsonCollector(lambda o: out.append(o))
        sortKeys([1, ["2", "A"], "E"], lambda o: json.append(o))
        self.assertEqual("".join(out), '[1,["2","A"],"E"]')

    def test_JSONCollector_indent_2_empty_obj(self):
        out = []
        json = JsonCollector(lambda o: out.append(o), JsonProps(**{'indent': 2}))
        sortKeys({}, lambda o: json.append(o))
        self.assertEqual("".join(out), "{}")

    def test_JSONCollector_indent_2_array_empty(self):
        out = []
        json = JsonCollector(lambda o: out.append(o), JsonProps(**{'indent': 2}))
        sortKeys([], lambda o: json.append(o))
        self.assertEqual("".join(out), "[]")

    def test_JSONCollector_indent_2_x_y_1_z_x(self):
        out = []
        json = JsonCollector(lambda o: out.append(o), JsonProps(**{'indent': 2}))
        sortKeys({'x': {'y': 1, 'z': "x"}, 'y': {}, 'z': []},
                 lambda o: json.append(o))
        self.assertEqual(
            "".join(out), '{\n  "x": {\n    "y": 1,\n    "z": "x"\n  },\n  "y": {},\n  "z": []\n}')

    def test_JSONCollector_indent_2_xx(self):
        out = []
        json = JsonCollector(lambda o: out.append(o), JsonProps(**{'indent': 2}))
        sortKeys(["xx"], lambda o: json.append(o))
        self.assertEqual("".join(out), '[\n  "xx"\n]')

    def test_JSONCollector_indent_2_array_1_2(self):
        out = []
        json = JsonCollector(lambda o: out.append(o), JsonProps(**{'indent': 2}))
        sortKeys([1, "2"], lambda o: json.append(o))
        self.assertEqual("".join(out), '[\n  1,\n  "2"\n]')

    def test_JSONCollector_1_date444(self):
        out = []
        json = JsonCollector(lambda o: out.append(o))
        obj = [1, datetime.fromtimestamp(0.444, tz=timezone.utc)]
        sortKeys(obj, lambda o: json.append(o))
        self.assertEqual("[1,\"1970-01-01T00:00:00.444Z\"]", "".join(out))

    def test_HashCollector_1(self):
        hash = HashCollector()
        sortKeys({'x': {'y': 1, 'z': "x"}, 'y': {}, 'z': [],
                 'd': datetime.fromtimestamp(0.444, tz=timezone.utc)}, lambda o: hash.append(o))
        self.assertEqual(
            hash.digest(), "5PvJAWGkaKAHax6tsaKGfPYm6JfXxZs15wRTDpSKaZ2G")

    def test_HashCollector_2(self):
        hash = HashCollector()
        sortKeys({'x': {'y': 2, 'z': "x"}, 'y': {}, 'z': [],
                 'date': datetime.fromtimestamp(0.444, tz=timezone.utc)}, lambda o: hash.append(o))
        self.assertEqual(
            hash.digest(), "ECVWfmcNaUGkgvPZe7CojrnRNULxNczKXU8PGns6UDvr")

    def test_HashCollector_3(self):
        hash = HashCollector()
        sortKeys({'x': {'x': 1, 'z': "x"}, 'y': {}, 'z': [],
                 'date': datetime.fromtimestamp(0.444, tz=timezone.utc)}, lambda o: hash.append(o))
        self.assertEqual(
            hash.digest(), "EoYNGMtap1k9iEAGeVtHmJwpMjQLKWJmR27SG6aC9fSg")

    def test_HashCollector_4(self):
        hash1 = HashCollector()
        sortKeys({'x': {'x': 1, 'z': "x"}, 'y': {}, 'z': [],
                 'date': datetime.fromtimestamp(0.444, tz=timezone.utc)}, lambda o: hash1.append(o))
        hash2 = HashCollector()
        sortKeys({'date': datetime.fromtimestamp(0.444, tz=timezone.utc), 'x': {
                 'x': 1, 'z': "x"}, 'y': {}, 'z': []}, lambda o: hash2.append(o))
        self.assertEqual(hash1.digest(), hash2.digest())

    def test_HashCollector_3_internal_update(self):
        class MockHash:
            hash: any
            mockUpdate: any
            def __init__(self) -> None:
                self.mockUpdate = unittest.mock.Mock()
                self.hash = hashlib.new('sha256')

            def update(self, a: any):
                self.mockUpdate(a) 
                self.hash.update(a)

            def digest(self):
                return self.hash.digest()

        hashCollector = HashCollector(MockHash())
        sortKeys({'x': {'r': 1, 'z': "u"}, 'y': {}, 'z': [], 'date': datetime.fromtimestamp(
            0.444, tz=timezone.utc)}, lambda o: hashCollector.append(o))
        result = list(map(lambda m: m.args[0].decode(), hashCollector.hash.mockUpdate.mock_calls))
        self.assertEqual(result, 
            ["date", "1970-01-01T00:00:00.444Z", "x", "r", "1", "z", "u", "y", "z"])
        self.assertEqual(hashCollector.digest(),
                         "CwEMjUHV6BpDS7AGBAYqjY6qMKE6xC8Z56H5T2ZuUuXe")

    def test_missing_data_in_envelope(self):
        payt: PayloadT = PayloadT.from_dict({
            'kind': 'kind',
            'data': { 'y': 4 }
        })
        message: SimpleEnvelopeProps = SimpleEnvelopeProps(**{
            'src': "test case",
            'data': payt
        })
        ref = EnvelopeT.from_dict(json.loads(simpleEnvelope(message).asJson()))
        self.assertEqual(simpleEnvelope(SimpleEnvelopeProps(**ref.to_dict())).asEnvelope().data.to_dict(), payt.to_dict())


if __name__ == '__main__':
    unittest.main()
