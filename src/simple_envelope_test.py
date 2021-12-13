from datetime import datetime, timezone, tzinfo

import typing
import json
import unittest
import unittest.mock

import object_graph_streamer as ogs

from .lang.python.envelope import EnvelopeT, PayloadT

from .simple_envelope import SimpleEnvelopeProps, simpleEnvelope, hashIdGenerator


class Mockdatetime:
    def now(self):
        return datetime.fromtimestamp(1624140000)

mockdatetime = Mockdatetime()

def toSVals(calls: list[unittest.mock.call]):
    return list(map(lambda x: list(map(lambda x: x.to_dict(), x.args)), calls))

class SimpleEnvelopeTest(unittest.TestCase):

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
            'api_datetime': mockdatetime
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
            'jsonProp': ogs.JsonProps(**{
                'indent': 2,
            }),
            'api_datetime': mockdatetime
        })
        stringify = json.dumps(
            json.loads(
                '{"data":{"data":{"date":"2021-05-20","name":"object"},"kind":"test"},"dst":[],"id":"1624140000000-BbYxQMurpUmj1W6E4EwYM79Rm3quSz1wwtNZDSsFt1bp","src":"test case","t":1624140000000,"ttl":10,"v":"A"}'
            ),
            indent=2)
        self.assertEqual(simpleEnvelope(message).asJson(), stringify)

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

    def test_simple_envelope_with_id(self):
        payt: PayloadT = PayloadT.from_dict({
            'kind': 'kind',
            'data': { 'y': 4 }
        })
        message: SimpleEnvelopeProps = SimpleEnvelopeProps(**{
            'src': "test case",
            'data': payt,
            'id': "myId",
            'idGenerator': hashIdGenerator
        })
        ref = EnvelopeT.from_dict(json.loads(simpleEnvelope(message).asJson()))
        self.assertEqual(simpleEnvelope(SimpleEnvelopeProps(**ref.to_dict())).asEnvelope().id, "myId")

    def test_simple_envelope_with_default_tHashGenerator(self):
        payt: PayloadT = PayloadT.from_dict({
            'kind': 'kind',
            'data': { 'y': 4 }
        })
        message: SimpleEnvelopeProps = SimpleEnvelopeProps(**{
            'src': "test case",
            'data': payt,
            't': 123,
            'idGenerator': None
        })
        ref = EnvelopeT.from_dict(json.loads(simpleEnvelope(message).asJson()))
        self.assertEqual(simpleEnvelope(SimpleEnvelopeProps(**ref.to_dict())).asEnvelope().id, "123-GUKeStj4aGQRju7p2Dzf31Qi2d2MVuRCw68H1c8gMCnQ")

    def test_simple_envelope_with_custom_id_generator(self):
        payt: PayloadT = PayloadT.from_dict({
            'kind': 'kind',
            'data': { 'y': 4 }
        })
        message: SimpleEnvelopeProps = SimpleEnvelopeProps(**{
            'src': "test case",
            'data': payt,
            'idGenerator': hashIdGenerator
        })
        ref = EnvelopeT.from_dict(json.loads(simpleEnvelope(message).asJson()))
        self.assertEqual(simpleEnvelope(SimpleEnvelopeProps(**ref.to_dict())).asEnvelope().id, "GUKeStj4aGQRju7p2Dzf31Qi2d2MVuRCw68H1c8gMCnQ")


if __name__ == '__main__':
    unittest.main()
