package cmd

import (
	"os"

	"github.com/Open-Source-Kigali/docksight/apps/cli/cmd/internal/buildinfo"
	"github.com/Open-Source-Kigali/docksight/apps/cli/cmd/internal/ui"
	"github.com/spf13/cobra"
)

var (
	asciiOutput bool

	rootCmd = &cobra.Command{
		Use:     "docksight",
		Short:   "DockSight CLI - install and manage the DockSight platform and agent",
		Version: buildinfo.Version,

		// A failing install is a runtime error, not a usage mistake: printing the
		// flag reference after it buries the actual cause. Errors are reported
		// once, by Execute.
		SilenceUsage:  true,
		SilenceErrors: true,
		PersistentPreRun: func(cmd *cobra.Command, args []string) {
			if asciiOutput {
				ui.SetUnicode(false)
			}
		},
	}
)

func Execute() {

	// A mistyped flag is the one case where the usage block does help.
	rootCmd.SetFlagErrorFunc(func(command *cobra.Command, err error) error {
		command.Println(command.UsageString())
		return err
	})

	if err := rootCmd.Execute(); err != nil {
		ui.Error(err.Error())
		os.Exit(1)
	}
}

func init() {
	rootCmd.PersistentFlags().BoolVar(&asciiOutput, "ascii", false, "use ASCII status symbols instead of Unicode")
}
