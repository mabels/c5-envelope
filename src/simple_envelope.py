
from dataclasses import dataclass
from typing import List
from .lang.python.envelope import *
import json
from datetime import datetime
import hashlib
import math


@dataclass
class SimpleEnvelope:
    src: str
    data: PayloadT
    id: str = None
    dst: List[str] = None
    t: datetime = None
    ttl: float = None


def simple_envelope(env: SimpleEnvelope) -> EnvelopeT:
    data = env.data.to_dict()
    hex = create_sha256(json.dumps(data))
    if env.t is None:
        date = datetime.now()
    else:
        date = env.t
    if env.id is None:
        id = '{t}-{hex}'.format(t=math.ceil(date.timestamp()), hex=hex)
    else:
        id = env.id
    if isinstance(env.dst, list):
        dst = env.dst
    else:
        dst = []
    if env.ttl is None:
        ttl = 10
    else:
        ttl = env.dst
    return EnvelopeT.from_dict({
        'v': 'A',
        'id': id,
        'src': env.src,
        'dst': dst,
        't': date.timestamp(),
        'ttl': ttl,
        'data': data
    })


def create_sha256(message: str) -> str:
    h = hashlib.new('sha256')
    h.update(bytearray(message.encode('utf-8')))
    return h.hexdigest()
