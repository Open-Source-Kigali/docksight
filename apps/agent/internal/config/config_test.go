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
		wantURL     string
		wantMissing bool
	}{
		{
			name:        "missing URL fails",
			config:      "{}\n",
			wantMissing: true,
		},
		{
			name: "explicit localhost URL",
			config: `server:
  url: ws://localhost:3000/agents
`,
			wantURL: "ws://localhost:3000/agents",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			filename := "config.yaml"
			if os.PathSeparator != '\\' {
				filename = `config\windows.yaml`
			}
			path := filepath.Join(t.TempDir(), filename)
			if err := os.WriteFile(path, []byte(tt.config), 0o600); err != nil {
				t.Fatal(err)
			}

			cfg, err := Load(path)
			if tt.wantMissing {
				if err == nil {
					t.Fatal("expected missing server.url to fail")
				}
				if !strings.Contains(err.Error(), strconv.Quote(path)) {
					t.Errorf("error %q does not name config path %q", err, path)
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
