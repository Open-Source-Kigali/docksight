package communication

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"docksight-agent/internal/docker"
	"docksight-agent/internal/logger"

	"github.com/gorilla/websocket"
)

func TestContainerCommandFailureLog(t *testing.T) {
	for _, containerID := range []string{"abcdef1234567890", "short-id"} {
		t.Run(containerID, func(t *testing.T) {
			var sink bytes.Buffer
			logger.Setup("warn", &sink)
			t.Cleanup(func() { logger.Setup("info", nil) })

			dockerClient, err := docker.NewClient(filepath.Join(t.TempDir(), "missing-docker"))
			if err != nil {
				t.Fatal(err)
			}
			t.Cleanup(func() { dockerClient.Close() })
			c := &Client{docker: docker.NewService(dockerClient)}
			payload, err := json.Marshal(ContainerCommandPayload{RequestID: "request-1", ContainerID: containerID})
			if err != nil {
				t.Fatal(err)
			}

			done := make(chan error, 1)
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				conn, err := (&websocket.Upgrader{}).Upgrade(w, r, nil)
				if err != nil {
					done <- err
					return
				}
				defer conn.Close()
				ctx, cancel := context.WithCancel(r.Context())
				cancel()
				done <- c.handleContainerCommand(ctx, conn, Envelope{Type: TypeContainerStart, Payload: payload})
			}))
			defer server.Close()
			conn, _, err := websocket.DefaultDialer.Dial("ws"+strings.TrimPrefix(server.URL, "http"), nil)
			if err != nil {
				t.Fatal(err)
			}
			defer conn.Close()
			conn.SetReadDeadline(time.Now().Add(5 * time.Second))
			var env Envelope
			if err := conn.ReadJSON(&env); err != nil {
				t.Fatal(err)
			}
			if err := <-done; err != nil {
				t.Fatal(err)
			}
			var result ContainerResultPayload
			if err := json.Unmarshal(env.Payload, &result); err != nil {
				t.Fatal(err)
			}
			if env.Type != TypeContainerResult || result.OK || result.Action != "start" || result.RequestID != "request-1" || result.ContainerID != containerID || result.Error == nil {
				t.Fatalf("unexpected failure response: envelope = %q, result = %#v", env.Type, result)
			}
			for _, want := range []string{`msg="container command failed"`, "action=start", "requestId=request-1", "containerId=" + shortID(containerID) + " ", "error="} {
				if !strings.Contains(sink.String(), want) {
					t.Errorf("failure log %q missing %q", sink.String(), want)
				}
			}
		})
	}
}
