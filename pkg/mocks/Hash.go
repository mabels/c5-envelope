// Code generated by mockery 2.9.0. DO NOT EDIT.

package mocks

import mock "github.com/stretchr/testify/mock"

// Hash is an autogenerated mock type for the Hash type
type Hash struct {
	mock.Mock
}

// BlockSize provides a mock function with given fields:
func (_m *Hash) BlockSize() int {
	ret := _m.Called()

	var r0 int
	if rf, ok := ret.Get(0).(func() int); ok {
		r0 = rf()
	} else {
		r0 = ret.Get(0).(int)
	}

	return r0
}

// Reset provides a mock function with given fields:
func (_m *Hash) Reset() {
	_m.Called()
}

// Size provides a mock function with given fields:
func (_m *Hash) Size() int {
	ret := _m.Called()

	var r0 int
	if rf, ok := ret.Get(0).(func() int); ok {
		r0 = rf()
	} else {
		r0 = ret.Get(0).(int)
	}

	return r0
}

// Sum provides a mock function with given fields: b
func (_m *Hash) Sum(b []byte) []byte {
	ret := _m.Called(b)

	var r0 []byte
	if rf, ok := ret.Get(0).(func([]byte) []byte); ok {
		r0 = rf(b)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]byte)
		}
	}

	return r0
}

// Write provides a mock function with given fields: p
func (_m *Hash) Write(p []byte) (int, error) {
	ret := _m.Called(p)

	var r0 int
	if rf, ok := ret.Get(0).(func([]byte) int); ok {
		r0 = rf(p)
	} else {
		r0 = ret.Get(0).(int)
	}

	var r1 error
	if rf, ok := ret.Get(1).(func([]byte) error); ok {
		r1 = rf(p)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}
