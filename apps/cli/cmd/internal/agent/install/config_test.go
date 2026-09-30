package install

import (
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"testing"
	"time"
)

func TestNormalizeServerURL(t *testing.T) {

	cases := []struct {
		name  string
		input string
		want  string
	}{
		{
			name:  "https becomes wss and gains the endpoint",
			input: "https://platform.example.com",
			want:  "wss://platform.example.com/agents",
		},
		{
			name:  "http becomes ws",
			input: "http://10.0.0.5:2002",
			want:  "ws://10.0.0.5:2002/agents",
		},
		{
			// The case named in the spec: no "//agents" may ever be produced.
			name:  "trailing slash does not double up",
			input: "https://platform.example.com/",
			want:  "wss://platform.example.com/agents",
		},
		{
			name:  "many trailing slashes",
			input: "https://platform.example.com///",
			want:  "wss://platform.example.com/agents",
		},
		{
			name:  "an endpoint already typed is not repeated",
			input: "https://platform.example.com/agents",
			want:  "wss://platform.example.com/agents",
		},
		{
			name:  "an endpoint with a trailing slash",
			input: "https://platform.example.com/agents/",
			want:  "wss://platform.example.com/agents",
		},
		{
			name:  "wss is preserved",
			input: "wss://platform.example.com/agents",
			want:  "wss://platform.example.com/agents",
		},
		{
			name:  "ws is preserved",
			input: "ws://localhost:3000",
			want:  "ws://localhost:3000/agents",
		},
		{
			// A bare host must not be read as scheme "platform.example.com".
			name:  "a bare host defaults to the secure scheme",
			input: "platform.example.com",
			want:  "wss://platform.example.com/agents",
		},
		{
			name:  "a bare host with a port",
			input: "10.0.0.5:2002",
			want:  "wss://10.0.0.5:2002/agents",
		},
		{
			name:  "a path prefix is kept",
			input: "https://example.com/docksight",
			want:  "wss://example.com/docksight/agents",
		},
		{
			name:  "a path prefix with a trailing slash",
			input: "https://example.com/docksight/",
			want:  "wss://example.com/docksight/agents",
		},
		{
			name:  "surrounding whitespace is ignored",
			input: "  https://platform.example.com  ",
			want:  "wss://platform.example.com/agents",
		},
	}

	for _, testCase := range cases {

		t.Run(testCase.name, func(t *testing.T) {

			got, err := NormalizeServerURL(testCase.input)

			if err != nil {
				t.Fatal(err)
			}

			if got != testCase.want {
				t.Fatalf("got %q, want %q", got, testCase.want)
			}

			_, afterScheme, _ := strings.Cut(got, "://")

			if strings.Contains(afterScheme, "//") {
				t.Fatalf("produced a doubled slash: %q", got)
			}
		})
	}
}

func TestNormalizeServerURLRejectsBadInput(t *testing.T) {

	cases := map[string]string{
		"empty":               "",
		"whitespace only":     "   ",
		"unsupported scheme":  "ftp://platform.example.com",
		"scheme with no host": "https://",
		"missing scheme name": "://platform.example.com",
	}

	for name, input := range cases {

		t.Run(name, func(t *testing.T) {

			if _, err := NormalizeServerURL(input); err == nil {
				t.Fatalf("%q was accepted", input)
			}
		})
	}
}

func TestRenderConfigMatchesAgentSchema(t *testing.T) {

	layout := DefaultLayout()

	rendered := RenderConfig(layout, "wss://platform.example.com/agents")

	// The keys the agent's config loader unmarshals.
	for _, key := range []string{
		"agent:", "data_dir:", "identity_file:",
		"server:", "url:", "docker:", "socket:", "logging:", "level:",
	} {

		if !strings.Contains(rendered, key) {
			t.Errorf("rendered config is missing %q:\n%s", key, rendered)
		}
	}

	if !strings.Contains(rendered, `"wss://platform.example.com/agents"`) {
		t.Errorf("server url not quoted into the config:\n%s", rendered)
	}

	if !strings.Contains(rendered, strconv.Quote(layout.IdentityPath())) {
		t.Errorf("identity path not written:\n%s", rendered)
	}
}

// The generated config is read by an agent on the target host, so every path
// in it must use that host's separator throughout. A CLI that mixed the two
// would produce a file the agent parses happily and then cannot act on.
func TestRenderConfigUsesOneSeparator(t *testing.T) {

	cases := map[string]struct {
		layout Layout
		wrong  string
	}{
		"linux":   {layout: LinuxLayout(), wrong: `\`},
		"windows": {layout: WindowsLayout(), wrong: "/"},
	}

	for name, testCase := range cases {

		t.Run(name, func(t *testing.T) {

			rendered := RenderConfig(testCase.layout, "wss://platform.example.com/agents")

			for _, line := range strings.Split(rendered, "\n") {

				// The platform URL is a URL, not a path, and the Windows
				// named pipe is neither.
				if strings.Contains(line, "url:") || strings.Contains(line, "socket:") {
					continue
				}

				if strings.Contains(line, testCase.wrong) {
					t.Errorf("mixed separators in %q:\n%s", line, rendered)
				}
			}
		})
	}
}

// The Windows config carries Windows paths that survive YAML unquoting.
func TestRenderConfigWindowsPaths(t *testing.T) {

	layout := WindowsLayout()

	rendered := RenderConfig(layout, "wss://platform.example.com/agents")

	// %q doubles every backslash, and a YAML double-quoted scalar takes it
	// back out again. The doubled form is what must appear on disk.
	for _, expected := range []string{
		`identity_file: "` + strings.ReplaceAll(layout.IdentityPath(), `\`, `\\`) + `"`,
		`socket: "\\\\.\\pipe\\docker_engine"`,
	} {

		if !strings.Contains(rendered, expected) {
			t.Errorf("rendered config is missing %s:\n%s", expected, rendered)
		}
	}

	if !strings.Contains(rendered, "Restart-Service docksight-agent") {
		t.Errorf("the config tells a Windows operator to use systemctl:\n%s", rendered)
	}
}

func TestWriteConfig(t *testing.T) {

	layout := DefaultLayout()
	layout.ConfigDir = filepath.Join(t.TempDir(), "docksight-agent")

	if err := WriteConfig(layout, "wss://platform.example.com/agents"); err != nil {
		t.Fatal(err)
	}

	content, err := os.ReadFile(layout.ConfigPath())

	if err != nil {
		t.Fatal(err)
	}

	if !strings.Contains(string(content), "wss://platform.example.com/agents") {
		t.Fatalf("config does not carry the platform URL:\n%s", string(content))
	}
}

// Reinstalling against a new platform must take effect.
func TestWriteConfigOverwrites(t *testing.T) {

	layout := DefaultLayout()
	layout.ConfigDir = t.TempDir()

	if err := WriteConfig(layout, "wss://old.example.com/agents"); err != nil {
		t.Fatal(err)
	}

	if err := WriteConfig(layout, "wss://new.example.com/agents"); err != nil {
		t.Fatal(err)
	}

	content, err := os.ReadFile(layout.ConfigPath())

	if err != nil {
		t.Fatal(err)
	}

	if strings.Contains(string(content), "old.example.com") {
		t.Fatal("the previous platform URL survived")
	}
}

func TestConfigFileIsNotWorldReadable(t *testing.T) {

	if runtime.GOOS == "windows" {
		t.Skip("unix permission bits are not meaningful on windows")
	}

	layout := DefaultLayout()
	layout.ConfigDir = t.TempDir()

	if err := WriteConfig(layout, "wss://platform.example.com/agents"); err != nil {
		t.Fatal(err)
	}

	info, err := os.Stat(layout.ConfigPath())

	if err != nil {
		t.Fatal(err)
	}

	if info.Mode().Perm()&0o004 != 0 {
		t.Fatalf("config is world readable: %04o", info.Mode().Perm())
	}
}

// An update reads the platform URL back rather than asking for it again.
func TestReadServerURL(t *testing.T) {

	layout := DefaultLayout()
	layout.ConfigDir = t.TempDir()

	if err := WriteConfig(layout, "wss://platform.example.com/agents"); err != nil {
		t.Fatal(err)
	}

	got, err := ReadServerURL(layout)

	if err != nil {
		t.Fatal(err)
	}

	if got != "wss://platform.example.com/agents" {
		t.Fatalf("got %q", got)
	}
}

// A hand-edited config must still be readable: unquoted values, comments and
// a docker section that also has no url key.
func TestReadServerURLHandEdited(t *testing.T) {

	layout := DefaultLayout()
	layout.ConfigDir = t.TempDir()

	content := `# DockSight Agent configuration

agent:
  data_dir: /etc/docksight-agent

server:
  # the platform
  url: ws://10.0.0.5:2002/agents

docker:
  socket: /var/run/docker.sock
`

	if err := os.WriteFile(layout.ConfigPath(), []byte(content), 0o640); err != nil {
		t.Fatal(err)
	}

	got, err := ReadServerURL(layout)

	if err != nil {
		t.Fatal(err)
	}

	if got != "ws://10.0.0.5:2002/agents" {
		t.Fatalf("got %q", got)
	}
}

func TestReadServerURLMissingInstall(t *testing.T) {

	layout := DefaultLayout()
	layout.ConfigDir = t.TempDir()

	if _, err := ReadServerURL(layout); err == nil {
		t.Fatal("expected an error with no config present")
	}
}

func TestReadServerURLMissingKey(t *testing.T) {

	layout := DefaultLayout()
	layout.ConfigDir = t.TempDir()

	if err := os.WriteFile(layout.ConfigPath(), []byte("agent:\n  data_dir: /x\n"), 0o640); err != nil {
		t.Fatal(err)
	}

	if _, err := ReadServerURL(layout); err == nil {
		t.Fatal("expected an error when server.url is absent")
	}
}

func TestUpdateServerURLPreservesConfigAndIdentity(t *testing.T) {

	layout := DefaultLayout()
	layout.ConfigDir = t.TempDir()

	config := `agent:
  data_dir: "/custom/data"
  identity_file: "/custom/data/identity.json"
server:
  url: "wss://old.example.com/agents"
docker:
  socket: "/custom/docker.sock"
logging:
  level: "debug"
`

	if err := os.WriteFile(layout.ConfigPath(), []byte(config), 0o640); err != nil {
		t.Fatal(err)
	}

	identity := []byte(`{"id":"preserve-me"}`)

	if err := os.WriteFile(layout.IdentityPath(), identity, 0o600); err != nil {
		t.Fatal(err)
	}

	identityTime := time.Date(2026, 8, 1, 12, 0, 0, 0, time.UTC)

	if err := os.Chtimes(layout.IdentityPath(), identityTime, identityTime); err != nil {
		t.Fatal(err)
	}

	if err := UpdateServerURL(layout, "wss://new.example.com/agents"); err != nil {
		t.Fatal(err)
	}

	updated, err := os.ReadFile(layout.ConfigPath())

	if err != nil {
		t.Fatal(err)
	}

	for _, expected := range []string{
		`url: "wss://new.example.com/agents"`,
		`socket: "/custom/docker.sock"`,
		`level: "debug"`,
	} {

		if !strings.Contains(string(updated), expected) {
			t.Errorf("updated config lost %q:\n%s", expected, updated)
		}
	}

	identityAfter, err := os.ReadFile(layout.IdentityPath())

	if err != nil {
		t.Fatal(err)
	}

	if string(identityAfter) != string(identity) {
		t.Fatalf("identity changed from %q to %q", identity, identityAfter)
	}

	info, err := os.Stat(layout.IdentityPath())

	if err != nil {
		t.Fatal(err)
	}

	if !info.ModTime().Equal(identityTime) {
		t.Fatalf("identity mtime changed from %s to %s", identityTime, info.ModTime())
	}
}

func TestIdentityExists(t *testing.T) {

	layout := DefaultLayout()
	layout.ConfigDir = t.TempDir()

	if IdentityExists(layout) {
		t.Fatal("a fresh host reported an existing identity")
	}

	if err := os.WriteFile(layout.IdentityPath(), []byte(`{"id":"abc"}`), 0o600); err != nil {
		t.Fatal(err)
	}

	if !IdentityExists(layout) {
		t.Fatal("a registered host reported no identity")
	}
}

func TestLinuxLayoutPaths(t *testing.T) {

	layout := LinuxLayout()

	if layout.BinaryPath != "/usr/local/bin/docksight-agent" {
		t.Errorf("binary path is %q", layout.BinaryPath)
	}

	if layout.ConfigPath() != "/etc/docksight-agent/config.yaml" {
		t.Errorf("config path is %q", layout.ConfigPath())
	}

	if layout.IdentityPath() != "/etc/docksight-agent/identity.json" {
		t.Errorf("identity path is %q", layout.IdentityPath())
	}

	if layout.ServiceName != "docksight-agent.service" {
		t.Errorf("service name is %q", layout.ServiceName)
	}
}

// These are asserted on every host, not only on Windows: the joining must
// come from the layout rather than from whatever the CLI was built for.
func TestWindowsLayoutPaths(t *testing.T) {

	t.Setenv("ProgramFiles", `C:\Program Files`)
	t.Setenv("ProgramData", `C:\ProgramData`)

	layout := WindowsLayout()

	expected := map[string]string{
		"binary":   `C:\Program Files\DockSight\docksight-agent.exe`,
		"config":   `C:\ProgramData\DockSight\agent\config.yaml`,
		"identity": `C:\ProgramData\DockSight\agent\identity.json`,
		"log":      `C:\ProgramData\DockSight\logs\agent.log`,
	}

	got := map[string]string{
		"binary":   layout.BinaryPath,
		"config":   layout.ConfigPath(),
		"identity": layout.IdentityPath(),
		"log":      layout.LogPath,
	}

	for name, want := range expected {

		if got[name] != want {
			t.Errorf("%s path is %q, want %q", name, got[name], want)
		}
	}

	// The SCM matches on the name the agent registers itself under, and that
	// name has no systemd filename suffix.
	if layout.ServiceName != "docksight-agent" {
		t.Errorf("service name is %q", layout.ServiceName)
	}
}

// A relocated ProgramData must be honoured: a Windows machine is free to put
// it elsewhere, and a localized one does.
func TestWindowsLayoutHonoursEnvironment(t *testing.T) {

	t.Setenv("ProgramData", `D:\State\`)

	layout := WindowsLayout()

	if layout.ConfigPath() != `D:\State\DockSight\agent\config.yaml` {
		t.Errorf("config path is %q", layout.ConfigPath())
	}
}

func TestDefaultLayoutMatchesHost(t *testing.T) {

	layout := DefaultLayout()

	if layout.Windows != (runtime.GOOS == "windows") {
		t.Fatalf("layout.Windows is %v on %s", layout.Windows, runtime.GOOS)
	}
}
