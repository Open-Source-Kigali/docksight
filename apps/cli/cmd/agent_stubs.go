package cmd

import (
	"fmt"

	"github.com/spf13/cobra"
)

// The remaining agent commands are placeholders. They are declared now so the
// command tree is complete and `docksight agent --help` documents the
// intended surface, but each fails loudly rather than pretending to work.
var agentPlaceholders = []struct {
	use   string
	short string
}{
	{"uninstall", "Remove the DockSight Agent from this host"},
	// start / stop / restart are real commands in agent_service.go
	// logs is a real command in agent_logs.go
	// status is a real command in agent_status.go
}

func init() {
	for _, placeholder := range agentPlaceholders {
		command := &cobra.Command{
			Use:   placeholder.use,
			Short: placeholder.short,
			RunE: func(cmd *cobra.Command, args []string) error {
				return fmt.Errorf(
					"docksight agent %s will be ready soon",
					cmd.Name(),
				)
			},
		}
		agentCMD.AddCommand(command)
	}
}
