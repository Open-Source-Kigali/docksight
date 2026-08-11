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
	Short: "Check the DockSight web, server, and db status",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Default()
		installed, err := state.Load(cfg.StatePath())
		if err != nil {
			return err
		}
		if !installed.Installed() {
			ui.Warning("DockSight is not installed (missing state.json)")
			return fmt.Errorf("not installed")
		}

		ui.Info("CLI version: " + installed.CLIVersion)
		ui.Info("Platform version: " + installed.PlatformVersion)

		runner := compose.NewRunner(cfg.InstallationDir, config.ComposeFileName)
		services, err := runner.Status(cmd.Context())
		if err != nil {
			return err
		}

		notReady := 0
		for _, service := range services {
			line := service.Describe()
			if service.Ready() {
				ui.Success(line)
			} else {
				ui.Warning(line)
				notReady++
			}
		}

		if notReady > 0 {
			return fmt.Errorf("%d service(s) not ready", notReady)
		}
		return nil
	},
}

func init() {
	rootCmd.AddCommand(statusCMD)
}
