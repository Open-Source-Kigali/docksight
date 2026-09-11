package communication

import (
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"testing"
)

// fixturesDir is the shared protocol contract, four levels up from this package.
const fixturesDir = "../../../../packages/protocol/fixtures"

// TestHostMetricsMatchesProtocolFixture guards the one contract no compiler can
// check: the Go payload structs are hand-mirrored from @docksight/protocol, so
// a renamed or dropped field would silently change the wire format.
//
// Each fixture is decoded into the Go struct and re-encoded; the result must be
// byte-equivalent (as JSON) to the fixture. A field the struct does not know
// about is dropped on re-encode, and a renamed field appears under the wrong
// key — either way the comparison fails.
func TestHostMetricsMatchesProtocolFixture(t *testing.T) {
	fixtures := []string{
		"metrics.host.linux.json",
		"metrics.host.windows.json",
	}

	for _, name := range fixtures {
		t.Run(name, func(t *testing.T) {
			raw, err := os.ReadFile(filepath.Join(fixturesDir, name))
			if err != nil {
				t.Fatalf("read fixture: %v", err)
			}

			var envelope struct {
				Type    string          `json:"type"`
				Payload json.RawMessage `json:"payload"`
			}
			if err := json.Unmarshal(raw, &envelope); err != nil {
				t.Fatalf("decode envelope: %v", err)
			}

			if envelope.Type != TypeMetricsHost {
				t.Errorf("envelope type = %q, want %q", envelope.Type, TypeMetricsHost)
			}

			var payload HostMetricsPayload
			if err := json.Unmarshal(envelope.Payload, &payload); err != nil {
				t.Fatalf("decode payload into HostMetricsPayload: %v", err)
			}

			roundTripped, err := json.Marshal(payload)
			if err != nil {
				t.Fatalf("re-encode payload: %v", err)
			}

			want := normalize(t, envelope.Payload)
			got := normalize(t, roundTripped)
			if !reflect.DeepEqual(want, got) {
				t.Errorf(
					"payload does not round-trip through the Go structs.\n fixture: %s\n go:      %s\n"+
						"The Go structs in client.go have drifted from packages/protocol.",
					mustJSON(t, want), mustJSON(t, got),
				)
			}
		})
	}
}

// TestHostMetricsFieldsArePopulated ensures the round-trip test is not passing
// because everything decoded into zero values.
func TestHostMetricsFieldsArePopulated(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join(fixturesDir, "metrics.host.linux.json"))
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}

	var envelope struct {
		Payload HostMetricsPayload `json:"payload"`
	}
	if err := json.Unmarshal(raw, &envelope); err != nil {
		t.Fatalf("decode: %v", err)
	}

	p := envelope.Payload
	if p.UUID == "" {
		t.Error("uuid did not decode")
	}
	if p.CollectedAt == "" {
		t.Error("collectedAt did not decode")
	}
	if p.CPU.UsagePercent == 0 || p.CPU.Cores == 0 {
		t.Errorf("cpu did not decode: %+v", p.CPU)
	}
	if p.CPU.LoadAvg == nil {
		t.Error("loadAvg did not decode on the linux fixture")
	}
	if p.Memory.TotalBytes == 0 || p.Memory.UsedBytes == 0 ||
		p.Memory.AvailableBytes == 0 || p.Memory.UsagePercent == 0 {
		t.Errorf("memory did not decode: %+v", p.Memory)
	}
}

// TestContainerRemoveMatchesProtocolFixture guards the server -> agent direction
// of the same hand-mirrored contract. It matters more here than for metrics: a
// mistyped `force` tag would decode to the zero value with no error anywhere, so
// an operator's explicit force-remove would silently become an ordinary remove
// that Docker then refuses.
func TestContainerRemoveMatchesProtocolFixture(t *testing.T) {
	fixtures := []struct {
		name      string
		wantForce bool
	}{
		{"container.remove.json", false},
		{"container.remove.force.json", true},
	}

	for _, fixture := range fixtures {
		t.Run(fixture.name, func(t *testing.T) {
			raw, err := os.ReadFile(filepath.Join(fixturesDir, fixture.name))
			if err != nil {
				t.Fatalf("read fixture: %v", err)
			}

			var envelope struct {
				Type    string          `json:"type"`
				Payload json.RawMessage `json:"payload"`
			}
			if err := json.Unmarshal(raw, &envelope); err != nil {
				t.Fatalf("decode envelope: %v", err)
			}

			if envelope.Type != TypeContainerRemove {
				t.Errorf("envelope type = %q, want %q", envelope.Type, TypeContainerRemove)
			}

			var payload ContainerRemovePayload
			if err := json.Unmarshal(envelope.Payload, &payload); err != nil {
				t.Fatalf("decode payload into ContainerRemovePayload: %v", err)
			}

			// The round trip catches a renamed key; these catch a key that decodes
			// under the right name but into the wrong field.
			if payload.RequestID == "" || payload.ContainerID == "" {
				t.Errorf("requestId/containerId did not decode: %+v", payload)
			}
			if payload.Force != fixture.wantForce {
				t.Errorf("force = %v, want %v", payload.Force, fixture.wantForce)
			}

			roundTripped, err := json.Marshal(payload)
			if err != nil {
				t.Fatalf("re-encode payload: %v", err)
			}

			want := normalize(t, envelope.Payload)
			got := normalize(t, roundTripped)
			if !reflect.DeepEqual(want, got) {
				t.Errorf(
					"payload does not round-trip through the Go structs.\n fixture: %s\n go:      %s\n"+
						"The Go structs in client.go have drifted from packages/protocol.",
					mustJSON(t, want), mustJSON(t, got),
				)
			}
		})
	}
}

// TestContainerPauseMatchesProtocolFixture covers ContainerCommandPayload, the
// shape shared by start, stop, restart, pause and unpause. Until this fixture
// existed only container.remove's superset was pinned, so a rename of
// requestId or containerId on the base struct went unnoticed on the Go side.
func TestContainerPauseMatchesProtocolFixture(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join(fixturesDir, "container.pause.json"))
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}

	var envelope struct {
		Type    string          `json:"type"`
		Payload json.RawMessage `json:"payload"`
	}
	if err := json.Unmarshal(raw, &envelope); err != nil {
		t.Fatalf("decode envelope: %v", err)
	}

	if envelope.Type != TypeContainerPause {
		t.Errorf("envelope type = %q, want %q", envelope.Type, TypeContainerPause)
	}

	var payload ContainerCommandPayload
	if err := json.Unmarshal(envelope.Payload, &payload); err != nil {
		t.Fatalf("decode payload into ContainerCommandPayload: %v", err)
	}

	if payload.RequestID == "" || payload.ContainerID == "" {
		t.Errorf("requestId/containerId did not decode: %+v", payload)
	}

	roundTripped, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("re-encode payload: %v", err)
	}

	want := normalize(t, envelope.Payload)
	got := normalize(t, roundTripped)
	if !reflect.DeepEqual(want, got) {
		t.Errorf(
			"payload does not round-trip through the Go structs.\n fixture: %s\n go:      %s\n"+
				"The Go structs in client.go have drifted from packages/protocol.",
			mustJSON(t, want), mustJSON(t, got),
		)
	}
}

// TestActionFromTypeCoversPauseAndUnpause pins the reverse mapping that fills
// container.result. A wrong string here would reach the dashboard as an
// unknown action and the toast would name the wrong verb.
func TestActionFromTypeCoversPauseAndUnpause(t *testing.T) {
	cases := map[string]string{
		TypeContainerPause:   "pause",
		TypeContainerUnpause: "unpause",
	}

	for msgType, want := range cases {
		if got := actionFromType(msgType); got != want {
			t.Errorf("actionFromType(%q) = %q, want %q", msgType, got, want)
		}
	}
}

// normalize decodes JSON into generic maps so comparison ignores key order and
// integer/float formatting differences.
func normalize(t *testing.T, data []byte) map[string]any {
	t.Helper()
	var out map[string]any
	if err := json.Unmarshal(data, &out); err != nil {
		t.Fatalf("normalize: %v", err)
	}
	return out
}

func mustJSON(t *testing.T, value any) string {
	t.Helper()
	out, err := json.Marshal(value)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	return string(out)
}
