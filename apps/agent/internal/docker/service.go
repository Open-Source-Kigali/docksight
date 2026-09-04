package docker

import (
	"context"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/events"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/go-connections/nat"
)

// Service provides Docker Engine discovery and lifecycle helpers.
type Service struct {
	client *Client
}

// NewService creates a service around a Docker client.
func NewService(client *Client) *Service {
	return &Service{client: client}
}

// GetDockerInfo returns Docker Engine metadata.
func (s *Service) GetDockerInfo(ctx context.Context) (*Info, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	info, err := s.client.sdk.Info(ctx)
	if err != nil {
		return nil, fmt.Errorf("docker info: %w", err)
	}

	version, err := s.client.sdk.ServerVersion(ctx)
	if err != nil {
		return nil, fmt.Errorf("docker version: %w", err)
	}

	ver := version.Version
	if ver == "" {
		ver = info.ServerVersion
	}

	return &Info{
		Version:      ver,
		OS:           info.OperatingSystem,
		Architecture: info.Architecture,
	}, nil
}

// ListContainers returns a summary of containers (all states).
func (s *Service) ListContainers(ctx context.Context) ([]Container, error) {
	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	items, err := s.client.sdk.ContainerList(ctx, container.ListOptions{All: true})
	if err != nil {
		return nil, fmt.Errorf("docker container list: %w", err)
	}

	result := make([]Container, 0, len(items))
	for _, item := range items {
		name := ""
		if len(item.Names) > 0 {
			name = strings.TrimPrefix(item.Names[0], "/")
		}
		result = append(result, Container{
			ID:      item.ID,
			Name:    name,
			Image:   item.Image,
			Status:  item.Status,
			State:   item.State,
			Ports:   item.Ports,
			Created: item.Created,
		})
	}
	return result, nil
}

// StartContainer starts a stopped container.
func (s *Service) StartContainer(ctx context.Context, containerID string) error {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	if err := s.client.sdk.ContainerStart(ctx, containerID, container.StartOptions{}); err != nil {
		return fmt.Errorf("docker start %s: %w", shortID(containerID), err)
	}
	return nil
}

// StopContainer stops a running container.
func (s *Service) StopContainer(ctx context.Context, containerID string) error {
	ctx, cancel := context.WithTimeout(ctx, 45*time.Second)
	defer cancel()

	timeout := 10
	if err := s.client.sdk.ContainerStop(ctx, containerID, container.StopOptions{Timeout: &timeout}); err != nil {
		return fmt.Errorf("docker stop %s: %w", shortID(containerID), err)
	}
	return nil
}

// RestartContainer restarts a container.
func (s *Service) RestartContainer(ctx context.Context, containerID string) error {
	ctx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()

	timeout := 10
	if err := s.client.sdk.ContainerRestart(ctx, containerID, container.StopOptions{Timeout: &timeout}); err != nil {
		return fmt.Errorf("docker restart %s: %w", shortID(containerID), err)
	}
	return nil
}

// Ping verifies Docker Engine connectivity.
func (s *Service) Ping(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if _, err := s.client.sdk.Ping(ctx); err != nil {
		return fmt.Errorf("docker ping: %w", err)
	}
	return nil
}

// Events returns a stream of Docker container lifecycle events.
func (s *Service) Events(ctx context.Context) (<-chan events.Message, <-chan error) {
	opts := events.ListOptions{
		Filters: filters.NewArgs(
			filters.Arg("type", "container"),
			filters.Arg("event", "create"),
			filters.Arg("event", "start"),
			filters.Arg("event", "stop"),
			filters.Arg("event", "die"),
			filters.Arg("event", "destroy"),
			filters.Arg("event", "pause"),
			filters.Arg("event", "unpause"),
			filters.Arg("event", "rename"),
			filters.Arg("event", "health_status"),
		),
	}
	return s.client.sdk.Events(ctx, opts)
}

// ContainerLogs opens a Docker log reader for the given container.
// Caller owns the returned ReadCloser and must close it.
// When follow is true, the stream continues until ctx is cancelled or the reader is closed.
func (s *Service) ContainerLogs(
	ctx context.Context,
	containerID string,
	tail string,
	follow bool,
) (io.ReadCloser, error) {
	if containerID == "" {
		return nil, fmt.Errorf("docker logs: container id is required")
	}
	if tail == "" {
		tail = "100"
	}

	opts := container.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Follow:     follow,
		Timestamps: true,
		Tail:       tail,
	}

	reader, err := s.client.sdk.ContainerLogs(ctx, containerID, opts)
	if err != nil {
		return nil, fmt.Errorf("docker logs %s: %w", shortID(containerID), err)
	}
	return reader, nil
}

func shortID(id string) string {
	if len(id) > 12 {
		return id[:12]
	}
	return id
}
func (s *Service) validate() error {
	if s == nil {
		return fmt.Errorf("docker service is nil")
	}

	if s.client == nil {
		return fmt.Errorf("docker client is nil")
	}

	if s.client.sdk == nil {
		return fmt.Errorf("docker sdk client is nil")
	}

	return nil
}
func parseDockerTime(value string) time.Time {
	if value == "" {
		return time.Time{}
	}

	t, err := time.Parse(time.RFC3339Nano, value)
	if err != nil {
		return time.Time{}
	}

	return t
}
func mapContainerPorts(ports nat.PortMap) []Port {
	result := make([]Port, 0, len(ports))
	for port, bindings := range ports {
		for _, binding := range bindings {
			result = append(result, Port{
				Private:  int(port.Int()),
				Public:   binding.HostPort,
				Protocol: string(port.Proto()),
			})
		}
	}
	return result
}
func mapContainerMounts(mounts []types.MountPoint) []Mount {
	result := make([]Mount, 0, len(mounts))
	for _, mount := range mounts {
		result = append(result, Mount{

			Source: mount.Source,
			Target: mount.Destination,
			Mode:   mount.Mode,
		})
	}
	return result
}
func mapContainerNetworks(networks map[string]*network.EndpointSettings) []Network {
	result := make([]Network, 0, len(networks))
	for name, settings := range networks {
		result = append(result, Network{
			Name:     name,
			IP:       settings.IPAddress,
			Gateway:  settings.Gateway,
			DNSNames: settings.DNSNames,
		})
	}
	return result
}

func mapContainerInspect(container types.ContainerJSON) *ContainerInspect {
	return &ContainerInspect{
		ID:      container.ID,
		ShortID: shortID(container.ID),
		Name:    container.Name,
		Image:   container.Config.Image,
		State: State{
			Status:     container.State.Status,
			Running:    container.State.Running,
			Paused:     container.State.Paused,
			Restarting: container.State.Restarting,
		},
		Created:       parseDockerTime(container.Created),
		StartedAt:     parseDockerTime(container.State.StartedAt),
		Ports:         mapContainerPorts(container.NetworkSettings.Ports),
		Mounts:        mapContainerMounts(container.Mounts),
		Networks:      mapContainerNetworks(container.NetworkSettings.Networks),
		WorkingDir:    container.Config.WorkingDir,
		Cmd:           container.Config.Cmd,
		RestartPolicy: string(container.HostConfig.RestartPolicy.Name),
		Entrypoint:    container.Config.Entrypoint,
		Env:           container.Config.Env,
	}
}

func (s *Service) InspectContainer(ctx context.Context, containerID string) (*ContainerInspect, error) {

	if err := s.validate(); err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	containerJSON, err := s.client.sdk.ContainerInspect(ctx, containerID)
	if err != nil {
		return nil, fmt.Errorf("docker inspect %s: %w", shortID(containerID), err)
	}
	return mapContainerInspect(containerJSON), nil
}

// RemoveContainer removes a container. Without force, Docker refuses to remove
// one that is running.
func (s *Service) RemoveContainer(ctx context.Context, containerID string, force bool) error {
	ctx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()

	if err := s.client.sdk.ContainerRemove(ctx, containerID, container.RemoveOptions{Force: force}); err != nil {
		return fmt.Errorf("docker remove %s: %w", shortID(containerID), err)
	}
	return nil
}
