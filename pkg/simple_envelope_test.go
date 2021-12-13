package c5

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"

	ogs "github.com/mabels/object-graph-streamer"
)

type SimpleEnvelopeSuite struct {
	suite.Suite
	mockedSvalFn *SvalFnMock
}

func (s *SimpleEnvelopeSuite) SetupTest() {
	s.mockedSvalFn = &SvalFnMock{}
}

var mtimer = &mockedTimer{}

// ####################
// ## sortKeys tests ##
// ####################
func (s *SimpleEnvelopeSuite) TestSimpleTAsLiteral() {
	props := SimpleEnvelopeProps{
		T: 4711,
		Data: map[string]interface{}{
			"kind": "Kind",
			"data": map[string]interface{}{"Hallo": 1},
		},
	}
	n := NewSimpleEnvelope(&props)
	assert.Equal(s.T(), n.AsEnvelope().Data.Kind, "Kind")
	assert.Equal(s.T(), n.AsEnvelope().Data.Data, map[string]interface{}{"Hallo": 1})
	assert.Equal(s.T(), n.AsEnvelope().T, float64(4711))
}

func (s *SimpleEnvelopeSuite) TestSimpleTAsObj() {
	now := time.Now()
	pay := PayloadT{}
	FromDictPayloadT(map[string]interface{}{
		"kind": "Kind",
		"data": map[string]interface{}{"Hallo": 1},
	}, &pay)
	props := SimpleEnvelopeProps{
		T:    now,
		Data: pay,
	}
	n := NewSimpleEnvelope(&props)
	assert.Equal(s.T(), n.AsEnvelope().Data.Kind, "Kind")
	assert.Equal(s.T(), n.AsEnvelope().Data.Data, map[string]interface{}{"Hallo": 1})
	assert.Equal(s.T(), n.AsEnvelope().T, float64(now.UnixMilli()))
}

// ##########################
// ## SimpleEnvelope tests ##
// ##########################
func (s *SimpleEnvelopeSuite) TestSerialization() {
	typ := SampleNameDate{}
	FromDictSampleNameDate(map[string]interface{}{
		"name": "object",
		"date": "2021-05-20",
	}, &typ)
	// s.Assertions.Equal(typ.ToDict(), []string{})
	props := &SimpleEnvelopeProps{
		ID:  "1624140000000-4a2a6fb97b3afe6a7ca4c13457c441664c7f6a6c2ea7782e1f2dea384cf97cb8",
		Src: "test case",
		Data: PayloadT1{
			Data: typ.ToDict(),
			Kind: "test",
		},
		Dst: []string{},
		T:   time.UnixMilli(444),
		TTL: 10,
	}
	se := NewSimpleEnvelope(props)
	assert.JSONEq(s.T(), *se.AsJson(), `{"data":{"data":{"date":"2021-05-20","name":"object"},"kind":"test"},"dst":[],"id":"1624140000000-4a2a6fb97b3afe6a7ca4c13457c441664c7f6a6c2ea7782e1f2dea384cf97cb8","src":"test case","t":444,"ttl":10,"v":"A"}`)
}

type mockedTimer struct{}

func (*mockedTimer) Now() time.Time {
	return time.UnixMilli(1624140000000)
}

func (s *SimpleEnvelopeSuite) TestSerializationWithHash() {
	typ := SampleNameDate{}
	FromDictSampleNameDate(map[string]interface{}{
		"name": "object",
		"date": "2021-05-20",
	}, &typ)
	props := &SimpleEnvelopeProps{
		Src: "test case",
		Data: PayloadT1{
			Kind: "test",
			Data: typ.ToDict(),
		},
		Dst:           []string{},
		TTL:           10,
		TimeGenerator: mtimer,
	}
	se := NewSimpleEnvelope(props)
	assert.JSONEq(s.T(), *se.AsJson(), `{"data":{"data":{"date":"2021-05-20","name":"object"},"kind":"test"},"dst":[],"id":"1624140000000-BbYxQMurpUmj1W6E4EwYM79Rm3quSz1wwtNZDSsFt1bp","src":"test case","t":1624140000000,"ttl":10,"v":"A"}`)
}

func (s *SimpleEnvelopeSuite) TestSerializationWithIndent() {
	b := []byte(`{"data":{"data":{"date":"2021-05-20","name":"object"},"kind":"test"},"dst":[],"id":"1624140000000-BbYxQMurpUmj1W6E4EwYM79Rm3quSz1wwtNZDSsFt1bp","src":"test case","t":1624140000000,"ttl":10,"v":"A"}`)
	var out bytes.Buffer
	err := json.Indent(&out, b, "", "  ")
	assert.NoError(s.T(), err)

	typ := SampleNameDate{}
	FromDictSampleNameDate(map[string]interface{}{
		"name": "object",
		"date": "2021-05-20",
	}, &typ)
	props := &SimpleEnvelopeProps{
		Src: "test case",
		Data: PayloadT1{
			Kind: "test",
			Data: typ.ToDict(),
		},
		Dst:           []string{},
		TTL:           10,
		JsonProp:      ogs.NewJsonProps(2, ""),
		TimeGenerator: mtimer,
	}
	se := NewSimpleEnvelope(props)
	assert.Equal(s.T(), *se.AsJson(), out.String())
}

func (s *SimpleEnvelopeSuite) TestMissingDataInEnvelope() {
	typ := SampleY{Y: 4}
	message := &SimpleEnvelopeProps{
		Src: "test case",
		Data: PayloadT1{
			Kind: "kind",
			Data: typ.ToDict(),
		},
		TimeGenerator: mtimer,
	}
	se := NewSimpleEnvelope(message)

	var ref EnvelopeT
	assert.NoError(s.T(), json.Unmarshal([]byte(*se.AsJson()), &ref))

	env := NewSimpleEnvelope(&SimpleEnvelopeProps{
		ID:            ref.ID,
		Src:           ref.Src,
		Dst:           ref.Dst,
		T:             time.UnixMilli(int64(ref.T)),
		TTL:           int(ref.TTL),
		Data:          ref.Data,
		JsonProp:      nil,
		TimeGenerator: mtimer,
	})

	envData := env.AsEnvelope()
	assert.Equal(s.T(), message.Data.(PayloadT1).Kind, envData.Data.Kind)

	yEnv := EnvelopeT{}
	ok := FromDictEnvelopeT(env.AsEnvelope().ToDict(), &yEnv)
	//fmt.Fprintln(os.Stderr, ok)
	// fmt.Fprintln(os.Stderr, yEnv)
	assert.Nil(s.T(), ok)

	mapVal := env.AsEnvelope().ToDict()["data"].(map[string]interface{})["data"].(map[string]interface{})
	// assert.True(s.T(), ok)

	yVal := SampleY{}
	x, _ := json.MarshalIndent(yEnv, "", "  ")
	fmt.Fprintln(os.Stderr, string(x))
	FromDictSampleY(yEnv.Data.Data, &yVal)
	assert.EqualValues(s.T(), yVal.Y, mapVal["y"])
}

func (s *SimpleEnvelopeSuite) TestSimpleEnvelopeWithId() {
	typ := SampleY{Y: 4}
	message := &SimpleEnvelopeProps{
		ID:  "myId",
		Src: "test case",
		Data: PayloadT1{
			Kind: "kind",
			Data: typ.ToDict(),
		},
		TimeGenerator: mtimer,
		IdGenerator:   HashIdGenerator,
	}
	env := NewSimpleEnvelope(message).AsEnvelope()

	assert.Equal(s.T(), env.ID, "myId")
}

func (s *SimpleEnvelopeSuite) TestSimpleEnvelopeWithDefaultHashGenerator() {
	typ := SampleY{Y: 4}
	message := &SimpleEnvelopeProps{
		T:   123,
		Src: "test case",
		Data: PayloadT1{
			Kind: "kind",
			Data: typ.ToDict(),
		},
		TimeGenerator: mtimer,
	}
	env := NewSimpleEnvelope(message).AsEnvelope()

	assert.Equal(s.T(), env.ID, "123-GUKeStj4aGQRju7p2Dzf31Qi2d2MVuRCw68H1c8gMCnQ")
}

func (s *SimpleEnvelopeSuite) TestSimpleEnvelopeWithCustomIdGenerator() {
	typ := SampleY{Y: 4}
	message := &SimpleEnvelopeProps{
		T:   123,
		Src: "test case",
		Data: PayloadT1{
			Kind: "kind",
			Data: typ.ToDict(),
		},
		TimeGenerator: mtimer,
		IdGenerator:   HashIdGenerator,
	}
	env := NewSimpleEnvelope(message).AsEnvelope()

	assert.Equal(s.T(), env.ID, "GUKeStj4aGQRju7p2Dzf31Qi2d2MVuRCw68H1c8gMCnQ")
}

func TestSimpleEnvelopeSuite(t *testing.T) {
	suite.Run(t, new(SimpleEnvelopeSuite))
}

type SvalFnMock struct {
	mock.Mock
}

// Execute provides a mock function with given fields: prob
func (_m *SvalFnMock) Execute(prob ogs.SVal) {
	_m.Called(prob)
}
