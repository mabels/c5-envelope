
from dataclasses import dataclass

import typing
# import unittest
import unittest.mock

from .lang.python.envelope import *
import json
from datetime import datetime
import hashlib
import math
from base58 import b58encode


class JsonProps:
    indent: int
    newLine: str

    def __init__(self, indent = None, newLine = None) -> None:
        self.indent = 0 if indent is None else indent
        self.newLine = "\n" if newLine is None else newLine

class SimpleEnvelopeProps:
    id: str
    src: str
    dst: str
    t: datetime
    ttl: int
    data: PayloadT
    jsonProp: JsonProps
    datetime: datetime

    def __init__(self, src, data, id = None, dst = [], t = None, ttl = 10, jsonProp = JsonProps(), datetime = datetime, v = None) -> None:
        if isinstance(data, PayloadT):
            self.data = data
        else:
            self.data = PayloadT.from_dict(data)
        self.src = src
        self.id = id
        self.dst = dst
        self.t = t
        self.ttl = ttl
        self.jsonProp = jsonProp
        self.datetime = datetime

# type OutputFn = (str: string) => void;

# tyype ValueType = string | number | boolean | Date | undefined;


class ValType:
    def toString(): str
    def asValue(): any
    def to_dict(): dict

def jsIsoFormat(val: datetime):
    isoStr = val.isoformat().split(".")
    return f'{isoStr[0]}.{isoStr[1][0:3]}Z'

class JsonValType(ValType):
    val: any

    def __init__(self, val: any):
        self.val = val

    def asValue(self):
        return self.val

    def toString(self):
        val = self.val
        if isinstance(self.val, float): 
           if float(self.val) == int(self.val):
            val = int(self.val)
        elif isinstance(self.val, datetime):
            val = jsIsoFormat(self.val)
        return json.dumps(val)
        # except Exception as e:
        # print("XXXXXXXX[", self.val, e)
    def to_dict(self):
        return {
            'val': self.val
        }

class PlainValType(ValType):
    val: str

    def __init__(self, val: str):
        self.val = val

    def asValue(self):
        return self.val

    def toString(self):
        return self.val

    def to_dict(self):
        return {
            'val': self.val
        }


class OutState(Enum):
    NONE = "NE",
    ARRAY_START = "AS",
    ARRAY_END = "AE",
    OBJECT_START = "OS",
    OBJECT_END = "OE",


class SVal:
    attribute: str
    val: any
    outState: OutState

    def __init__(self, attribute = None, val = None, outState = None) -> None:
        self.attribute = attribute
        self.val = val
        self.outState = outState

    def to_dict(self):
        ret = {}
        if self.attribute is not None:
            ret['attribute'] = self.attribute
        if self.val is not None:
            ret['val'] = self.val.to_dict()
        if self.outState is not None:
            ret['outState'] = self.outState.value[0]
        return ret

OutputFN = typing.Callable[[str], None]

class JsonCollector:
    output: OutputFN
    indent: str
    commas: list[str]
    elements: list[int]
    props: JsonProps
    nextLine: str
    attribute: str

    def __init__(self, output: OutputFN, props: JsonProps = JsonProps()):
        self.output = output
        self.props = props
        self.indent = (" " * self.props.indent)
        self.nextLine = self.props.newLine if self.props.indent > 0 else ""
        self.commas = [""]
        self.elements = [0]
        self.attribute = ""
        # print("JsonCollector::__init__")

    def suffix(self) -> str:
        if self.elements[-1] > 0:
            return self.nextLine + (self.indent * (len(self.commas) - 1))
        else:
            return ""

    def append(self, sval: SVal):
        # print(f"append:{sval.to_dict()}-{this.commas}")
        if sval.outState is not None:
            if sval.outState == OutState.ARRAY_START:
                # print(f"Array-Start:{this.commas}-{this.suffix()}-{this.attribute}")
                self.output(
                    self.commas[-1] +
                    self.suffix() +
                    (self.attribute if self.attribute else "") +
                    "["
                )
                self.attribute = None
                self.commas[-1] = ","
                self.commas.append("")
                self.elements.append(0)
                return
            if sval.outState == OutState.ARRAY_END:
                self.commas.pop()
                self.output(self.suffix() + "]")
                self.elements.pop()
                return
            if sval.outState == OutState.OBJECT_START:
                self.output(
                    self.commas[-1] +
                    self.suffix() +
                    (self.attribute if self.attribute is not None else "") +
                    "{"
                )
                self.attribute = None
                self.commas[-1] = ","
                self.commas.append("")
                self.elements.append(0)
                return
            if sval.outState == OutState.OBJECT_END:
                self.commas.pop()
                self.output(self.suffix() + "}")
                self.elements.pop()
                return

        if sval.val is not None:
            self.elements[-1] = self.elements[-1] + 1
            # print(f"---[{sval.val}]-[{this.commas[-1]}]suffix[{this.suffix()}]attribute[{this.attribute}]val[{sval.val.toString()}]")
            out = self.commas[-1] + self.suffix() + (
                self.attribute if self.attribute is not None else "") + sval.val.toString()
            self.output(out)
            self.attribute = None
            self.commas[-1] = ","
        if (sval.attribute):
            self.elements[-1] = self.elements[-1] + 1
            self.attribute = json.dumps(
                sval.attribute) + ":" + (" " if len(self.indent) > 0 else "")


class HashCollector:
    # readonly hash: crypto.Hash = crypto.createHash("sha256");
    hash: any # hashlib._Hash

    def __init__(self, hash = None) -> None:
        self.hash = hashlib.new('sha256') if hash is None else hash

    def digest(self):
        return b58encode(self.hash.digest()).decode()

    def append(self, sval: SVal):
        if sval.outState is not None:
            return
        if sval.attribute is not None:
            tmp = sval.attribute.encode('utf-8')
            # print("attribute=", tmp)
            self.hash.update(tmp)
        if sval.val is not None:
            out = sval.val.asValue()
            if isinstance(out, datetime):
                out = jsIsoFormat(out)
            else:
                out = str(out)
            # print("val=", out)
            self.hash.update(out.encode("utf-8"))


def sortKeys(e: any, out: Callable[[SVal], None]):
    if isinstance(e, list):
        out(SVal(**{'outState': OutState.ARRAY_START}))
        for i in e:
            sortKeys(i, out)
        out(SVal(**{'outState': OutState.ARRAY_END}))
        return
    elif isinstance(e, dict):
        out(SVal(**{'outState': OutState.OBJECT_START}))
        keys = list(e.keys())
        keys.sort()
        # print("keys=", keys)
        for i in keys:
            out(SVal(**{'attribute': i}))
            sortKeys(e[i], out)

        out(SVal(**{'outState': OutState.OBJECT_END}))
        return
    else:
        # print(f"VAL[{e}]")
        out(SVal(**{'val': JsonValType(e)}))
        return


@dataclass
class JsonHash:
    jsonStr: str
    hash: str


# @unittest.mock.patch("datetime.now")
class SimpleEnvelope:
    simpleEnvelopeProps: SimpleEnvelopeProps
    envJsonStrings: list[str]
    envJsonC: JsonCollector
    envelope: EnvelopeT
    dataJsonHash: JsonHash
    datetime: datetime

    def __init__(self, env: SimpleEnvelopeProps):
        self.envJsonStrings = []
        self.simpleEnvelopeProps = env
        # self.simpleEnvelopeProps.jsonProp = JsonProps() if self.simpleEnvelopeProps.jsonProp is None else self.simpleEnvelopeProps.jsonProp
        # print(this.simpleEnvelopeProps.jsonProp)
        self.envJsonC = JsonCollector(
            lambda part: self.envJsonStrings.append(part),
            self.simpleEnvelopeProps.jsonProp
        )
        self.datetime = env.datetime if env.datetime is not None else datetime

    def asDataJson(self):
        return self.dataJsonHash.jsonStr

    def asJson(self):
        str = "".join(self.lazy().envJsonStrings)
        # Caution
        self.asJson = lambda: str
        return str

    def asEnvelope(self):
        # Caution
        self.asEnvelope = lambda: self.envelope
        return self.lazy().envelope

    def toDataJson(self) -> JsonHash:
        dataJsonStrings: list[str] = []
        dataJsonC = JsonCollector(lambda part: dataJsonStrings.append(part), JsonProps(**{
            'indent': self.simpleEnvelopeProps.jsonProp.indent,
            'newLine': "\n" + (" " * (self.simpleEnvelopeProps.jsonProp.indent * 2))
        }))
        dataHashC: HashCollector = None
        dataProcessor = None
        if self.simpleEnvelopeProps.id is not None:
            def dataProcessor(sval): return dataJsonC.append(sval)
        else:
            dataHashC = HashCollector()

            def my(sval: SVal):
                dataHashC.append(sval)
                dataJsonC.append(sval)
            dataProcessor = my

        sortKeys(self.simpleEnvelopeProps.data.data, dataProcessor)
        return JsonHash(**{
            'jsonStr': "".join(dataJsonStrings),
            'hash': dataHashC.digest() if dataHashC is not None else None
        })

    def lazy(self):
        self.dataJsonHash = self.toDataJson()
        t = 0
        if isinstance(self.simpleEnvelopeProps.t, datetime):
            date = self.simpleEnvelopeProps.t if self.simpleEnvelopeProps.t is not None else self.datetime.now()
            t = int(date.timestamp()*1000)
        elif isinstance(self.simpleEnvelopeProps.t, float) or isinstance(self.simpleEnvelopeProps.t, int):
            t = self.simpleEnvelopeProps.t
        else:
            t = int(self.datetime.now().timestamp()*1000)
        # print(">>>>>>", self.simpleEnvelopeProps.t.__class__)
        envelope: EnvelopeT = EnvelopeT.from_dict({
            'v': "A",
            'id': self.simpleEnvelopeProps.id if self.simpleEnvelopeProps.id is not None else f'{t}-{self.dataJsonHash.hash}',
            'src': self.simpleEnvelopeProps.src,
            'dst': self.simpleEnvelopeProps.dst if self.simpleEnvelopeProps.dst is not None else [],
            't': t,
            'ttl': self.simpleEnvelopeProps.ttl if self.simpleEnvelopeProps.ttl is not None else 10,
            'data': PayloadT.from_dict({
                'kind': self.simpleEnvelopeProps.data.kind,
                'data': {}
            }).to_dict()
        }).to_dict()
        envelope['data']['data'] = None
        class Processor:
            nextValue: bool
            data: str
            envJsonC: JsonCollector
            def __init__(self, data: str, envJsonC: JsonCollector) -> None:
                self.data = data
                self.nextValue = False
                self.envJsonC = envJsonC
            def append(self, sval: SVal):
                oval = sval
                if sval.attribute == "data":
                    self.nextValue = True
                elif self.nextValue:
                    if sval.val is not None and sval.val.asValue() == None:
                        oval = SVal(**{
                            'val': PlainValType(self.data),
                        })
                    self.nextValue = False
                self.envJsonC.append(oval)

        processor = Processor(self.dataJsonHash.jsonStr, self.envJsonC)
        sortKeys(envelope, lambda sval: processor.append(sval))

        self.envelope = EnvelopeT.from_dict({
            **envelope,
            'data': {
                **envelope['data'],
                # 'kind': envelope.data.kind,
                'data': self.simpleEnvelopeProps.data.data
            },
        })
        self.lazy = lambda: self
        return self


def simpleEnvelope(env: SimpleEnvelopeProps) -> SimpleEnvelope:
    return SimpleEnvelope(env)
