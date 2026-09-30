package cmd

import (
	"strings"
	"testing"

	"github.com/spf13/cobra"
)

func TestAgentCommandRegistration(t *testing.T) {
	usage := agentCMD.UsageString()
	for _, command := range []*cobra.Command{agentStatusCMD, agentLogsCMD} {
		t.Run(command.Name(), func(t *testing.T) {
			count := 0
			for _, line := range strings.Split(usage, "\n") {
				fields := strings.Fields(line)
				if len(fields) > 0 && fields[0] == command.Name() {
					count++
				}
			}
			if count != 1 {
				t.Errorf("agent help lists %s %d times, want once", command.Name(), count)
			}

			resolved, remaining, err := rootCmd.Find([]string{"agent", command.Name()})
			if err != nil {
				t.Fatal(err)
			}
			if resolved != command || len(remaining) != 0 {
				t.Errorf("agent %s does not resolve to its implemented command", command.Name())
			}
		})
	}

	if agentLogsCMD.Flags().Lookup("lines") == nil {
		t.Error("agent logs is missing its lines flag")
	}
	uninstall, remaining, err := rootCmd.Find([]string{"agent", "uninstall"})
	if err != nil || uninstall.Name() != "uninstall" || len(remaining) != 0 {
		t.Error("agent uninstall placeholder is missing")
	}
}
