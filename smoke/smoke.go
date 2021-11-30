package main

import (
	"encoding/json"
	"fmt"

	c5 "github.com/mabels/c5-envelope/pkg"
	//c5 "github.com/mabels/c5-envelope/pkg"
)

func main() {
	sampleY := c5.SampleY{}
	c5.FromDictSampleY(map[string]interface{}{
		"y": 4,
	}, &sampleY)
	pay := c5.PayloadT1{}
	c5.FromDictPayloadT1(map[string]interface{}{
		"kind": "kind",
		"data": sampleY.ToDict(),
	}, &pay)
	env := c5.EnvelopeT{}
	c5.FromDictEnvelopeT(map[string]interface{}{
		"v":    "A",
		"id":   "id",
		"src":  "envelope",
		"dst":  []string{"xx"},
		"t":    4711,
		"ttl":  10,
		"data": pay.ToDict(),
	}, &env)

	jsonPayt, _ := json.Marshal(map[string]interface{}{
		"kind": "kind",
		"data": map[string]interface{}{
			"y": 4,
		},
	})
	payt, _ := c5.UnmarshalPayloadT1(jsonPayt)

	jsonEnvt, _ := json.Marshal(map[string]interface{}{
		"v":    "A",
		"id":   "id",
		"src":  "envelope",
		"dst":  []string{"xx"},
		"t":    4711,
		"ttl":  10,
		"data": payt.ToDict(),
	})
	// fmt.Fprintln(os.Stderr, "WHAT:", string(jsonEnvt))
	envt, _ := c5.UnmarshalEnvelopeT(jsonEnvt)
	if envt.ID != "id" {
		panic("envt not ok")
	}
	if envt.Data.Kind != "kind" {
		panic("envt not ok")
	}

	message := c5.SimpleEnvelopeProps{
		Src:  "test case",
		Data: *payt,
	}

	ref, _ := c5.UnmarshalEnvelopeT([]byte(*c5.NewSimpleEnvelope(&message).AsJson()))
	refStr, _ := json.Marshal(ref.ToDict())
	envProps := c5.SimpleEnvelopeProps{
		ID:   ref.ID,
		Src:  ref.Src,
		Dst:  ref.Dst,
		T:    ref.T,
		TTL:  int(ref.TTL),
		Data: *payt,
	}
	env = *c5.NewSimpleEnvelope(&envProps).AsEnvelope()
	envStr := c5.NewSimpleEnvelope(&c5.SimpleEnvelopeProps{
		ID:   env.ID,
		Src:  env.Src,
		Dst:  env.Dst,
		T:    env.T,
		TTL:  int(env.TTL),
		Data: env.Data.ToDict(),
	}).AsJson()
	if string(refStr) != *envStr {
		panic(fmt.Sprintf("ref=%s env=%s", string(refStr), *envStr))
	}
	fmt.Println("Ready for production")
}
