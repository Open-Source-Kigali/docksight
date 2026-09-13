package docker

import (
	"encoding/json"
	"reflect"
	"testing"

	"github.com/docker/docker/api/types/container"
)

func TestPortsFromListMapsDockerCasingToProtocolShape(t *testing.T) {
	got := PortsFromList([]container.Port{
		{IP: "0.0.0.0", PrivatePort: 5432, PublicPort: 5432, Type: "tcp"},
		{PrivatePort: 9187, Type: "tcp"},
		{IP: "::", PrivatePort: 53, PublicPort: 8053, Type: "udp"},
	})

	want := []Port{
		{Private: 5432, Public: "5432", Protocol: "tcp", IP: "0.0.0.0"},
		{Private: 9187, Public: "", Protocol: "tcp"},
		{Private: 53, Public: "8053", Protocol: "udp", IP: "::"},
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("PortsFromList() = %+v, want %+v", got, want)
	}
}

func TestPortsFromListNeverReturnsNil(t *testing.T) {
	for name, input := range map[string][]container.Port{"nil": nil, "empty": {}} {
		t.Run(name, func(t *testing.T) {
			got := PortsFromList(input)
			if got == nil || len(got) != 0 {
				t.Fatalf("PortsFromList(%s) = %#v, want an empty, non-nil slice", name, got)
			}
			raw, err := json.Marshal(got)
			if err != nil {
				t.Fatalf("marshal: %v", err)
			}
			if string(raw) != "[]" {
				t.Fatalf("JSON = %s, want []", raw)
			}
		})
	}
}

func TestPortJSONUsesProtocolKeysAndOmitsEmptyIP(t *testing.T) {
	raw, err := json.Marshal([]Port{
		{Private: 80, Public: "8080", Protocol: "tcp", IP: "127.0.0.1"},
		{Private: 443, Public: "", Protocol: "tcp"},
	})
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	want := `[{"private":80,"public":"8080","protocol":"tcp","ip":"127.0.0.1"},{"private":443,"public":"","protocol":"tcp"}]`
	if string(raw) != want {
		t.Fatalf("JSON = %s\nwant   %s", raw, want)
	}
}
