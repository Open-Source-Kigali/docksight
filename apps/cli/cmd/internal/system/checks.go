package system

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"time"
)

// supportedArchitectures are the platforms DockSight publishes builds for.
var supportedArchitectures = []string{"amd64", "arm64"}

// connectivityProbe is the host the installer must reach to download
// releases. Checking anything else would prove the wrong thing.
const connectivityProbe = "https://api.github.com"

// supportedOperatingSystems are the hosts DockSight installs on.
//
// Windows is in this list for both deliverables. The agent runs natively as a
// Service Control Manager service; the platform is five Linux container
// images run by a Docker Engine in Linux-container mode, which on Windows
// means Docker Desktop. Neither ships for macOS.
var supportedOperatingSystems = []string{"linux", "windows"}

// NotElevatedError reports that this process lacks the privileges to install
// a service.
//
// It is a distinct type so a caller can recognise the one validation failure
// that ElevationHint answers, without matching on the message. Every other
// failed check needs a different fix — a Docker daemon that is down is not
// started by running as root.
type NotElevatedError struct {
	// Reason says what is missing, in the host's own terms.
	Reason string
}

func (e *NotElevatedError) Error() string {
	return e.Reason
}

// CheckOS reports whether this is a supported operating system.
//
// Both installers share this gate. They were briefly separate, while the
// agent supported Windows and the platform did not; now that the platform
// installs there too, one list is the truth and a second would only be a
// place for the two to drift apart.
func CheckOS() error {

	for _, supported := range supportedOperatingSystems {

		if runtime.GOOS == supported {
			return nil
		}
	}

	return fmt.Errorf(
		"DockSight installs on %s, this host runs %s",
		strings.Join(supportedOperatingSystems, " and "),
		runtime.GOOS,
	)
}

// CheckDockerLinuxContainers reports whether the Engine runs Linux containers.
//
// This is a Windows question. A Docker Engine there can be switched between
// Linux and Windows container modes, and only one of them can be active. The
// platform is five Linux images — postgres and redis on Alpine among them —
// and in Windows mode the daemon rejects them with an image-manifest error
// that says nothing about the mode being wrong.
func CheckDockerLinuxContainers(ctx context.Context) error {

	command := exec.CommandContext(ctx, "docker", "info", "--format", "{{.OSType}}")

	output, err := command.Output()

	if err != nil {
		return fmt.Errorf("cannot determine the Docker container mode: %w", err)
	}

	mode := strings.TrimSpace(string(output))

	if mode == "linux" {
		return nil
	}

	return fmt.Errorf(
		"Docker is running %s containers, and the DockSight platform is built from Linux images. "+
			"Switch to Linux containers and run this again",
		mode,
	)
}

// DockerDesktop reports whether the Engine behind the CLI is Docker Desktop.
//
// It is not a requirement — a Docker Engine reached any other way is equally
// good, and better in one respect, which is why this is asked at all. Docker
// Desktop's engine starts with its desktop application in a user session, so
// a host that reboots to a sign-in screen has no Engine and therefore no
// platform until somebody signs in. The installer says so rather than leaving
// it to be discovered after an outage.
func DockerDesktop(ctx context.Context) bool {

	command := exec.CommandContext(ctx, "docker", "info", "--format", "{{.OperatingSystem}}")

	output, err := command.Output()

	if err != nil {
		return false
	}

	return strings.Contains(strings.ToLower(string(output)), "docker desktop")
}

// CheckArchitecture reports whether builds exist for this CPU.
func CheckArchitecture() error {

	for _, supported := range supportedArchitectures {

		if runtime.GOARCH == supported {
			return nil
		}
	}

	return fmt.Errorf(
		"unsupported architecture %s, DockSight publishes builds for %s",
		runtime.GOARCH,
		strings.Join(supportedArchitectures, " and "),
	)
}

// CheckDockerInstalled reports whether the docker CLI is on PATH.
func CheckDockerInstalled(ctx context.Context) error {

	if _, err := exec.LookPath("docker"); err != nil {
		return fmt.Errorf("docker is not installed: %w", err)
	}

	return nil
}

// CheckDockerRunning reports whether the daemon answers. `docker info` fails
// both when the daemon is down and when the user cannot reach its socket, so
// the error distinguishes the two.
func CheckDockerRunning(ctx context.Context) error {

	command := exec.CommandContext(ctx, "docker", "info", "--format", "{{.ServerVersion}}")

	output, err := command.CombinedOutput()

	if err == nil {
		return nil
	}

	message := strings.TrimSpace(string(output))

	if strings.Contains(message, "permission denied") {
		return errors.New(
			"cannot reach the Docker daemon: permission denied. Run as root, or add this user to the docker group",
		)
	}

	return fmt.Errorf("the Docker daemon is not running: %s", firstLine(message))
}

// CheckDockerCompose reports whether the compose plugin is available.
func CheckDockerCompose(ctx context.Context) error {

	command := exec.CommandContext(ctx, "docker", "compose", "version")

	if output, err := command.CombinedOutput(); err != nil {
		return fmt.Errorf(
			"docker compose is not available: %s",
			firstLine(strings.TrimSpace(string(output))),
		)
	}

	return nil
}

// CheckSystemd reports whether systemd is the init system. The presence of
// systemctl is not enough: it is installed inside containers and on hosts
// running a different init, where enabling a unit silently does nothing.
//
// Nothing calls this on Windows — see agent_windows.go for what takes its
// place there.
func CheckSystemd() error {

	if _, err := exec.LookPath("systemctl"); err != nil {
		return errors.New("systemd is not available: systemctl not found")
	}

	// systemd creates this directory only when it is PID 1.
	if _, err := os.Stat("/run/systemd/system"); err != nil {
		return errors.New(
			"systemd is not the init system on this host, the agent service cannot be installed",
		)
	}

	return nil
}

// CheckInternet reports whether the release host is reachable.
func CheckInternet(ctx context.Context) error {

	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	request, err := http.NewRequestWithContext(ctx, http.MethodHead, connectivityProbe, nil)

	if err != nil {
		return err
	}

	response, err := http.DefaultClient.Do(request)

	if err != nil {

		var dnsError *net.DNSError

		if errors.As(err, &dnsError) {
			return fmt.Errorf("no internet connectivity: cannot resolve %s", dnsError.Name)
		}

		return fmt.Errorf("no internet connectivity: cannot reach %s: %w", connectivityProbe, err)
	}

	defer response.Body.Close()

	return nil
}

func firstLine(message string) string {

	if message == "" {
		return "no output from docker"
	}

	if index := strings.IndexByte(message, '\n'); index >= 0 {
		return message[:index]
	}

	return message
}
