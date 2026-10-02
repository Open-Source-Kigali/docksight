package cmd

import (
	"fmt"

	"github.com/Open-Source-Kigali/docksight/apps/cli/cmd/config"
	"github.com/Open-Source-Kigali/docksight/apps/cli/cmd/internal/compose"
	"github.com/Open-Source-Kigali/docksight/apps/cli/cmd/internal/state"
	"github.com/Open-Source-Kigali/docksight/apps/cli/cmd/internal/ui"

	"github.com/spf13/cobra"
)

var statusCMD = &cobra.Command{
	Use:   "status",
	Short: "Check the status of the DockSight platform services",
	Long: "Report the real state of every installed platform service. " +
		"Exits non-zero if DockSight is not installed or any service is not ready, " +
		"so `docksight status && ...` is usable in scripts.",

	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Default()

		installed, err := state.Load(cfg.StatePath())
		if err != nil {
			return err
		}

		if !installed.Installed() {
			return fmt.Errorf(
				"DockSight is not installed (no state at %s)",
				cfg.StatePath(),
			)
		}

		ui.Info("CLI version: " + installed.CLIVersion)
		ui.Info("Platform version: " + installed.PlatformVersion)

		runner := compose.NewRunner(cfg.InstallationDir, config.ComposeFileName)
		services, err := runner.Status(cmd.Context())
		if err != nil {
			return err
		}

		if len(services) == 0 {
			return fmt.Errorf("no services found in %s", cfg.ComposePath())
		}

		notReady := false
		for _, service := range services {
			if service.Ready() {
				ui.Success(service.Describe())
			} else {
				ui.Warning(service.Describe())
				notReady = true
			}
		}

		if notReady {
			return fmt.Errorf("one or more services are not ready")
		}

		return nil
	},
}

func init() {
	rootCmd.AddCommand(statusCMD)
}
