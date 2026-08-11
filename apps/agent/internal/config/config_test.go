package config

import (
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
)

func TestLoadServerURL(t *testing.T) {
	tests := []struct {
		name        string
		config      string
		envURL      string
		wantURL     string
		wantMissing bool
	}{
		{
			name:        "missing URL fails",
			config:      "{}\n",
			wantMissing: true,
		},
		{
			name:    "environment fallback",
			config:  "{}\n",
			envURL:  "wss://platform.example.com/agents",
			wantURL: "wss://platform.example.com/agents",
		},
		{
			name: "explicit localhost URL",
			config: `server:
  url: ws://localhost:3000/agents
`,
			envURL:  "wss://ignored.example.com/agents",
			wantURL: "ws://localhost:3000/agents",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("AGENT_SERVER_URL", tt.envURL)

			path := filepath.Join(t.TempDir(), "config.yaml")
			if err := os.WriteFile(path, []byte(tt.config), 0o600); err != nil {
				t.Fatal(err)
			}

			cfg, err := Load(path)
			if tt.wantMissing {
				if err == nil {
					t.Fatal("expected missing server.url to fail")
				}
				// Load formats paths with %q (Go-quoted), which escapes
				// backslashes on Windows. Compare against the quoted form.
				if !strings.Contains(err.Error(), strconv.Quote(path)) {
					t.Errorf("error %q does not name config path %q", err.Error(), path)
				}
				if !strings.Contains(err.Error(), "server.url") {
					t.Errorf("error %q does not name server.url", err)
				}
				return
			}

			if err != nil {
				t.Fatal(err)
			}
			if cfg.Server.URL != tt.wantURL {
				t.Errorf("server URL = %q, want %q", cfg.Server.URL, tt.wantURL)
			}
		})
	}
}
