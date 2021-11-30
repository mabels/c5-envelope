package c5

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
)

const JSISOStringFormat = "2006-01-02T15:04:05.999Z07:00"

type ValType interface {
	ToString() *string
	AsValue() interface{}
}

type JsonValType struct {
	Val interface{}
}

// type Dict T // map[string]interface{}

func (j JsonValType) ToString() *string {
	out, err := json.Marshal(j.Val)
	if err != nil {
		panic(err)
	}
	str := string(out)
	return &str
}

func (j JsonValType) AsValue() interface{} {
	return j.Val
}

type PlainValType struct {
	val *string
}

func (p PlainValType) ToString() *string {
	return p.val
}

func (p PlainValType) AsValue() interface{} {
	return p.val
}

type OutState string

const (
	NONE         = "NONE"
	ARRAY_START  = "AS"
	ARRAY_END    = "AE"
	OBJECT_START = "OS"
	OBJECT_END   = "OE"
)

func (o OutState) String() string {
	switch o {
	case NONE:
		return NONE
	case ARRAY_START:
		return ARRAY_START
	case ARRAY_END:
		return ARRAY_END
	case OBJECT_START:
		return OBJECT_START
	case OBJECT_END:
		return OBJECT_END
	}
	panic(fmt.Sprintf("Should not reached:%s", string(o)))
}

type SVal struct {
	attribute string
	val       ValType
	outState  OutState
	path      string
}

type SvalFn func(prob SVal)

func SortKeys(e interface{}, out SvalFn, paths ...string) {
	path := ""
	if len(paths) > 0 {
		path = paths[0]
	}
	_, isTime := e.(time.Time)
	k := reflect.Invalid
	if e != nil {
		k = reflect.TypeOf(e).Kind()
	}
	valOf := reflect.ValueOf(e)
	if k == reflect.Slice {
		out(SVal{path: path, outState: ARRAY_START})
		for i := 0; i < valOf.Len(); i++ {
			SortKeys(valOf.Index(i).Interface(), out, fmt.Sprintf("%s/%d", path, i))
		}
		out(SVal{outState: ARRAY_END, path: path})
		return
	} else if k == reflect.Struct && !isTime {
		out(SVal{outState: OBJECT_START, path: path})
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
		for _, key := range keys {
			sub := fmt.Sprintf("%s/%s", path, key)
			out(SVal{attribute: key, outState: NONE, path: sub})
			SortKeys(m[key], out, sub)
		}
		out(SVal{outState: OBJECT_END, path: path})
		return
	}
	if k == reflect.Map && !isTime {
		out(SVal{outState: OBJECT_START, path: path})
		mappe := e.(map[string]interface{})
		keys := make([]string, len(mappe))
		idx := 0
		for key := range mappe {
			keys[idx] = key
			idx++
		}
		sort.Strings(keys)
		for _, key := range keys {
			sub := fmt.Sprintf("%s/%s", path, key)
			out(SVal{attribute: key, outState: NONE, path: sub})
			SortKeys(mappe[key], out, sub)
		}
		out(SVal{outState: OBJECT_END, path: path})
		return
	}
	// else {
	//	fmt.Println("Reflect:", k)
	//}

	out(SVal{val: JsonValType{e}, outState: NONE, path: path})
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
		commas := len(j.commas)
		if commas > 0 {
			commas -= 1
		}
		return fmt.Sprintf("%v%v", j.nextLine, strings.Repeat(j.indent, commas))
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
		j.output(fmt.Sprintf("%v%v%v%v", j.commas[len(j.commas)-1], j.Suffix(), j.attribute, *sVal.val.ToString()))
		j.attribute = ""
		j.commas[len(j.commas)-1] = ","
	}

	if sVal.attribute != "" {
		eidx := len(j.elements)
		if eidx != 0 {
			eidx -= 1
		}
		j.elements[eidx]++

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
	// b := []byte{}
	return base58.Encode(h.hash.Sum(nil))
}

func (h *HashCollector) Append(sval SVal) {
	if sval.outState != NONE {
		return
	}

	// fmt.Println("SVAL", sval)
	if sval.attribute != "" {
		// fmt.Println("ATTRIB", sval.attribute)
		h.hash.Write([]byte(sval.attribute))
	}

	if sval.val != nil {
		vl := sval.val.AsValue()
		tval, isTime := vl.(time.Time)
		var t string
		if isTime {
			t = tval.Format(JSISOStringFormat)
		} else {
			t = fmt.Sprintf("%v", vl)
		}
		// fmt.Println("VAL", t)
		h.hash.Write([]byte(t))
	}
}

// type Payload struct {
// 	Kind string      `json:"kind"`
// 	Data interface{} `json:"data"`
// }

type SimpleEnvelopeProps struct {
	ID            string
	Src           string
	Dst           []string
	T             interface{} // int64 || time.Time
	TTL           int
	Data          interface{} // PayloadT1
	JsonProp      *JsonProps
	TimeGenerator TimeGenerator
}

type SimpleEnvelopeInternal struct {
	ID       string
	Src      string
	Dst      []string
	T        int64
	TTL      int
	Data     PayloadT1
	JsonProp *JsonProps
}

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
	simpleEnvelopeProps *SimpleEnvelopeInternal
	envJsonStrings      []string
	envJsonString       *string
	envJsonC            *JsonCollector
	Envelope            *EnvelopeT
	DataJsonHash        *JsonHash
}

func NewSimpleEnvelope(env *SimpleEnvelopeProps) *SimpleEnvelope {
	var tstmp int64
	if env.TimeGenerator == nil {
		env.TimeGenerator = &realTimer{}
	}
	switch v := env.T.(type) {
	case int:
		tstmp = int64(v)
	case int64:
		tstmp = v
		// v is an int here, so e.g. v + 1 is possible.
	case float64:
		tstmp = int64(v)
	case time.Time:
		tstmp = v.UnixMilli()
	case nil:
		tstmp = env.TimeGenerator.Now().UnixMilli()
	default:
		panic(fmt.Sprintf("unhandled Type:%t", v))
	}

	payt := PayloadT1{}
	switch v := env.Data.(type) {
	case map[string]interface{}:
		FromDictPayloadT1(v, &payt)
	case PayloadT1:
		payt = v
	case PayloadT:
		payt = PayloadT1(v)
	default:
		panic("unhandled Type")
	}
	sei := SimpleEnvelopeInternal{
		ID:       env.ID,
		Src:      env.Src,
		Dst:      env.Dst,
		T:        tstmp,
		TTL:      env.TTL,
		Data:     payt,
		JsonProp: env.JsonProp,
	}
	se := &SimpleEnvelope{
		simpleEnvelopeProps: &sei,
		// envJsonStrings:      make([]string, 1000),
	}
	se.envJsonC = NewJsonCollector(func(part string) {
		se.envJsonStrings = append(se.envJsonStrings, part)
	}, se.simpleEnvelopeProps.JsonProp)
	return se
}

func (s *SimpleEnvelope) AsDataJson() *string {
	return s.DataJsonHash.JsonStr
}

func (s *SimpleEnvelope) toDataJson() *JsonHash {
	var dataJsonStrings []string

	indent := 0
	if s.simpleEnvelopeProps.JsonProp != nil {
		indent = s.simpleEnvelopeProps.JsonProp.indent
	}
	jpr := NewJsonProps(indent,
		fmt.Sprintf("\n%v", strings.Repeat(" ", 2*indent)))
	dataJsonC := NewJsonCollector(func(part string) {
		dataJsonStrings = append(dataJsonStrings, part)
	}, jpr)
	var dataHashC *HashCollector
	var dataProcessor SvalFn
	if s.simpleEnvelopeProps.ID != "" {
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
	SortKeys(s.simpleEnvelopeProps.Data.Data, dataProcessor)
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

func (s *SimpleEnvelope) lazy() *SimpleEnvelope {
	s.DataJsonHash = s.toDataJson()
	t := s.simpleEnvelopeProps.T
	id := s.simpleEnvelopeProps.ID
	if id == "" {
		id = fmt.Sprintf("%v-%v", t, *s.DataJsonHash.Hash)
	}

	ttl := s.simpleEnvelopeProps.TTL
	if ttl == 0 {
		ttl = 10
	}
	envelope := &EnvelopeT{
		V:   V_A,
		ID:  id,
		Src: s.simpleEnvelopeProps.Src,
		Dst: s.simpleEnvelopeProps.Dst,
		T:   float64(t),
		TTL: float64(ttl),
		Data: PayloadT1{
			Kind: s.simpleEnvelopeProps.Data.Kind,
		},
	}

	SortKeys(*envelope, func(sval SVal) {
		oval := sval
		// /data/date

		// fmt.Fprintln(os.Stderr, "Path=", sval.path, sval.attribute)
		if strings.HasSuffix(sval.path, "/data/data") && sval.attribute == "" {
			// fmt.Fprintln(os.Stderr, "data/data=", sval)
			if sval.outState.String() == OBJECT_START {
				oval = SVal{
					outState: NONE,
					val:      PlainValType{val: s.AsDataJson()},
				}
			} else {
				return
			}
		}
		// if sval.val == nil && sval.outState.String() == OBJECT_START {
		// 	// fmt.Fprintln(os.Stderr, "XXX")
		// }
		s.envJsonC.Append(oval)
	})
	s.Envelope = envelope
	s.Envelope.Data = envelope.Data
	s.Envelope.Data.Data = s.simpleEnvelopeProps.Data.Data
	// fmt.Fprintln(os.Stderr, s.Envelope)
	// fmt.Fprintln(os.Stderr, *s.AsDataJson())
	return s
}

func (s *SimpleEnvelope) AsJson() *string {
	if s.envJsonString == nil {
		str := strings.Join(s.lazy().envJsonStrings, "")
		s.envJsonString = &str
	}
	return s.envJsonString
}

func (s *SimpleEnvelope) AsEnvelope() *EnvelopeT {
	return s.lazy().Envelope
}
