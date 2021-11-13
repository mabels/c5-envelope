import * as c5 from "c5-envelope";

const pay: c5.Payload<{ y: number }> = {
  kind: "kind",
  data: { y: 4 },
};

const env: c5.Envelope<{ y: number }> = {
  v: "A",
  id: "id",
  src: "envelope",
  dst: [],
  t: 4711,
  ttl: 10,
  data: pay,
};

const payt: c5.PayloadT = c5.Convert.toPayload(
  JSON.stringify({
    kind: "kind",
    data: { y: 4 },
  })
);

const envt: c5.EnvelopeT = c5.Convert.toEnvelope(
  JSON.stringify({
    v: "A",
    id: "id",
    src: "envelope",
    dst: [],
    t: 4711,
    ttl: 10,
    data: payt,
  })
);

const message: c5.SimpleEnvelopeProps = {
  src: "test case",
  data: payt,
};

const ref = c5.Convert.toEnvelope(c5.simpleEnvelope(message).asJson());
const refStr = JSON.stringify(ref);
const envStr = c5.simpleEnvelope(c5.simpleEnvelope(ref).asEnvelope()).asJson();
if (refStr !== envStr) {
  throw Error(`ref=${refStr} env=${envStr}`);
}
console.log("Ready for production");
