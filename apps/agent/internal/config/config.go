package config

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"

	"gopkg.in/yaml.v3"
)

// Config is the agent runtime configuration loaded from config.yaml.
type Config struct {
	Agent   AgentConfig   `yaml:"agent"`
	Server  ServerConfig  `yaml:"server"`
	Docker  DockerConfig  `yaml:"docker"`
	Logging LoggingConfig `yaml:"logging"`
}

// AgentConfig controls identity persistence and working directories.
type AgentConfig struct {
	DataDir      string `yaml:"data_dir"`
	IdentityFile string `yaml:"identity_file"`
}

// ServerConfig controls DockSight server connectivity.
type ServerConfig struct {
	URL string `yaml:"url"`
}

// DockerConfig holds local Docker Engine access settings.
type DockerConfig struct {
	Socket string `yaml:"socket"`
}

// LoggingConfig controls log verbosity.
type LoggingConfig struct {
	Level string `yaml:"level"`
}

// Load reads configuration from the given YAML path (default: config.yaml).
func Load(path string) (*Config, error) {
	if path == "" {
		path = "config.yaml"
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read config %q: %w", path, err)
	}

	cfg := defaultConfig()
	if err := yaml.Unmarshal(data, cfg); err != nil {
		return nil, fmt.Errorf("parse config %q: %w", path, err)
	}

	cfg.applyDefaults()
	if err := cfg.validate(); err != nil {
		return nil, fmt.Errorf("validate config %q: %w", path, err)
	}

	return cfg, nil
}

func defaultConfig() *Config {
	return &Config{
		Agent: AgentConfig{
			DataDir:      "./data",
			IdentityFile: "./data/identity.json",
		},
		Docker: DockerConfig{
			Socket: defaultDockerSocket(),
		},
		Logging: LoggingConfig{
			Level: "info",
		},
	}
}

func (c *Config) applyDefaults() {
	defaults := defaultConfig()

	if c.Agent.DataDir == "" {
		c.Agent.DataDir = defaults.Agent.DataDir
	}
	if c.Agent.IdentityFile == "" {
		c.Agent.IdentityFile = filepath.Join(c.Agent.DataDir, "identity.json")
	}
	if c.Docker.Socket == "" {
		c.Docker.Socket = defaults.Docker.Socket
	}
	if c.Logging.Level == "" {
		c.Logging.Level = defaults.Logging.Level
	}
}

func (c *Config) validate() error {
	if c.Agent.IdentityFile == "" {
		return fmt.Errorf("agent.identity_file is required")
	}
	if c.Server.URL == "" {
		return fmt.Errorf("server.url is required")
	}
	if c.Docker.Socket == "" {
		return fmt.Errorf("docker.socket is required")
	}
	return nil
}

func defaultDockerSocket() string {
	if runtime.GOOS == "windows" {
		return `\\.\pipe\docker_engine`
	}
	return "/var/run/docker.sock"
}
