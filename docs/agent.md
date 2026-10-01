# Agent

The agent is a single static Go binary that runs beside a Docker Engine,
connects outbound to the platform over WebSocket, and never listens on a port.

---

## Responsibilities

| Responsibility | Detail |
| --- | --- |
| Registration | Announce identity, hostname, OS, architecture and version on every connection |
| Heartbeat | Prove liveness every 30 seconds |
| Container discovery | Answer `container.list` with what Docker reports |
| Container inspection | Answer `container.inspect` with Docker inspect data |
| Container lifecycle | Execute `start`, `stop`, `restart` and report the outcome |
| Log streaming | Stream container logs in batched chunks while a subscription is open |
| Reconnection | Re-establish the session automatically after any interruption |

The agent is deliberately **reactive**: it performs work the platform asks for
and reports results. It holds no policy of its own.

---

## Installation layout

| Path | Mode | Purpose |
| --- | --- | --- |
| `/usr/local/bin/docksight-agent` | `0755` | The binary |
| `/etc/docksight-agent/config.yaml` | `0640` | Configuration |
| `/etc/docksight-agent/identity.json` | `0600` | Durable identity, written by the agent |
| `/etc/systemd/system/docksight-agent.service` | `0644` | systemd unit |

---

## Configuration

```yaml title="/etc/docksight-agent/config.yaml"
# DockSight Agent configuration
# Written by "docksight agent install". Edit and restart the service:
#   sudo systemctl restart docksight-agent.service

agent:
  data_dir: "/etc/docksight-agent"
  identity_file: "/etc/docksight-agent/identity.json"

server:
  # DockSight platform WebSocket endpoint for agent registration
  url: "wss://platform.example.com/agents"

docker:
  socket: "/var/run/docker.sock"

logging:
  level: "info"
```

| Key | Default | Meaning |
| --- | --- | --- |
| `agent.data_dir` | `/etc/docksight-agent` | Working directory for agent state |
| `agent.identity_file` | `<data_dir>/identity.json` | Where the UUID is persisted |
| `server.url` | — | Platform WebSocket endpoint. Required. |
| `docker.socket` | `/var/run/docker.sock` | Engine socket. On Windows, `\\.\pipe\docker_engine`. |
| `logging.level` | `info` | `debug`, `info`, `warn`, `error` |

Apply changes with:

```bash
sudo systemctl restart docksight-agent
```

!!! tip "The installer rewrites this file"
    `agent install` and `agent update` regenerate `config.yaml` so a changed
    platform URL takes effect. Hand edits to other keys are overwritten — set
    them again after an upgrade, or open an issue if you need them preserved.

### URL normalization

The installer accepts a human-friendly platform URL and derives the endpoint:

| Input | Result |
| --- | --- |
| `https://platform.example.com` | `wss://platform.example.com/agents` |
| `http://10.0.0.5:2002` | `ws://10.0.0.5:2002/agents` |
| `platform.example.com` | `wss://platform.example.com/agents` |
| `https://example.com/docksight` | `wss://example.com/docksight/agents` |
| `https://platform.example.com//` | `wss://platform.example.com/agents` |

Paths are joined so that duplicate slashes can never yield `//agents`, and an
`/agents` suffix you type yourself is not repeated.

---

## Identity

On first connection the agent generates a UUID v4 and writes it to
`identity.json`:

```json title="/etc/docksight-agent/identity.json"
{
  "id": "bc2bc07d-e456-4979-9f11-3293965d7436",
  "created_at": "2026-07-31T22:14:03.114Z"
}
```

This file is what makes a host *the same host* across restarts, upgrades and
reinstalls. The platform keys its agent record on this UUID.

!!! danger "Never delete identity.json casually"
    Deleting it makes the agent generate a new UUID, and the platform will treat
    the machine as a brand-new host — the old record becomes an orphan that
    never comes back online. Copying it to another machine is worse: two agents
    would claim one identity.

The installer never creates or overwrites this file. It is created by the agent
itself on first connection, and preserved by every subsequent install or update.

!!! note "Why the installer does not pre-create it"
    The agent loads the file if it exists and **fails to start** if it exists
    without a valid `id`. An empty or `{}` placeholder would therefore break
    every boot, so the installer leaves the path free for the agent to fill.

---

## The systemd service

```ini title="/etc/systemd/system/docksight-agent.service"
[Unit]
Description=DockSight Agent
Documentation=https://github.com/Open-Source-Kigali/docksight
After=docker.service network.target network-online.target
Wants=network-online.target
Requires=docker.service

[Service]
Type=simple
ExecStart=/usr/local/bin/docksight-agent --config /etc/docksight-agent/config.yaml
Restart=always
RestartSec=5s

User=root
Group=root

StandardOutput=journal
StandardError=journal
SyslogIdentifier=docksight-agent

[Install]
WantedBy=multi-user.target
```

Why each directive is there:

- **`Requires=docker.service`, `After=docker.service`** — the agent's only job is
  reading the Docker socket. Starting before the Engine guarantees a failed
  first attempt.
- **`network-online.target`** — avoids a first connection attempt against an
  interface that has no address yet.
- **`Restart=always` with `RestartSec=5s`** — the agent should survive platform
  restarts and network drops. Without the delay, a crash-looping agent would
  hammer the platform.
- **`User=root`** — the Docker socket is root-owned. See
  [Security](security.md#the-docker-socket).

### Managing the service

```bash
sudo systemctl status docksight-agent
sudo systemctl restart docksight-agent
sudo systemctl stop docksight-agent
sudo systemctl disable --now docksight-agent

journalctl -u docksight-agent -f
journalctl -u docksight-agent -n 100 --no-pager
```

!!! info "`docksight agent start|stop|restart|status|logs` are placeholders"
    Those commands exist in the CLI but return
    `not implemented yet`. Use `systemctl` and `journalctl` for now — see the
    [Roadmap](roadmap.md#in-progress).

---

## Installation verification

The last phase of `agent install` does not trust `systemctl is-active` alone.
`systemctl start` returns as soon as the process is forked, so a service that
dies on a bad configuration still reports active for a moment.

```mermaid
graph TD
    A[Poll is-active] -->|active| B[Wait 5s to settle]
    A -->|never active| F1[Fail: service is not running]
    B --> C[Re-check active + NRestarts]
    C -->|restarts > 0| F2[Fail: crash loop, with journal excerpt]
    C -->|stable| D[Scan journal for connection evidence]
    D -->|websocket connected| S[Success: connected]
    D -->|failure marker| F3[Fail with the log line]
    D -->|nothing yet| W[Warn: running, connection unconfirmed]
```

The journal scan matches the agent's real log output — `websocket connected`,
`registration acknowledged` for success; `websocket dial`, `registration failed`,
`agent session ended`, `connection refused` for failure.

Three outcomes are possible, and they mean different things:

| Outcome | Meaning |
| --- | --- |
| `✓ Agent connected to wss://...` | Registered successfully |
| `⚠ running but no connection confirmed yet` | The service is healthy; the journal simply has no connection line yet. Follow with `journalctl -u docksight-agent -f`. |
| `✗ service failed to start: ... (N restarts)` | Crash loop; the diagnostic includes the journal excerpt |

---

## Updating

```bash
sudo docksight agent update
sudo docksight agent update --version v0.0.1
sudo docksight agent update --url https://new-platform.example.com
```

`agent update` reads the platform URL from the existing config so you do not
retype it. The binary is replaced by an atomic rename, so a running agent is
upgraded in place without a corrupted-binary window, and the service is
restarted afterwards.

Re-running `agent install` performs exactly the same work — `update` only adds
reading the URL from disk instead of requiring `--url`.

---

## Running the agent manually

Useful for debugging outside systemd:

```bash
sudo /usr/local/bin/docksight-agent --config /etc/docksight-agent/config.yaml
```

Set `logging.level: debug` in the config for verbose output, including heartbeat
confirmations.

---

## Windows support

The agent runs on Windows as a Service Control Manager service.
`docksight-agent-<version>-windows-amd64.exe` is published with every release,
and the Docker client talks to the Engine over the named pipe
`\\.\pipe\docker_engine`.

### One binary, two modes

The same executable runs as a console application and as a service. It decides
which at startup with `svc.IsWindowsService()` rather than taking a flag, so a
developer runs it directly and the SCM runs the identical file:

```powershell
# Console — logs to the terminal, Ctrl+C stops it
.\docksight-agent.exe --config config.yaml

# Service — installed by the CLI, managed with the usual tools
Start-Service docksight-agent
Stop-Service docksight-agent
Get-Service docksight-agent
```

`Stop-Service` sends `SERVICE_CONTROL_STOP`, which the agent turns into the
same context cancellation an interrupt produces: log streams close, the Docker
client closes, and the process exits 0. A machine reboot sends
`SERVICE_CONTROL_SHUTDOWN`, which is accepted the same way — without it Windows
would terminate the agent rather than stop it.

### Where the logs go

A Windows service has no console, so stdout goes nowhere. The agent writes to
two places instead:

| Destination | Contents |
| --- | --- |
| `C:\ProgramData\DockSight\logs\agent.log` | the full structured log |
| Windows Event Log, source `docksight-agent` | service lifecycle only — started, stopped, exited with an error |

```powershell
Get-Content 'C:\ProgramData\DockSight\logs\agent.log' -Tail 50 -Wait
Get-EventLog -LogName Application -Source docksight-agent -Newest 20
```

The file rotates at 10 MiB and keeps three previous generations, bounding disk
use at roughly 40 MiB — a service left running for months must not fill the
disk of the host it is monitoring. Restarting the agent appends rather than
truncating, so the log that explains a restart survives it.

Registering the Event Log source needs Administrator rights and is done once at
install time. An agent whose source is not registered still starts and runs
normally; only the Event Log entries are missing, and the log file still holds
everything.

On Linux none of this applies: the agent writes to stdout and systemd captures
it into the journal, which already provides rotation and retention.

### Installing

`docksight agent install` works on Windows exactly as it does on Linux, from an
**Administrator** PowerShell:

```powershell
.\docksight-cli.exe agent install --url https://platform.example.com
Get-Service docksight-agent
```

Running it again upgrades in place: the binary is replaced, the configuration is
rewritten with whatever `--url` now says, and the service is updated rather than
deleted and recreated — so its recovery actions and Event Log registration
survive. `identity.json` is never touched, on either platform.

Elevation is checked during validation, before anything is downloaded or
written. An unelevated run stops with
`this process is not elevated, and registering a Windows service needs
Administrator rights` and leaves the host untouched.

### Where things go

| | Linux | Windows |
| --- | --- | --- |
| Binary | `/usr/local/bin/docksight-agent` | `C:\Program Files\DockSight\docksight-agent.exe` |
| Configuration | `/etc/docksight-agent` | `C:\ProgramData\DockSight\agent` |
| Service name | `docksight-agent.service` | `docksight-agent` |
| Docker endpoint | `/var/run/docker.sock` | `\\.\pipe\docker_engine` |
| Service definition | `/etc/systemd/system/docksight-agent.service` | `HKLM\SYSTEM\CurrentControlSet\Services\docksight-agent` |

`ProgramFiles` and `ProgramData` are read from the environment, so a machine
that keeps them elsewhere is honoured.

### What has no systemd equivalent

The installer is written against one service-manager interface with two
implementations, and three parts of it map onto Windows only loosely:

- **There is no unit file.** Service configuration lives in the SCM, not on
  disk. What the installer renders for Windows is the command line the SCM
  stores and runs, which is the whole of what a service definition is there.
  `Restart=always` and `RestartSec=5s` become failure actions — restart, five
  seconds apart, repeating — with *enable actions for stops with errors* set, so
  an agent that exits on a bad configuration is retried rather than left
  stopped.
- **There is no daemon-reload.** systemd caches unit files and needs telling
  when they change; the SCM database was written directly and has nothing to
  reload. The call is a no-op on Windows.
- **There is no restart counter.** systemd exposes `NRestarts`. Windows counts
  failures only to decide which recovery action to run next, and exposes no
  equivalent. Verification instead watches the service's process ID across the
  two liveness checks it already makes — one before the settle window and one
  after — and treats a changed process ID as a restart. That catches the case
  the counter exists for: an agent that comes up, dies, and is restarted while
  the installer is still watching.

Verification reads `C:\ProgramData\DockSight\logs\agent.log` where it would read
the journal on Linux. The markers it looks for are the agent's own log strings
and are identical on both platforms.

---

## Related

- [WebSocket protocol](websocket-protocol.md) — what the agent sends and receives
- [Installation](installation.md#agent-installation) — walkthrough
- [Security](security.md#the-docker-socket) — what running as root means
