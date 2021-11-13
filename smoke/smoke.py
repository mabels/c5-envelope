import json
import c5_envelope as c5
from c5_envelope.lang.python.envelope import t1_to_dict
from c5_envelope.simple_envelope import SimpleEnvelopeProps

pay: c5.PayloadT = c5.PayloadT.from_dict({
  'kind': "kind",
  'data': { 'y': 4 },
})

env: c5.EnvelopeT = c5.EnvelopeT.from_dict({
    'v': "A",
    'id': "id",
    'src': "envelope",
    'dst': [],
    't': 4711,
    'ttl': 10,
    'data': pay.to_dict(),
})

message = c5.SimpleEnvelopeProps(**{
  'src': "test case",
  'data': pay.to_dict()
})

refStr = c5.simpleEnvelope(message).asJson()
ref = c5.EnvelopeT.from_dict(json.loads(refStr))
env= c5.simpleEnvelope(c5.SimpleEnvelopeProps(**(ref.to_dict())))
envStr = env.asJson()
if (refStr != envStr):
  raise Exception(f'ref={refStr} env={envStr}')

print("Ready for production")
