package communication

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"sync"
	"time"

	"docksight-agent/internal/docker"
	"docksight-agent/internal/logger"
	"docksight-agent/internal/logs"
	"docksight-agent/internal/metrics"

	"github.com/docker/docker/api/types/container"
	"github.com/gorilla/websocket"
)

const (
	TypeRegister           = "agent.register"
	TypeRegistered         = "agent.registered"
	TypeHeartbeat          = "agent.heartbeat"
	TypeContainerList      = "container.list"
	TypeContainerListed    = "container.listed"
	TypeContainerInspect   = "container.inspect"
	TypeContainerInspected = "container.inspected"
	TypeContainerStart     = "container.start"
	TypeContainerStop      = "container.stop"
	TypeContainerRemove    = "container.remove"
	TypeContainerRestart   = "container.restart"
	TypeContainerResult    = "container.result"
	TypeLogsSubscribe      = "logs.subscribe"
	TypeLogsUnsubscribe    = "logs.unsubscribe"
	TypeLogsChunk          = "logs.chunk"
	TypeMetricsHost        = "metrics.host"
)

// Envelope is the JSON message wrapper exchanged with the DockSight server.
type Envelope struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

// RegisterPayload is sent on agent.register.
type RegisterPayload struct {
	UUID         string `json:"uuid"`
	Hostname     string `json:"hostname"`
	OS           string `json:"os"`
	Architecture string `json:"architecture"`
	Version      string `json:"version"`
}

// RegisteredPayload is returned on agent.registered.
type RegisteredPayload struct {
	ID      string `json:"id"`
	UUID    string `json:"uuid"`
	Status  string `json:"status"`
	Message string `json:"message"`
}

// HeartbeatPayload is sent on agent.heartbeat.
type HeartbeatPayload struct {
	UUID string `json:"uuid"`
}

// HostMetricsPayload is sent on metrics.host.
type HostMetricsPayload struct {
	UUID        string         `json:"uuid"`
	CollectedAt string         `json:"collectedAt"`
	CPU         metrics.CPU    `json:"cpu"`
	Memory      metrics.Memory `json:"memory"`
}

// ContainerSummary matches protocol container discovery fields.
type ContainerSummary struct {
	ID      string           `json:"id"`
	Name    string           `json:"name"`
	Image   string           `json:"image"`
	Status  string           `json:"status"`
	State   string           `json:"state"`
	Ports   []container.Port `json:"ports"`
	Created int64            `json:"created"`
}

// ContainerListedPayload is sent on container.listed.
type ContainerListedPayload struct {
	Containers []ContainerSummary `json:"containers"`
}

type ContainerInspectedPayload struct {
	RequestID string                   `json:"requestId"`
	Container *docker.ContainerInspect `json:"container"`
	Ok        bool                     `json:"ok"`
	Error     *string                  `json:"error"`
}

type ContainerRemovePayload struct {
	ContainerCommandPayload
	Force bool `json:"force"`
}

// ContainerCommandPayload is shared by start/stop/restart.
type ContainerCommandPayload struct {
	RequestID   string `json:"requestId"`
	ContainerID string `json:"containerId"`
}

// ContainerResultPayload is sent on container.result.
type ContainerResultPayload struct {
	RequestID   string  `json:"requestId"`
	Action      string  `json:"action"`
	ContainerID string  `json:"containerId"`
	OK          bool    `json:"ok"`
	Message     string  `json:"message"`
	Error       *string `json:"error"`
}

// LogsSubscribePayload is received on logs.subscribe.
type LogsSubscribePayload struct {
	RequestID   string `json:"requestId"`
	ContainerID string `json:"containerId"`
	Tail        int    `json:"tail"`
	Follow      *bool  `json:"follow"`
}

// LogsUnsubscribePayload is received on logs.unsubscribe.
type LogsUnsubscribePayload struct {
	RequestID string `json:"requestId"`
}

// LogsChunkPayload is sent on logs.chunk.
type LogsChunkPayload struct {
	RequestID   string       `json:"requestId"`
	ContainerID string       `json:"containerId"`
	Entries     []logs.Entry `json:"entries"`
}

// AgentInfo is local metadata included in registration.
type AgentInfo struct {
	UUID         string
	Hostname     string
	OS           string
	Architecture string
	Version      string
}

// Client maintains a WebSocket connection to the DockSight server.
type Client struct {
	serverURL      string
	info           AgentInfo
	docker         *docker.Service
	logs           *logs.Service
	metrics        *metrics.Collector
	heartbeatEvery time.Duration
	metricsEvery   time.Duration
	reconnect      *reconnectBackoff
	writeMu        sync.Mutex
	connMu         sync.RWMutex
	conn           *websocket.Conn
}

// NewClient creates a reconnecting agent communication client.
func NewClient(
	serverURL string,
	info AgentInfo,
	dockerService *docker.Service,
	logsService *logs.Service,
) *Client {
	c := &Client{
		serverURL:      serverURL,
		info:           info,
		docker:         dockerService,
		logs:           logsService,
		metrics:        metrics.NewCollector(),
		heartbeatEvery: 30 * time.Second,
		metricsEvery:   10 * time.Second,
		reconnect:      newReconnectBackoff(fullJitter),
	}
	if logsService != nil {
		logsService.SetEmitter(c)
	}
	return c
}

// EmitLogChunk implements logs.ChunkEmitter.
func (c *Client) EmitLogChunk(chunk logs.Chunk) error {
	c.connMu.RLock()
	conn := c.conn
	c.connMu.RUnlock()
	if conn == nil {
		return fmt.Errorf("emit log chunk: websocket not connected")
	}

	payload, err := json.Marshal(LogsChunkPayload{
		RequestID:   chunk.RequestID,
		ContainerID: chunk.ContainerID,
		Entries:     chunk.Entries,
	})
	if err != nil {
		return fmt.Errorf("emit log chunk: %w", err)
	}
	return c.write(conn, Envelope{Type: TypeLogsChunk, Payload: payload})
}

func (c *Client) setConn(conn *websocket.Conn) {
	c.connMu.Lock()
	defer c.connMu.Unlock()
	c.conn = conn
}

func (c *Client) clearConn() {
	c.connMu.Lock()
	defer c.connMu.Unlock()
	c.conn = nil
}

// Run connects, registers, heartbeats, handles commands, and reconnects until ctx is cancelled.
func (c *Client) Run(ctx context.Context) {
	attempt := 0
	for {
		if ctx.Err() != nil {
			return
		}

		attempt++
		logger.Info("connecting to docksight server", "url", c.serverURL, "attempt", attempt)
		if err := c.session(ctx); err != nil {
			if ctx.Err() != nil {
				return
			}
			retryIn := c.reconnect.next()
			logger.Warn("agent session ended; reconnecting", "error", err.Error(), "retryIn", retryIn.String())

			select {
			case <-ctx.Done():
				return
			case <-time.After(retryIn):
			}
		}
	}
}

func (c *Client) session(ctx context.Context) error {
	u, err := url.Parse(c.serverURL)
	if err != nil {
		return fmt.Errorf("invalid server url: %w", err)
	}

	conn, _, err := websocket.DefaultDialer.DialContext(ctx, u.String(), nil)
	if err != nil {
		return fmt.Errorf("websocket dial: %w", err)
	}
	defer conn.Close()
	c.setConn(conn)
	defer c.clearConn()
	defer func() {
		if c.logs != nil {
			c.logs.UnsubscribeAll()
		}
	}()

	logger.Info("websocket connected", "url", c.serverURL)
	logger.Printf("Connected\n")

	if err := c.sendRegister(conn); err != nil {
		return err
	}

	registered, err := c.waitRegistered(conn, 15*time.Second)
	if err != nil {
		return err
	}
	c.reconnect.reset()
	logger.Info("registration acknowledged",
		"id", registered.ID,
		"uuid", registered.UUID,
		"status", registered.Status,
		"message", registered.Message,
	)
	logger.Printf("Registration successful\n")
	logger.Printf("Heartbeat running\n")

	return c.serve(ctx, conn)
}

func (c *Client) sendRegister(conn *websocket.Conn) error {
	payload, err := json.Marshal(RegisterPayload{
		UUID:         c.info.UUID,
		Hostname:     c.info.Hostname,
		OS:           c.info.OS,
		Architecture: c.info.Architecture,
		Version:      c.info.Version,
	})
	if err != nil {
		return err
	}
	return c.write(conn, Envelope{Type: TypeRegister, Payload: payload})
}

func (c *Client) waitRegistered(conn *websocket.Conn, timeout time.Duration) (*RegisteredPayload, error) {
	deadline := time.Now().Add(timeout)
	_ = conn.SetReadDeadline(deadline)
	defer func() { _ = conn.SetReadDeadline(time.Time{}) }()

	for {
		_, data, err := conn.ReadMessage()
		if err != nil {
			return nil, fmt.Errorf("wait for registration response: %w", err)
		}

		var env Envelope
		if err := json.Unmarshal(data, &env); err != nil {
			continue
		}

		if env.Type == TypeRegistered {
			var payload RegisteredPayload
			if err := json.Unmarshal(env.Payload, &payload); err != nil {
				return nil, fmt.Errorf("parse registered payload: %w", err)
			}
			if payload.Message != "" && payload.ID == "" && payload.UUID == "" {
				return nil, fmt.Errorf("registration failed: %s", payload.Message)
			}
			return &payload, nil
		}
	}
}

func (c *Client) serve(ctx context.Context, conn *websocket.Conn) error {
	serveCtx, cancel := context.WithCancel(ctx)
	defer cancel()

	ticker := time.NewTicker(c.heartbeatEvery)
	defer ticker.Stop()

	metricsTicker := time.NewTicker(c.metricsEvery)
	defer metricsTicker.Stop()

	// The first CPU reading covers the time since boot, which is meaningless as
	// a "current usage" number; discard it so the first sent sample is a real
	// interval delta.
	c.metrics.Prime(serveCtx)

	eventsCh := make(chan struct{}, 1)
	errCh := make(chan error, 2)

	if c.docker != nil {
		go func() {
			var debounceTimer *time.Timer
			defer func() {
				if debounceTimer != nil {
					debounceTimer.Stop()
				}
			}()

			for {
				if serveCtx.Err() != nil {
					return
				}

				evMsg, evErr := c.docker.Events(serveCtx)

			streamLoop:
				for {
					select {
					case <-serveCtx.Done():
						return
					case err, ok := <-evErr:
						if !ok || err != nil {
							if err != nil && serveCtx.Err() == nil {
								logger.Warn("docker events stream error; will reconnect", "error", err.Error())
							}
							break streamLoop
						}
					case _, ok := <-evMsg:
						if !ok {
							break streamLoop
						}
						if debounceTimer != nil {
							debounceTimer.Stop()
						}
						debounceTimer = time.AfterFunc(500*time.Millisecond, func() {
							select {
							case eventsCh <- struct{}{}:
							default:
							}
						})
					}
				}

				select {
				case <-serveCtx.Done():
					return
				case <-time.After(5 * time.Second):
				}
			}
		}()
	}

	incoming := make(chan Envelope, 16)

	go func() {
		for {
			_, data, err := conn.ReadMessage()
			if err != nil {
				errCh <- err
				return
			}
			var env Envelope
			if err := json.Unmarshal(data, &env); err != nil {
				logger.Warn("ignored invalid server message", "error", err.Error())
				continue
			}
			incoming <- env
		}
	}()

	if err := c.sendHeartbeat(conn); err != nil {
		return err
	}

	for {
		select {
		case <-ctx.Done():
			_ = conn.WriteMessage(
				websocket.CloseMessage,
				websocket.FormatCloseMessage(websocket.CloseNormalClosure, "shutdown"),
			)
			return ctx.Err()
		case err := <-errCh:
			return fmt.Errorf("connection closed: %w", err)
		case env := <-incoming:
			if err := c.handleServerMessage(ctx, conn, env); err != nil {
				logger.Warn("failed handling server message", "type", env.Type, "error", err.Error())
			}
		case <-ticker.C:
			if err := c.sendHeartbeat(conn); err != nil {
				return err
			}
			logger.Debug("heartbeat sent", "uuid", c.info.UUID)
		case <-metricsTicker.C:
			// A metrics hiccup should not tear down the session the way a failed
			// heartbeat does, so this only warns.
			if err := c.sendHostMetrics(ctx, conn); err != nil {
				logger.Warn("host metrics not sent", "error", err.Error())
			}
		case <-eventsCh:
			if err := c.handleContainerList(ctx, conn); err != nil {
				logger.Warn("failed to push container list on event", "error", err.Error())
			}
		}

	}
}

func (c *Client) handleServerMessage(ctx context.Context, conn *websocket.Conn, env Envelope) error {
	switch env.Type {
	case TypeContainerList:
		return c.handleContainerList(ctx, conn)
	case TypeContainerStart, TypeContainerStop, TypeContainerRestart, TypeContainerRemove:
		return c.handleContainerCommand(ctx, conn, env)
	case TypeLogsSubscribe:
		return c.handleLogsSubscribe(env)
	case TypeLogsUnsubscribe:
		return c.handleLogsUnsubscribe(env)
	case TypeRegistered:
		return nil
	case TypeContainerInspect:
		return c.handleContainerInspect(ctx, conn, env)
	default:
		logger.Warn("unknown server message type", "type", env.Type)
		return nil
	}
}

func (c *Client) handleLogsSubscribe(env Envelope) error {
	var payload LogsSubscribePayload
	if err := json.Unmarshal(env.Payload, &payload); err != nil {
		return fmt.Errorf("parse logs.subscribe: %w", err)
	}
	if payload.RequestID == "" || payload.ContainerID == "" {
		return fmt.Errorf("logs.subscribe: requestId and containerId are required")
	}
	if c.logs == nil {
		return fmt.Errorf("logs.subscribe: logs service unavailable")
	}

	follow := true
	if payload.Follow != nil {
		follow = *payload.Follow
	}
	tail := payload.Tail
	if tail <= 0 {
		tail = 100
	}

	logger.Info("logs.subscribe received",
		"requestId", payload.RequestID,
		"containerId", shortID(payload.ContainerID),
		"tail", tail,
		"follow", follow,
	)

	return c.logs.Subscribe(logs.SubscribeOptions{
		RequestID:   payload.RequestID,
		ContainerID: payload.ContainerID,
		Tail:        tail,
		Follow:      follow,
	})
}

func (c *Client) handleLogsUnsubscribe(env Envelope) error {
	var payload LogsUnsubscribePayload
	if err := json.Unmarshal(env.Payload, &payload); err != nil {
		return fmt.Errorf("parse logs.unsubscribe: %w", err)
	}
	if c.logs == nil {
		return fmt.Errorf("logs.unsubscribe: logs service unavailable")
	}
	logger.Info("logs.unsubscribe received", "requestId", payload.RequestID)
	if err := c.logs.Unsubscribe(payload.RequestID); err != nil {
		logger.Warn("logs.unsubscribe failed", "requestId", payload.RequestID, "error", err.Error())
	}
	return nil
}

func (c *Client) handleContainerList(ctx context.Context, conn *websocket.Conn) error {
	if c.docker == nil {
		return c.writeContainerListed(conn, nil)
	}

	items, err := c.docker.ListContainers(ctx)
	if err != nil {
		return fmt.Errorf("list containers: %w", err)
	}

	summaries := make([]ContainerSummary, 0, len(items))
	for _, item := range items {
		summaries = append(summaries, ContainerSummary{
			ID:      item.ID,
			Name:    item.Name,
			Image:   item.Image,
			Status:  item.Status,
			State:   item.State,
			Ports:   item.Ports,
			Created: item.Created,
		})
	}

	logger.Info("container discovery complete", "count", len(summaries))
	return c.writeContainerListed(conn, summaries)
}

func (c *Client) handleContainerCommand(ctx context.Context, conn *websocket.Conn, env Envelope) error {
	var payload ContainerRemovePayload
	if err := json.Unmarshal(env.Payload, &payload); err != nil {
		return fmt.Errorf("parse container command: %w", err)
	}
	if payload.RequestID == "" || payload.ContainerID == "" {
		return c.writeContainerResult(conn, ContainerResultPayload{
			RequestID:   payload.RequestID,
			Action:      actionFromType(env.Type),
			ContainerID: payload.ContainerID,
			OK:          false,
			Message:     "Invalid command payload",
			Error:       strPtr("requestId and containerId are required"),
		})
	}

	action := actionFromType(env.Type)
	logger.Info("container command received",
		"action", action,
		"requestId", payload.RequestID,
		"containerId", shortID(payload.ContainerID),
	)

	if c.docker == nil {
		return c.writeContainerResult(conn, ContainerResultPayload{
			RequestID:   payload.RequestID,
			Action:      action,
			ContainerID: payload.ContainerID,
			OK:          false,
			Message:     "Docker engine unavailable",
			Error:       strPtr("docker client is not initialized"),
		})
	}

	var err error
	switch env.Type {
	case TypeContainerStart:
		err = c.docker.StartContainer(ctx, payload.ContainerID)
	case TypeContainerStop:
		err = c.docker.StopContainer(ctx, payload.ContainerID)
	case TypeContainerRestart:
		err = c.docker.RestartContainer(ctx, payload.ContainerID)
	case TypeContainerRemove:
		err = c.docker.RemoveContainer(ctx, payload.ContainerID, payload.Force)
	default:
		err = fmt.Errorf("unsupported action %s", env.Type)
	}

	if err != nil {
		msg := err.Error()
		logger.Warn("container command failed",
			"action", action,
			"requestId", payload.RequestID,
			"error", msg,
		)
		return c.writeContainerResult(conn, ContainerResultPayload{
			RequestID:   payload.RequestID,
			Action:      action,
			ContainerID: payload.ContainerID,
			OK:          false,
			Message:     fmt.Sprintf("%s failed", action),
			Error:       &msg,
		})
	}

	logger.Info("container command succeeded",
		"action", action,
		"requestId", payload.RequestID,
		"containerId", shortID(payload.ContainerID),
	)
	return c.writeContainerResult(conn, ContainerResultPayload{
		RequestID:   payload.RequestID,
		Action:      action,
		ContainerID: payload.ContainerID,
		OK:          true,
		Message:     fmt.Sprintf("%s succeeded", action),
		Error:       nil,
	})
}

func (c *Client) writeContainerListed(conn *websocket.Conn, containers []ContainerSummary) error {
	if containers == nil {
		containers = []ContainerSummary{}
	}
	payload, err := json.Marshal(ContainerListedPayload{Containers: containers})
	if err != nil {
		return err
	}
	return c.write(conn, Envelope{Type: TypeContainerListed, Payload: payload})
}

func (c *Client) writeContainerInspected(
	conn *websocket.Conn,
	result ContainerInspectedPayload,
) error {

	payload, err := json.Marshal(result)
	if err != nil {
		return err
	}

	return c.write(conn, Envelope{
		Type:    TypeContainerInspected,
		Payload: payload,
	})
}

func (c *Client) writeContainerResult(conn *websocket.Conn, result ContainerResultPayload) error {
	payload, err := json.Marshal(result)
	if err != nil {
		return err
	}
	return c.write(conn, Envelope{Type: TypeContainerResult, Payload: payload})
}

func (c *Client) sendHeartbeat(conn *websocket.Conn) error {
	payload, err := json.Marshal(HeartbeatPayload{UUID: c.info.UUID})
	if err != nil {
		return err
	}
	return c.write(conn, Envelope{Type: TypeHeartbeat, Payload: payload})
}

func (c *Client) sendHostMetrics(ctx context.Context, conn *websocket.Conn) error {
	snapshot, err := c.metrics.Collect(ctx)
	if err != nil {
		return fmt.Errorf("collect host metrics: %w", err)
	}

	payload, err := json.Marshal(HostMetricsPayload{
		UUID:        c.info.UUID,
		CollectedAt: time.Now().UTC().Format(time.RFC3339),
		CPU:         snapshot.CPU,
		Memory:      snapshot.Memory,
	})
	if err != nil {
		return err
	}

	if err := c.write(conn, Envelope{Type: TypeMetricsHost, Payload: payload}); err != nil {
		return err
	}

	logger.Debug("host metrics sent",
		"cpuPercent", snapshot.CPU.UsagePercent,
		"memoryPercent", snapshot.Memory.UsagePercent,
	)
	return nil
}

func (c *Client) write(conn *websocket.Conn, env Envelope) error {
	data, err := json.Marshal(env)
	if err != nil {
		return err
	}
	c.writeMu.Lock()
	defer c.writeMu.Unlock()
	return conn.WriteMessage(websocket.TextMessage, data)
}

func actionFromType(msgType string) string {
	switch msgType {
	case TypeContainerStart:
		return "start"
	case TypeContainerStop:
		return "stop"
	case TypeContainerRestart:
		return "restart"
	case TypeContainerRemove:
		return "remove"
	default:
		return "unknown"
	}
}

func shortID(id string) string {
	if len(id) > 12 {
		return id[:12]
	}
	return id
}

func strPtr(value string) *string {
	return &value
}

func (c *Client) handleContainerInspect(ctx context.Context, conn *websocket.Conn, env Envelope) error {
	var payload ContainerCommandPayload
	if err := json.Unmarshal(env.Payload, &payload); err != nil {
		return fmt.Errorf("parse container.inspect: %w", err)
	}

	if payload.RequestID == "" || payload.ContainerID == "" {
		return c.writeContainerInspected(conn, ContainerInspectedPayload{
			RequestID: payload.RequestID,
			Container: nil,
			Ok:        false,
			Error:     strPtr("requestId and containerId are required"),
		})
	}

	if c.docker == nil {
		return c.writeContainerInspected(conn, ContainerInspectedPayload{
			RequestID: payload.RequestID,
			Container: nil,
			Ok:        false,
			Error:     strPtr("Docker engine unavailable"),
		})

	}

	container, err := c.docker.InspectContainer(
		ctx,
		payload.ContainerID,
	)

	if err != nil {

		msg := err.Error()

		return c.writeContainerInspected(conn, ContainerInspectedPayload{
			RequestID: payload.RequestID,
			Container: nil,
			Ok:        false,
			Error:     &msg,
		})
	}
	return c.writeContainerInspected(conn, ContainerInspectedPayload{
		RequestID: payload.RequestID,
		Container: container,
		Ok:        true,
		Error:     nil,
	})
}
