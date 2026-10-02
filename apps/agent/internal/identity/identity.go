package identity

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

// Identity is the durable agent identity persisted on disk.
type Identity struct {
	ID        string    `json:"id"`
	CreatedAt time.Time `json:"created_at"`
}

// LoadOrCreate returns an existing identity from path, or generates and persists a new one.
func LoadOrCreate(path string) (*Identity, bool, error) {
	if path == "" {
		return nil, false, fmt.Errorf("identity path is required")
	}

	if _, err := os.Stat(path); err == nil {
		id, err := load(path)
		if err != nil {
			return nil, false, err
		}
		return id, false, nil
	} else if !os.IsNotExist(err) {
		return nil, false, fmt.Errorf("stat identity file: %w", err)
	}

	id, err := newIdentity()
	if err != nil {
		return nil, false, err
	}
	if err := save(path, id); err != nil {
		return nil, false, err
	}
	return id, true, nil
}

func load(path string) (*Identity, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read identity file %q: %w", path, err)
	}

	var id Identity
	if err := json.Unmarshal(data, &id); err != nil {
		return nil, fmt.Errorf("parse identity file %q: %w", path, err)
	}
	if id.ID == "" {
		return nil, fmt.Errorf("identity file %q is missing id", path)
	}
	return &id, nil
}

func save(path string, id *Identity) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return fmt.Errorf("create identity directory: %w", err)
	}

	data, err := json.MarshalIndent(id, "", "  ")
	if err != nil {
		return fmt.Errorf("encode identity: %w", err)
	}
	data = append(data, '\n')

	if err := os.WriteFile(path, data, 0o600); err != nil {
		return fmt.Errorf("write identity file: %w", err)
	}
	return nil
}

func newIdentity() (*Identity, error) {
	uuid, err := newUUID()
	if err != nil {
		return nil, err
	}
	return &Identity{
		ID:        uuid,
		CreatedAt: time.Now().UTC(),
	}, nil
}

// newUUID generates an RFC 4122 version 4 UUID.
func newUUID() (string, error) {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", fmt.Errorf("generate uuid: %w", err)
	}
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:]), nil
}
