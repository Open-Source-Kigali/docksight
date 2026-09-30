package app

import (
	"context"
	"fmt"
	"os"
	"runtime"

	"docksight-agent/internal/communication"
	"docksight-agent/internal/config"
	"docksight-agent/internal/docker"
	"docksight-agent/internal/identity"
	"docksight-agent/internal/lifecycle"
	"docksight-agent/internal/logger"
	"docksight-agent/internal/logs"
	"docksight-agent/internal/version"
)

// App is the DockSight agent application bootstrapper.
type App struct {
	configPath string
}

// New creates an application instance.
func New(configPath string) *App {
	if configPath == "" {
		configPath = "config.yaml"
	}
	return &App{configPath: configPath}
}

// Run executes the agent lifecycle:
// config → logger → identity → docker → logs → connect → register → heartbeat → wait.
//
// The context is the supervisor's: cancelling it shuts the agent down exactly
// as an interrupt does. Under the Windows Service Control Manager that is the
// only way in, because a service never receives a signal.
func (a *App) Run(ctx context.Context) error {
	cfg, err := config.Load(a.configPath)
	if err != nil {
		return fmt.Errorf("configuration: %w", err)
	}

	sink, closeSink, err := openLogSink()
	if err != nil {
		return fmt.Errorf("logging: %w", err)
	}
	if closeSink != nil {
		defer closeSink()
	}

	logger.Setup(cfg.Logging.Level, sink)
	logger.Info("configuration loaded", "path", a.configPath, "server", cfg.Server.URL)
	warnIfPlaintextServerURL(cfg.Server.URL)
	logger.Printf("DockSight Agent started\n")

	id, created, err := identity.LoadOrCreate(cfg.Agent.IdentityFile)
	if err != nil {
		return fmt.Errorf("identity: %w", err)
	}
	if created {
		logger.Info("identity created", "id", id.ID, "path", cfg.Agent.IdentityFile)
	} else {
		logger.Info("identity loaded", "id", id.ID, "path", cfg.Agent.IdentityFile)
	}

	socket := cfg.Docker.Socket
	if socket == "" {
		socket = docker.DefaultSocket()
	}

	dockerAvailable := docker.SocketExists(socket)
	var dockerService *docker.Service
	var dockerClient *docker.Client

	if dockerAvailable {
		logger.Info("docker socket found", "socket", socket)
		dockerClient, err = docker.NewClient(socket)
		if err != nil {
			logger.Warn("docker client init failed", "error", err.Error())
		} else {
			dockerService = docker.NewService(dockerClient)
			pingCtx := ctx
			if pingErr := dockerService.Ping(pingCtx); pingErr != nil {
				logger.Warn("docker engine not reachable", "error", pingErr.Error())
			} else if info, infoErr := dockerService.GetDockerInfo(pingCtx); infoErr == nil {
				logger.Info("docker engine available",
					"version", info.Version,
					"os", info.OS,
					"arch", info.Architecture,
				)
			}
		}
	} else {
		logger.Warn("docker socket not found", "socket", socket)
	}

	var logsService *logs.Service
	if dockerService != nil {
		logsService = logs.NewService(dockerService)
	}

	hostname, _ := os.Hostname()
	if hostname == "" {
		hostname = "unknown"
	}

	printStartupSummary(id.ID, created, dockerAvailable, cfg.Server.URL)

	lc := lifecycle.New(ctx)
	client := communication.NewClient(cfg.Server.URL, communication.AgentInfo{
		UUID:         id.ID,
		Hostname:     hostname,
		OS:           runtime.GOOS,
		Architecture: runtime.GOARCH,
		Version:      version.Version,
	}, dockerService, logsService)

	go client.Run(lc.Context())

	logger.Info("agent ready; waiting for shutdown signal",
		"version", version.Version,
		"agentId", id.ID,
	)
	lc.Wait(func() {
		if logsService != nil {
			logsService.Close()
		}
		if dockerClient != nil {
			_ = dockerClient.Close()
		}
		logger.Info("agent stopped")
	})

	return nil
}

func printStartupSummary(agentID string, identityCreated bool, dockerAvailable bool, serverURL string) {
	logger.Printf("\nDockSight Agent %s\n\n", version.String())
	logger.Printf("Configuration loaded\n")
	if identityCreated {
		logger.Printf("Identity created (%s)\n", agentID)
	} else {
		logger.Printf("Identity loaded (%s)\n", agentID)
	}
	if dockerAvailable {
		logger.Printf("Docker socket found\n")
	} else {
		logger.Printf("Docker socket not found\n")
	}
	logger.Printf("Server: %s\n", serverURL)
	logger.Printf("\nAgent Status: READY\n\n")
}
