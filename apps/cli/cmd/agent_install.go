package cmd

import (
	"errors"
	"fmt"

	"github.com/Open-Source-Kigali/docksight/apps/cli/cmd/internal/agent/install"
	"github.com/Open-Source-Kigali/docksight/apps/cli/cmd/internal/ui"

	"github.com/spf13/cobra"
)

var (
	agentPlatformURL string
	agentVersion     string
)

var agentInstallCMD = &cobra.Command{
	Use:   "install",
	Short: "Install the DockSight Agent on this host",
	Long: "Download the agent, configure it against a DockSight platform, " +
		"register it with the host's service manager — systemd on Linux, the " +
		"Service Control Manager on Windows — and verify that it connects.",
	Example: "  docksight agent install --url https://platform.example.com",

	RunE: func(cmd *cobra.Command, args []string) error {

		ui.Banner()

		serverURL, err := resolvePlatformURL()

		if err != nil {
			return err
		}

		layout := install.DefaultLayout()

		ui.Info("Agent binary:  " + layout.BinaryPath)
		ui.Info("Configuration: " + layout.ConfigPath())
		ui.Info("Service:       " + layout.ServiceName)
		ui.Info("Platform:      " + serverURL)

		installer := install.New(layout, serverURL, consoleReporter{})
		installer.Version = agentVersion

		health, err := installer.Install(cmd.Context())

		if err != nil {
			return err
		}

		if health.Connected {
			ui.Success("DockSight Agent installed and connected")
		} else {
			ui.Success("DockSight Agent installed")
		}

		return nil
	},
}

// resolvePlatformURL takes the platform URL from the flag, or asks for it,
// and normalizes it to the agent WebSocket endpoint.
func resolvePlatformURL() (string, error) {

	raw := agentPlatformURL

	if raw == "" {

		if !ui.Interactive() {
			return "", errors.New(
				"the platform URL is required: pass --url https://platform.example.com",
			)
		}

		answer, err := ui.Ask("DockSight platform URL", "")

		if err != nil {
			return "", err
		}

		raw = answer
	}

	normalized, err := install.NormalizeServerURL(raw)

	if err != nil {
		return "", fmt.Errorf("invalid platform URL: %w", err)
	}

	return normalized, nil
}

func init() {

	agentInstallCMD.Flags().StringVar(
		&agentPlatformURL,
		"url",
		"",
		"DockSight platform URL, e.g. https://platform.example.com",
	)

	agentInstallCMD.Flags().StringVar(
		&agentVersion,
		"version",
		"",
		"install a specific release tag instead of the latest, e.g. v0.0.1",
	)

	agentCMD.AddCommand(agentInstallCMD)
}
