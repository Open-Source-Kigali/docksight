package cmd

import (
	"fmt"
	"net"

	"github.com/rodriguecyber/docksight/apps/cli/cmd/config"
	"github.com/rodriguecyber/docksight/apps/cli/cmd/internal/installer"
	"github.com/rodriguecyber/docksight/apps/cli/cmd/internal/system"
	"github.com/rodriguecyber/docksight/apps/cli/cmd/internal/ui"

	"github.com/spf13/cobra"
)

var installCMD = &cobra.Command{
	Use:   "install",
	Short: "Install DockSight",
	Long: "Install the DockSight CLI onto PATH, install the platform bundle " +
		"and start the stack.",

	RunE: func(cmd *cobra.Command, args []string) error {

		ui.Banner()

		if err := system.Validate(
			cmd.Context(),
			consoleReporter{},
			system.PlatformRequirements(),
		); err != nil {
			return err
		}

		cfg := config.Default()

		showConfig(cfg)

		if err := installer.New(cfg, consoleReporter{}).Install(cmd.Context()); err != nil {
			return err
		}

		host := primaryIPv4()
		if host == "" {
			host = "localhost"
		}
		ui.Success(installSuccessMessage(cfg.Port, host))

		return nil
	},
}

func primaryIPv4() string {
	interfaces, err := net.Interfaces()
	if err != nil {
		return ""
	}
	for _, iface := range interfaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}
		for _, addr := range addrs {
			var ip net.IP
			switch value := addr.(type) {
			case *net.IPNet:
				ip = value.IP
			case *net.IPAddr:
				ip = value.IP
			}
			if ip4 := ip.To4(); ip4 != nil && !ip4.IsLoopback() {
				return ip4.String()
			}
		}
	}
	return ""
}

func installSuccessMessage(port int, host string) string {
	return fmt.Sprintf("DockSight is running on http://%s:%d", host, port)
}

func init() {
	rootCmd.AddCommand(installCMD)
}
