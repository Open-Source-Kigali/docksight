package cmd

import (
	"strings"
	"testing"

	"github.com/spf13/cobra"
)

func TestCommandsRejectExtraArguments(t *testing.T) {
	commands := []*cobra.Command{versionCMD, agentStartCMD, agentStopCMD, agentRestartCMD}
	for _, command := range commands {
		t.Run(command.CommandPath(), func(t *testing.T) {
			for _, test := range []struct {
				name string
				args []string
			}{
				{name: "one argument", args: []string{"bogus"}},
				{name: "multiple arguments", args: []string{"bogus", "extra"}},
				{name: "empty argument", args: []string{""}},
				{name: "whitespace argument", args: []string{" "}},
			} {
				t.Run(test.name, func(t *testing.T) {
					if err := command.ValidateArgs(test.args); err == nil {
						t.Fatalf("accepted extra arguments %q", test.args)
					} else if !strings.Contains(err.Error(), command.CommandPath()) {
						t.Fatalf("error %q does not identify %q", err, command.CommandPath())
					}
				})
			}

			for _, args := range [][]string{nil, {}} {
				if err := command.ValidateArgs(args); err != nil {
					t.Fatalf("rejected no arguments: %v", err)
				}
			}
		})
	}
}
