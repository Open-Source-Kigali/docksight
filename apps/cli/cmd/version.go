package cmd

import (
	"github.com/Open-Source-Kigali/docksight/apps/cli/cmd/config"
	"github.com/Open-Source-Kigali/docksight/apps/cli/cmd/internal/buildinfo"
	"github.com/Open-Source-Kigali/docksight/apps/cli/cmd/internal/state"
	"github.com/Open-Source-Kigali/docksight/apps/cli/cmd/internal/ui"

	"github.com/spf13/cobra"
)

var versionCMD = &cobra.Command{
	Use:   "version",
	Short: "Show DockSight version",
	Args:  cobra.NoArgs,

	RunE: func(cmd *cobra.Command, args []string) error {

		ui.Info("CLI version: " + buildinfo.Version)
		ui.Info("Commit: " + buildinfo.Commit)
		ui.Info("Build date: " + buildinfo.BuildDate)

		cfg := config.Default()

		installed, err := state.Load(cfg.StatePath())

		if err != nil {
			return err
		}

		if !installed.Installed() {
			ui.Info("Platform version: not installed")
			return nil
		}

		ui.Info("Platform version: " + installed.PlatformVersion)

		return nil
	},
}

func init() {
	rootCmd.AddCommand(versionCMD)
}
