package lifecycle

import (
	"context"
	"os"
	"os/signal"
	"sync"
	"syscall"

	"docksight-agent/internal/logger"
)

// Manager coordinates graceful startup/shutdown for the agent process.
type Manager struct {
	ctx    context.Context
	cancel context.CancelFunc
	once   sync.Once
}

// New creates a lifecycle manager that listens for SIGINT and SIGTERM, and
// also shuts down when parent is cancelled.
//
// The parent is what makes the same shutdown path reachable from outside the
// process. A Windows service never receives SIGTERM — the Service Control
// Manager delivers SERVICE_CONTROL_STOP on its own channel — so the service
// handler cancels the parent and the hooks below run exactly as they do for
// Ctrl+C. One shutdown path, two triggers.
func New(parent context.Context) *Manager {
	if parent == nil {
		parent = context.Background()
	}
	ctx, cancel := signal.NotifyContext(parent, os.Interrupt, syscall.SIGTERM)
	return &Manager{ctx: ctx, cancel: cancel}
}

// Context returns the lifecycle context cancelled on SIGINT/SIGTERM,
// parent-context cancellation, or Shutdown.
func (m *Manager) Context() context.Context {
	return m.ctx
}

// Wait blocks until the lifecycle context is cancelled, including by
// SIGINT/SIGTERM or parent-context cancellation, then runs optional shutdown hooks.
func (m *Manager) Wait(onShutdown ...func()) {
	<-m.ctx.Done()
	logger.Info("shutdown signal received")
	m.Shutdown(onShutdown...)
}

// Shutdown runs shutdown hooks exactly once and cancels the lifecycle context.
func (m *Manager) Shutdown(hooks ...func()) {
	m.once.Do(func() {
		for _, hook := range hooks {
			if hook != nil {
				hook()
			}
		}
		m.cancel()
	})
}
