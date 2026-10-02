//go:build !windows

package app

import (
	"context"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"testing"
	"time"

	"docksight-agent/internal/config"
	"docksight-agent/internal/docker"

	"gopkg.in/yaml.v3"
)

func TestRunCancelsStartupDockerPing(t *testing.T) {
	// Keep the path short enough for Unix-domain socket limits.
	dir, err := os.MkdirTemp("", "docksight-")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.RemoveAll(dir) })
	socket := filepath.Join(dir, "docker.sock")
	listener, err := net.Listen("unix", socket)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = listener.Close() })
	if !docker.SocketExists(socket) {
		t.Fatal("test Docker endpoint is not discoverable")
	}

	pingStarted := make(chan struct{}, 1)
	release := make(chan struct{})
	server := &http.Server{Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/_ping" {
			http.NotFound(w, r)
			return
		}
		select {
		case pingStarted <- struct{}{}:
		default:
		}
		select {
		case <-r.Context().Done():
		case <-release:
		}
	})}
	go func() { _ = server.Serve(listener) }()
	t.Cleanup(func() {
		close(release)
		_ = server.Close()
	})

	configDir := t.TempDir()
	cfg := config.Config{
		Agent:  config.AgentConfig{IdentityFile: filepath.Join(configDir, "identity.json")},
		Server: config.ServerConfig{URL: "ws://127.0.0.1:1/agents"},
		Docker: config.DockerConfig{Socket: socket},
	}
	data, err := yaml.Marshal(cfg)
	if err != nil {
		t.Fatal(err)
	}
	configPath := filepath.Join(configDir, "config.yaml")
	if err := os.WriteFile(configPath, data, 0o600); err != nil {
		t.Fatal(err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	finished := make(chan error, 1)
	go func() { finished <- New(configPath).Run(ctx) }()

	select {
	case <-pingStarted:
	case err := <-finished:
		t.Fatalf("Run returned before pinging Docker: %v", err)
	case <-time.After(3 * time.Second):
		t.Fatal("startup did not reach the Docker ping")
	}
	cancel()
	select {
	case err := <-finished:
		if err != nil {
			t.Fatalf("Run returned an error on shutdown: %v", err)
		}
	case <-time.After(time.Second):
		t.Fatal("Run did not stop promptly after cancellation during Docker ping")
	}
}
