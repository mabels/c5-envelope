package c5

import (
	"fmt"
	"strings"
	"time"

	ogs "github.com/mabels/object-graph-streamer"
)

const JSISOStringFormat = "2006-01-02T15:04:05.999Z07:00"

type GeneratorProps struct {
	SimpleEnvelopeProps *SimpleEnvelopeInternal
	Hash                *string
	T                   int64
}

type IdGeneratorFn func(GeneratorProps) string

type SimpleEnvelopeProps struct {
	ID            string
	Src           string
	Dst           []string
	T             interface{} // int64 || time.Time
	TTL           int
	Data          interface{} // PayloadT1
	JsonProp      *ogs.JsonProps
	TimeGenerator TimeGenerator
	IdGenerator   IdGeneratorFn
}

type SimpleEnvelopeInternal struct {
	ID          string
	Src         string
	Dst         []string
	T           int64
	TTL         int
	Data        PayloadT1
	JsonProp    *ogs.JsonProps
	IdGenerator IdGeneratorFn
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

func THashIdGenerator(props GeneratorProps) string {
	return fmt.Sprintf("%v-%s", props.T, *props.Hash)
}

func HashIdGenerator(props GeneratorProps) string {
	return *props.Hash
}

type SimpleEnvelope struct {
	simpleEnvelopeProps *SimpleEnvelopeInternal
	envJsonStrings      []string
	envJsonString       *string
	envJsonC            *ogs.JsonCollector
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
	idGenerator := env.IdGenerator
	if idGenerator == nil {
		idGenerator = THashIdGenerator
	}
	sei := SimpleEnvelopeInternal{
		ID:          env.ID,
		Src:         env.Src,
		Dst:         env.Dst,
		T:           tstmp,
		TTL:         env.TTL,
		Data:        payt,
		JsonProp:    env.JsonProp,
		IdGenerator: idGenerator,
	}
	se := &SimpleEnvelope{
		simpleEnvelopeProps: &sei,
		// envJsonStrings:      make([]string, 1000),
	}
	se.envJsonC = ogs.NewJsonCollector(func(part string) {
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
		indent = s.simpleEnvelopeProps.JsonProp.Indent
	}
	jpr := ogs.NewJsonProps(indent,
		fmt.Sprintf("\n%v", strings.Repeat(" ", 2*indent)))
	dataJsonC := ogs.NewJsonCollector(func(part string) {
		dataJsonStrings = append(dataJsonStrings, part)
	}, jpr)
	var dataHashC *ogs.HashCollector
	var dataProcessor ogs.SvalFn
	if s.simpleEnvelopeProps.ID != "" {
		dataProcessor = func(sval ogs.SVal) {
			dataJsonC.Append(sval)
		}
	} else {
		dataHashC = ogs.NewHashCollector()
		dataProcessor = func(sval ogs.SVal) {
			dataHashC.Append(sval)
			dataJsonC.Append(sval)
		}
	}
	ogs.ObjectGraphStreamer(s.simpleEnvelopeProps.Data.Data, dataProcessor)
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
		id = s.simpleEnvelopeProps.IdGenerator(
			GeneratorProps{T: t, Hash: s.DataJsonHash.Hash, SimpleEnvelopeProps: s.simpleEnvelopeProps},
		)
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

	ogs.ObjectGraphStreamer(*envelope, func(sval ogs.SVal) {
		oval := sval
		paths := strings.Join(sval.Paths, "")
		// fmt.Fprintln(os.Stderr, "Path=", paths, sval.OutState.String())
		// fmt.Fprintln(os.Stderr, "Path=", paths, sval.OutState.String(), strings.HasPrefix(paths, "{data{data"))
		if strings.HasPrefix(paths, "{data{data") && sval.OutState != ogs.ATTRIBUTE {
			// fmt.Fprintln(os.Stderr, "Path=", paths, sval.OutState.String())
			if sval.OutState.String() == ogs.OBJECT_START {
				oval = ogs.SVal{
					OutState: ogs.VALUE,
					Val:      ogs.PlainValType{Val: s.AsDataJson()},
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
