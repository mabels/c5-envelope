// This file was generated from JSON Schema using quicktype, do not modify it directly.
// To parse and unparse this JSON data, add this code to your project and do:
//
//    payload, err := UnmarshalPayload(bytes)
//    payload, err := FromDictPayload(map[string]interface{})
//    bytes, err = payload.Marshal()
//    map[string]interface{}, err = payload.ToDict()
//
//    envelope, err := UnmarshalEnvelope(bytes)
//    envelope, err := FromDictEnvelope(map[string]interface{})
//    bytes, err = envelope.Marshal()
//    map[string]interface{}, err = envelope.ToDict()
//
//    sampleNameDate, err := UnmarshalSampleNameDate(bytes)
//    sampleNameDate, err := FromDictSampleNameDate(map[string]interface{})
//    bytes, err = sampleNameDate.Marshal()
//    map[string]interface{}, err = sampleNameDate.ToDict()
//
//    sampleY, err := UnmarshalSampleY(bytes)
//    sampleY, err := FromDictSampleY(map[string]interface{})
//    bytes, err = sampleY.Marshal()
//    map[string]interface{}, err = sampleY.ToDict()
//
//    payloadT, err := UnmarshalPayloadT(bytes)
//    payloadT, err := FromDictPayloadT(map[string]interface{})
//    bytes, err = payloadT.Marshal()
//    map[string]interface{}, err = payloadT.ToDict()
//
//    t, err := UnmarshalT(bytes)
//    t, err := FromDictT(map[string]interface{})
//    bytes, err = t.Marshal()
//    map[string]interface{}, err = t.ToDict()
//
//    envelopeT, err := UnmarshalEnvelopeT(bytes)
//    envelopeT, err := FromDictEnvelopeT(map[string]interface{})
//    bytes, err = envelopeT.Marshal()
//    map[string]interface{}, err = envelopeT.ToDict()
//
//    payloadT1, err := UnmarshalPayloadT1(bytes)
//    payloadT1, err := FromDictPayloadT1(map[string]interface{})
//    bytes, err = payloadT1.Marshal()
//    map[string]interface{}, err = payloadT1.ToDict()
//
//    t1, err := UnmarshalT1(bytes)
//    t1, err := FromDictT1(map[string]interface{})
//    bytes, err = t1.Marshal()
//    map[string]interface{}, err = t1.ToDict()

package c5

import "fmt"
import "errors"
import "encoding/json"

type T map[string]interface{}

type T1 map[string]interface{}

type PayloadT struct {
	Data map[string]interface{} `json:"data"`
	Kind string                 `json:"kind"`
}

func (r *PayloadT) Marshal() ([]byte, error) {
	return json.Marshal(r)
}

func UnmarshalPayloadT(data []byte) (*PayloadT, error) {
	dict := map[string]interface{}{}
	err := json.Unmarshal(data, &dict)
	if err != nil {
		return nil, err
	}
	ins := PayloadT{}
	return &ins, FromDictPayloadT(dict, &ins)
}

func (r *PayloadT) ToDict() map[string]interface{} {
	dict := map[string]interface{}{}
	{
		tmp := map[string]interface{}{}
		for key, i := range r.Data {
			tmp[key] = i.(interface{})
		}
		dict["data"] = tmp
	}
	dict["kind"] = r.Kind
	return dict
}

func FromDictPayloadT(data map[string]interface{}, r *PayloadT) error {
	r.Data = map[string]interface{}{}
	for key, i := range data["data"].(map[string]interface{}) {
		r.Data[key] = i.(interface{})
	}
	r.Kind = data["kind"].(string)
	return nil
}

type EnvelopeT struct {
	Data PayloadT1 `json:"data"`
	Dst  []string  `json:"dst"` 
	ID   string    `json:"id"`  
	Src  string    `json:"src"` 
	T    float64   `json:"t"`   
	TTL  float64   `json:"ttl"` 
	V    V         `json:"v"`   
}

func (r *EnvelopeT) Marshal() ([]byte, error) {
	return json.Marshal(r)
}

func UnmarshalEnvelopeT(data []byte) (*EnvelopeT, error) {
	dict := map[string]interface{}{}
	err := json.Unmarshal(data, &dict)
	if err != nil {
		return nil, err
	}
	ins := EnvelopeT{}
	return &ins, FromDictEnvelopeT(dict, &ins)
}

func (r *EnvelopeT) ToDict() map[string]interface{} {
	dict := map[string]interface{}{}
	dict["data"] = r.Data.ToDict()
	{
		tmp := make([]string, len(r.Dst))
		for idx, i := range r.Dst {
			tmp[idx] = i
		}
		dict["dst"] = tmp
	}
	dict["id"] = r.ID
	dict["src"] = r.Src
	dict["t"] = r.T
	dict["ttl"] = r.TTL
	dict["v"] = ToV(r.V)
	return dict
}

func FromDictEnvelopeT(data map[string]interface{}, r *EnvelopeT) error {
	{
		err := FromDictPayloadT1(data["data"].(map[string]interface{}), &r.Data)
		if err != nil {
			return err
		}
	}
	switch v := data["dst"].(type) {
		case []interface{}: {
			r.Dst= make([]string, len(v))
			for idx, i := range v {
				r.Dst[idx] = i.(string)
			}
		}
		default: {
			return errors.New("unknown array type")
		}
	}
	r.ID = data["id"].(string)
	r.Src = data["src"].(string)
	switch v := data["t"].(type) {
		case int: {
			r.T = float64(v)
		}
		case int32: {
			r.T = float64(v)
		}
		case int64: {
			r.T = float64(v)
		}
		case uint: {
			r.T = float64(v)
		}
		case uint32: {
			r.T = float64(v)
		}
		case uint64: {
			r.T = float64(v)
		}
		case float32: {
			r.T = float64(v)
		}
		case float64: {
			r.T = float64(v)
		}
		default: {
			return errors.New("unknown number coerces")
		}
	}
	switch v := data["ttl"].(type) {
		case int: {
			r.TTL = float64(v)
		}
		case int32: {
			r.TTL = float64(v)
		}
		case int64: {
			r.TTL = float64(v)
		}
		case uint: {
			r.TTL = float64(v)
		}
		case uint32: {
			r.TTL = float64(v)
		}
		case uint64: {
			r.TTL = float64(v)
		}
		case float32: {
			r.TTL = float64(v)
		}
		case float64: {
			r.TTL = float64(v)
		}
		default: {
			return errors.New("unknown number coerces")
		}
	}
	{
		var err error
		r.V, err = FromV(data["v"].(string))
		if err != nil {
			return err;
		}
	}
	return nil
}

type PayloadT1 struct {
	Data map[string]interface{} `json:"data"`
	Kind string                 `json:"kind"`
}

func (r *PayloadT1) Marshal() ([]byte, error) {
	return json.Marshal(r)
}

func UnmarshalPayloadT1(data []byte) (*PayloadT1, error) {
	dict := map[string]interface{}{}
	err := json.Unmarshal(data, &dict)
	if err != nil {
		return nil, err
	}
	ins := PayloadT1{}
	return &ins, FromDictPayloadT1(dict, &ins)
}

func (r *PayloadT1) ToDict() map[string]interface{} {
	dict := map[string]interface{}{}
	{
		tmp := map[string]interface{}{}
		for key, i := range r.Data {
			tmp[key] = i.(interface{})
		}
		dict["data"] = tmp
	}
	dict["kind"] = r.Kind
	return dict
}

func FromDictPayloadT1(data map[string]interface{}, r *PayloadT1) error {
	r.Data = map[string]interface{}{}
	for key, i := range data["data"].(map[string]interface{}) {
		r.Data[key] = i.(interface{})
	}
	r.Kind = data["kind"].(string)
	return nil
}

type SampleNameDate struct {
	Date string `json:"date"`
	Name string `json:"name"`
}

func (r *SampleNameDate) Marshal() ([]byte, error) {
	return json.Marshal(r)
}

func UnmarshalSampleNameDate(data []byte) (*SampleNameDate, error) {
	dict := map[string]interface{}{}
	err := json.Unmarshal(data, &dict)
	if err != nil {
		return nil, err
	}
	ins := SampleNameDate{}
	return &ins, FromDictSampleNameDate(dict, &ins)
}

func (r *SampleNameDate) ToDict() map[string]interface{} {
	dict := map[string]interface{}{}
	dict["date"] = r.Date
	dict["name"] = r.Name
	return dict
}

func FromDictSampleNameDate(data map[string]interface{}, r *SampleNameDate) error {
	r.Date = data["date"].(string)
	r.Name = data["name"].(string)
	return nil
}

type SampleY struct {
	Y float64 `json:"y"`
}

func (r *SampleY) Marshal() ([]byte, error) {
	return json.Marshal(r)
}

func UnmarshalSampleY(data []byte) (*SampleY, error) {
	dict := map[string]interface{}{}
	err := json.Unmarshal(data, &dict)
	if err != nil {
		return nil, err
	}
	ins := SampleY{}
	return &ins, FromDictSampleY(dict, &ins)
}

func (r *SampleY) ToDict() map[string]interface{} {
	dict := map[string]interface{}{}
	dict["y"] = r.Y
	return dict
}

func FromDictSampleY(data map[string]interface{}, r *SampleY) error {
	switch v := data["y"].(type) {
		case int: {
			r.Y = float64(v)
		}
		case int32: {
			r.Y = float64(v)
		}
		case int64: {
			r.Y = float64(v)
		}
		case uint: {
			r.Y = float64(v)
		}
		case uint32: {
			r.Y = float64(v)
		}
		case uint64: {
			r.Y = float64(v)
		}
		case float32: {
			r.Y = float64(v)
		}
		case float64: {
			r.Y = float64(v)
		}
		default: {
			return errors.New("unknown number coerces")
		}
	}
	return nil
}

type V string
const (
	V_A V = "A"
)
func FromV(v string) (V, error) {
	switch v {
		case "A":
			return V_A, nil
		default:
			return V_A, errors.New(fmt.Sprintf("Enum not found for:%s", v))
	}
}
func ToV(v V) string {
	switch v {
		case V_A:
			return "A"
	}
	panic("enum with a unkown value")
}
