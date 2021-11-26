package c5_envelope

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	hashLib "hash"
	"reflect"
	"sort"
	"strings"
	"time"

	"github.com/btcsuite/btcutil/base58"
	quicktype "github.com/mabels/c5-envelope/src/lang/golang"
)

const JSISOStringFormat = "2006-01-02T15:04:05.999Z07:00"

type ValType interface {
	toString() *string
	asValue() interface{}
}

type JsonValType struct {
	val interface{}
}

func (j JsonValType) toString() *string {
	out, err := json.Marshal(j.val)
	if err != nil {
		panic(err)
	}
	str := string(out)
	return &str
}

func (j JsonValType) asValue() interface{} {
	return j.val
}

type PlainValType struct {
	val *string
}

func (p PlainValType) toString() *string {
	return p.val
}

func (p PlainValType) asValue() interface{} {
	return p.val
}

type OutState int

const (
	NONE OutState = iota
	ARRAY_START
	ARRAY_END
	OBJECT_START
	OBJECT_END
)

func (o OutState) String() string {
	switch o {
	case NONE:
		return "NE"
	case ARRAY_START:
		return "AS"
	case ARRAY_END:
		return "AE"
	case OBJECT_START:
		return "OS"
	case OBJECT_END:
		return "OE"
	}
	return "unknown"
}

type SVal struct {
	attribute string
	val       ValType
	outState  OutState
}

type SvalFn func(prob SVal)

func sortKeys(e interface{}, out SvalFn) {
	_, isTime := e.(time.Time)
	k := reflect.Invalid
	if e != nil {
		k = reflect.TypeOf(e).Kind()
	}
	valOf := reflect.ValueOf(e)
	if k == reflect.Slice {
		out(SVal{outState: ARRAY_START})
		for i := 0; i < valOf.Len(); i++ {
			sortKeys(valOf.Index(i).Interface(), out)
		}
		out(SVal{outState: ARRAY_END})
		return
	} else if k == reflect.Struct && !isTime {
		out(SVal{outState: OBJECT_START})
		keys := make([]string, 0, valOf.NumField())
		m := make(map[string]interface{})
		for i := 0; i < valOf.NumField(); i++ {
			fl := valOf.Type().Field(i)
			if !fl.IsExported() {
				panic(fmt.Sprintf("Field '%v' is not exported!", fl.Name))
			}
			fieldName := fl.Name
			t, hasTag := fl.Tag.Lookup("json")
			if hasTag {
				fieldName = t
			}
			m[fieldName] = valOf.Field(i).Interface()
			keys = append(keys, fieldName)
		}
		sort.Strings(keys)
		for _, k := range keys {
			out(SVal{attribute: k})
			sortKeys(m[k], out)
		}
		out(SVal{outState: OBJECT_END})
		return
	}

	out(SVal{val: JsonValType{e}})
	return
}

type OutputFN func(str string)

type JsonProps struct {
	indent  int
	newline string
}

func NewJsonProps(nSpaces int, newLine string) *JsonProps {
	nl := "\n"
	if newLine != "" {
		nl = newLine
	}
	return &JsonProps{
		indent:  nSpaces,
		newline: nl,
	}
}

type JsonCollector struct {
	output    OutputFN
	indent    string
	commas    []string
	elements  []int
	props     *JsonProps
	nextLine  string
	attribute string
}

func NewJsonCollector(o OutputFN, p *JsonProps) *JsonCollector {
	props := p
	if props == nil {
		props = NewJsonProps(0, "")
	}

	nextLine := ""
	if props.indent > 0 {
		nextLine = props.newline
	}

	return &JsonCollector{
		output:    o,
		indent:    strings.Repeat(" ", props.indent),
		commas:    []string{""},
		elements:  []int{0},
		props:     props,
		nextLine:  nextLine,
		attribute: "",
	}
}

func (j *JsonCollector) Suffix() string {
	if j.elements[len(j.elements)-1] > 0 {
		return fmt.Sprintf("%v%v", j.nextLine, strings.Repeat(j.indent, len(j.commas)-1))
	}
	return ""
}

func (j *JsonCollector) Append(sVal SVal) {
	if sVal.outState != NONE {
		switch sVal.outState {
		case ARRAY_START:
			j.output(fmt.Sprintf("%v%v%v[", j.commas[len(j.commas)-1], j.Suffix(), j.attribute))
			j.attribute = ""
			j.commas[len(j.commas)-1] = ","
			j.commas = append(j.commas, "")
			j.elements = append(j.elements, 0)
		case ARRAY_END:
			j.commas = j.commas[:len(j.commas)-1]
			j.output(fmt.Sprintf("%v]", j.Suffix()))
			j.elements = j.elements[:len(j.elements)-1]
		case OBJECT_START:
			j.output(fmt.Sprintf("%v%v%v{", j.commas[len(j.commas)-1], j.Suffix(), j.attribute))
			j.attribute = ""
			j.commas[len(j.commas)-1] = ","
			j.commas = append(j.commas, "")
			j.elements = append(j.elements, 0)
		case OBJECT_END:
			j.commas = j.commas[:len(j.commas)-1]
			j.output(fmt.Sprintf("%v}", j.Suffix()))
			j.elements = j.elements[:len(j.elements)-1]
		}
	}

	if sVal.val != nil {
		j.elements[len(j.elements)-1]++
		j.output(fmt.Sprintf("%v%v%v%v", j.commas[len(j.commas)-1], j.Suffix(), j.attribute, *sVal.val.toString()))
		j.attribute = ""
		j.commas[len(j.commas)-1] = ","
	}

	if sVal.attribute != "" {
		j.elements[len(j.elements)-1]++

		b, err := json.Marshal(sVal.attribute)
		if err != nil {
			panic(err)
		}
		space := ""
		if len(j.indent) > 0 {
			space = " "
		}
		j.attribute = fmt.Sprintf("%v:%v", string(b), space)

	}
}

type HashCollector struct {
	hash hashLib.Hash
}

func NewHashCollector() *HashCollector {
	return &HashCollector{
		hash: sha256.New(),
	}
}

func (h *HashCollector) Digest() string {
	return base58.Encode(h.hash.Sum(nil))
}

func (h *HashCollector) Append(v SVal) {
	if v.outState != NONE {
		return
	}

	if v.attribute != "" {
		h.hash.Write([]byte(v.attribute))
	}

	if v.val != nil {
		vl := v.val.asValue()
		tval, isTime := vl.(time.Time)
		var t string
		if isTime {
			t = tval.Format(JSISOStringFormat)
		} else {
			t = fmt.Sprintf("%v", vl)
		}
		h.hash.Write([]byte(t))
	}
}

// type Payload struct {
// 	Kind string      `json:"kind"`
// 	Data interface{} `json:"data"`
// }

type SimpleEnvelopeProps struct {
	id       string
	src      string
	dst      []string
	t        time.Time
	ttl      int
	data     quicktype.PayloadT1
	jsonProp *JsonProps
}

// type Envelope struct {
// 	V    string   `json:"v"`
// 	Id   string   `json:"id"`
// 	Src  string   `json:"src"`
// 	Dst  []string `json:"dst"`
// 	T    int64    `json:"t"`
// 	Ttl  int      `json:"ttl"`
// 	Data Payload  `json:"data"`
// }

type JsonHash struct {
	JsonStr *string
	Hash    *string
}

type TimeGenerator interface {
	Now() time.Time
}

type realTimer struct{}

func (*realTimer) Now() time.Time {
	return time.Now()
}

type SimpleEnvelope struct {
	simpleEnvelopeProps *SimpleEnvelopeProps
	envJsonStrings      []string
	envJsonC            *JsonCollector
	Envelope            *quicktype.EnvelopeT
	DataJsonHash        *JsonHash
	timeGenerator       TimeGenerator
}

func NewSimpleEnvelope(env *SimpleEnvelopeProps) *SimpleEnvelope {
	se := &SimpleEnvelope{
		simpleEnvelopeProps: env,
		timeGenerator:       &realTimer{},
	}
	se.envJsonC = NewJsonCollector(func(part string) {
		se.envJsonStrings = append(se.envJsonStrings, part)
	}, se.simpleEnvelopeProps.jsonProp)
	return se
}

func (s *SimpleEnvelope) AsDataJson() *string {
	return s.DataJsonHash.JsonStr
}

func (s *SimpleEnvelope) toDataJson() *JsonHash {
	var dataJsonStrings []string

	indent := 0
	if s.simpleEnvelopeProps.jsonProp != nil {
		indent = s.simpleEnvelopeProps.jsonProp.indent
	}
	jpr := NewJsonProps(indent,
		fmt.Sprintf("\n%v", strings.Repeat(" ", 2*indent)))
	dataJsonC := NewJsonCollector(func(part string) {
		dataJsonStrings = append(dataJsonStrings, part)
	}, jpr)
	var dataHashC *HashCollector
	var dataProcessor SvalFn
	if s.simpleEnvelopeProps.id != "" {
		dataProcessor = func(sval SVal) {
			dataJsonC.Append(sval)
		}
	} else {
		dataHashC = NewHashCollector()
		dataProcessor = func(sval SVal) {
			dataHashC.Append(sval)
			dataJsonC.Append(sval)
		}
	}
	sortKeys(s.simpleEnvelopeProps.data.Data, dataProcessor)
	var hashVal *string
	if dataHashC != nil {
		hash := dataHashC.Digest()
		hashVal = &hash
	}
	jsonStr := strings.Join(dataJsonStrings[:], "")
	return &JsonHash{
		JsonStr: &jsonStr,
		Hash:    hashVal,
	}

}

func (s *SimpleEnvelope) Lazy() *SimpleEnvelope {
	s.DataJsonHash = s.toDataJson()
	tstmp := s.simpleEnvelopeProps.t
	if tstmp.IsZero() {
		tstmp = s.timeGenerator.Now()
	}
	t := tstmp.UnixMilli()

	id := s.simpleEnvelopeProps.id
	if id == "" {
		id = fmt.Sprintf("%v-%v", t, *s.DataJsonHash.Hash)
	}

	ttl := s.simpleEnvelopeProps.ttl
	if ttl == 0 {
		ttl = 10
	}
	envelope := &quicktype.EnvelopeT{
		V:   quicktype.V_A,
		ID:  id,
		Src: s.simpleEnvelopeProps.src,
		Dst: s.simpleEnvelopeProps.dst,
		T:   float64(t),
		TTL: float64(ttl),
		Data: quicktype.PayloadT1{
			Kind: s.simpleEnvelopeProps.data.Kind,
		},
	}

	nextValue := false
	sortKeys(*envelope, func(sval SVal) {
		oval := sval
		if sval.attribute == "data" {
			nextValue = true
		} else if nextValue {
			if sval.val != nil && sval.val.asValue() == nil {
				oval = SVal{
					val: PlainValType{val: s.AsDataJson()},
				}
			}
		}
		s.envJsonC.Append(oval)
	})
	s.Envelope = envelope
	s.Envelope.Data = envelope.Data
	s.Envelope.Data.Data = s.simpleEnvelopeProps.data.Data
	return s
}

func (s *SimpleEnvelope) AsJson() string {
	return strings.Join(s.Lazy().envJsonStrings[:], "")
}

func (s *SimpleEnvelope) AsEnvelope() *quicktype.EnvelopeT {
	return s.Lazy().Envelope
}
