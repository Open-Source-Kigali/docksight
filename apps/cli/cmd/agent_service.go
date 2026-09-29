package cmd

import (
	"context"
	"fmt"
	"runtime"
	"strings"
	"time"

	"github.com/Open-Source-Kigali/docksight/apps/cli/cmd/internal/agent/install"
	"github.com/Open-Source-Kigali/docksight/apps/cli/cmd/internal/system"
	"github.com/Open-Source-Kigali/docksight/apps/cli/cmd/internal/ui"

	"github.com/spf13/cobra"
)

// How long to wait for the service manager to report the unit active after
// start/restart. `systemctl start` returning 0, like the SCM accepting a start
// request, only means the request was accepted.
const agentServiceSettle = 5 * time.Second
const agentServicePoll = time.Second

const agentServiceRootHint = "this command must be run as root — try `sudo docksight agent %s`"

const agentServiceAdministratorHint = "this command must be run as Administrator — " +
	"run `docksight agent %s` from an Administrator prompt"

func agentLayout() install.Layout {
	return install.DefaultLayout()
}

// agentServiceElevationHint is the format string for a command that was run
// without the rights it needs. The wording is the host's, not DockSight's:
// "sudo" means nothing on Windows and neither does an Administrator prompt on
// Linux.
func agentServiceElevationHint() string {
	if runtime.GOOS == "windows" {
		return agentServiceAdministratorHint
	}
	return agentServiceRootHint
}

func requireElevation(command string) error {
	if err := system.CheckElevation(); err == nil {
		return nil
	}
	return fmt.Errorf(agentServiceElevationHint(), command)
}

func isPermissionError(err error) bool {
	if err == nil {
		return false
	}
	message := strings.ToLower(err.Error())
	return strings.Contains(message, "permission denied") ||
		strings.Contains(message, "access denied") ||
		strings.Contains(message, "access is denied") ||
		strings.Contains(message, "interactive authentication required")
}

func wrapAgentServiceError(command string, err error) error {
	if err == nil {
		return nil
	}
	if isPermissionError(err) {
		return fmt.Errorf(agentServiceElevationHint(), command)
	}
	return err
}

// waitActive polls until the unit reports active or the settle window passes.
func waitActive(ctx context.Context, manager install.UnitController, unit string) (bool, error) {
	deadline := time.Now().Add(agentServiceSettle)

	for {
		active, err := manager.IsActive(ctx, unit)
		if err != nil {
			return false, err
		}
		if active {
			return true, nil
		}
		if time.Now().After(deadline) {
			return false, nil
		}
		timer := time.NewTimer(agentServicePoll)
		select {
		case <-ctx.Done():
			timer.Stop()
			return false, ctx.Err()
		case <-timer.C:
		}
	}
}

var agentStartCMD = &cobra.Command{
	Use:   "start",
	Short: "Start the agent service",
	Args:  cobra.NoArgs,
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireElevation("start"); err != nil {
			return err
		}

		layout := agentLayout()
		unit := layout.ServiceName
		manager := install.NewController(layout)
		ui.Info("Starting " + unit)

		if err := wrapAgentServiceError("start", manager.Start(cmd.Context(), unit)); err != nil {
			return err
		}

		active, err := waitActive(cmd.Context(), manager, unit)
		if err != nil {
			return wrapAgentServiceError("start", err)
		}
		if !active {
			return fmt.Errorf(
				"%s did not become active — inspect with: %s",
				unit,
				layout.LogsCommand(),
			)
		}

		ui.Success(unit + " is active")
		return nil
	},
}

var agentStopCMD = &cobra.Command{
	Use:   "stop",
	Short: "Stop the agent service",
	Args:  cobra.NoArgs,
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireElevation("stop"); err != nil {
			return err
		}

		layout := agentLayout()
		unit := layout.ServiceName
		manager := install.NewController(layout)
		ui.Info("Stopping " + unit)

		if err := wrapAgentServiceError("stop", manager.Stop(cmd.Context(), unit)); err != nil {
			return err
		}

		ui.Success(unit + " stopped")
		return nil
	},
}

var agentRestartCMD = &cobra.Command{
	Use:   "restart",
	Short: "Restart the agent service",
	Args:  cobra.NoArgs,
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireElevation("restart"); err != nil {
			return err
		}

		layout := agentLayout()
		unit := layout.ServiceName
		manager := install.NewController(layout)
		ui.Info("Restarting " + unit)

		if err := wrapAgentServiceError("restart", manager.Restart(cmd.Context(), unit)); err != nil {
			return err
		}

		active, err := waitActive(cmd.Context(), manager, unit)
		if err != nil {
			return wrapAgentServiceError("restart", err)
		}
		if !active {
			return fmt.Errorf(
				"%s did not become active after restart — inspect with: %s",
				unit,
				layout.LogsCommand(),
			)
		}

		ui.Success(unit + " is active")
		return nil
	},
}

func init() {
	agentCMD.AddCommand(agentStartCMD)
	agentCMD.AddCommand(agentStopCMD)
	agentCMD.AddCommand(agentRestartCMD)
}
