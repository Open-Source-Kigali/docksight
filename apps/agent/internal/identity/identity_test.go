package identity

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
)

func TestLoadOrCreateReadError(t *testing.T) {
	path := filepath.Join(t.TempDir(), "identity data.json")
	if err := os.Mkdir(path, 0o700); err != nil {
		t.Fatal(err)
	}

	id, created, err := LoadOrCreate(path)
	if err == nil {
		t.Fatal("expected reading a directory to fail")
	}
	if id != nil || created {
		t.Fatal("failed read must not return or create an identity")
	}
	if want := "read identity file " + strconv.Quote(path) + ": "; !strings.HasPrefix(err.Error(), want) {
		t.Errorf("error = %q, want prefix %q", err, want)
	}
	var pathErr *os.PathError
	if !errors.As(err, &pathErr) {
		t.Errorf("error does not wrap os.PathError: %v", err)
	}
}

func TestLoadOrCreateParseError(t *testing.T) {
	path := filepath.Join(t.TempDir(), "identity data.json")
	if err := os.WriteFile(path, []byte("{"), 0o600); err != nil {
		t.Fatal(err)
	}

	id, created, err := LoadOrCreate(path)
	if err == nil {
		t.Fatal("expected malformed JSON to fail")
	}
	if id != nil || created {
		t.Fatal("failed parse must not return or create an identity")
	}
	if want := "parse identity file " + strconv.Quote(path) + ": "; !strings.HasPrefix(err.Error(), want) {
		t.Errorf("error = %q, want prefix %q", err, want)
	}
	var syntaxErr *json.SyntaxError
	if !errors.As(err, &syntaxErr) {
		t.Errorf("error does not wrap json.SyntaxError: %v", err)
	}
}

func TestLoadOrCreateExistingIdentity(t *testing.T) {
	path := filepath.Join(t.TempDir(), "identity data.json")
	data := []byte(`{"id":"existing-agent","created_at":"2026-09-29T12:00:00Z"}`)
	if err := os.WriteFile(path, data, 0o600); err != nil {
		t.Fatal(err)
	}

	id, created, err := LoadOrCreate(path)
	if err != nil {
		t.Fatal(err)
	}
	if created || id == nil || id.ID != "existing-agent" || id.CreatedAt.Format("2006-01-02T15:04:05Z07:00") != "2026-09-29T12:00:00Z" {
		t.Fatalf("existing identity changed: id = %#v, created = %v", id, created)
	}
	got, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != string(data) {
		t.Fatal("loading an existing identity must not rewrite the file")
	}
}
