# Roadmap

What is built, what is being built, and what is planned. This page is deliberately
conservative: a feature appears under **Completed** only when it works
end-to-end on a real host.

---

## Completed

### Installation and lifecycle

- [x] Platform installer (`docksight install`) — validate, download, extract,
      configure, start, verify
- [x] GitHub Release-based distribution with kind-based asset discovery
- [x] Docker Compose orchestration with health-aware readiness checks
- [x] Credential generation with `crypto/rand`, preserved across reinstalls
- [x] CLI self-installation via atomic binary replacement
- [x] Independent CLI and platform updates (`docksight update`)
- [x] Version pinning and rollback (`--version`)
- [x] Install state recorded in `state.json`
- [x] Idempotent installs — re-running is the supported upgrade path

### Agent

- [x] Agent installer (`docksight agent install`) — six phases
- [x] systemd service generation, enable and start
- [x] Platform URL normalization (`https://host` → `wss://host/agents`)
- [x] Durable identity, preserved across upgrades and reinstalls
- [x] YAML configuration with defaults
- [x] Docker socket detection, Unix socket and Windows named pipe
- [x] Installation verification: liveness, crash-loop detection, journal
      inspection for connection evidence
- [x] Agent updates with version pinning (`docksight agent update`)

### Protocol and runtime

- [x] WebSocket transport with a single message envelope
- [x] Agent registration and upsert by UUID
- [x] 30-second heartbeat
- [x] Automatic reconnection with re-registration, exponential backoff capped
      at 30 seconds, and full jitter
- [x] Container discovery (`container.list` / `listed`)
- [x] Container inspection (`container.inspect` / `inspected`)
- [x] Container lifecycle: start, stop, restart, pause, unpause, remove, with
      correlated results
- [x] Container log streaming with batched chunks and subscription control

### Release engineering

- [x] Reproducible multi-target build script
- [x] Publish script with post-upload verification against the GitHub API
- [x] Strict separation of CLI, platform bundle and agent artifacts
- [x] Backward-compatible discovery of legacy bundle names

### Security and robustness

- [x] Path-traversal-guarded archive extraction
- [x] Atomic writes for binaries, `.env` and state files
- [x] Restrictive file modes for credentials
- [x] Real host validation that fails before touching the host

### Monitoring

- [x] Host metrics collection on the agent (CPU percent, core count, load
      average; memory total/used/available) via
      `apps/agent/internal/metrics/collector.go`
- [x] Protocol message `metrics.host` (`packages/protocol`) with Linux and
      Windows fixtures — agent pushes host samples on a fixed interval

---

## In progress

- [ ] **`docksight status`** — currently a placeholder printing a fixed string;
      should report real service health
- [ ] **Agent service commands** — `start`, `stop`, `restart`, `status`, `logs`,
      `config` are declared but return "not implemented yet". The underlying
      `systemd` package already supports all of them
- [ ] **`docksight agent uninstall`** — clean removal of binary, config, unit,
      with an explicit choice about identity
- [x] **CI release workflow** — a GitHub Actions job on tag push running build
      and publish, removing the manual-upload failure mode
- [ ] **Optional CLI installation on agent hosts** — so `docksight agent update`
      works without keeping the downloaded binary

---

## Planned

### Monitoring

Host CPU and memory are shipped (see **Completed → Monitoring**). What remains:

- Per-container CPU and memory ([#24](https://github.com/Open-Source-Kigali/docksight/issues/24))
- Host disk usage and I/O (not collected today)
- Host and per-container network throughput
- Historical retention and time-series storage
- Alert thresholds

### Containers

- `exec` into a running container
- Interactive terminal in the dashboard
- Image management — list, pull, remove, prune
- Network management — list, inspect, connect
- Volume management — list, inspect, prune
- Container creation and editing from the dashboard
- Docker Compose stack awareness

### Agent

- Automatic self-update on a schedule or platform instruction
- Self-reported health beyond heartbeat
- Plugin system for custom collectors
- Resource limits for the agent process
- `docksight agent uninstall`, `status` and `logs` — still placeholders on both
  platforms

### Platform

- **Authentication for agents** — token issuance and verification. The single
  most important item on this list; see
  [Security](security.md#current-limitations)
- **Unattended restart on Windows** — the platform installs there, but its
  engine is Docker Desktop's and starts in a user session, so a reboot leaves
  it down until somebody signs in. Fixing it means owning a WSL2 distribution
  with its own Docker Engine rather than depending on Docker Desktop
- User authentication and sessions
- Organizations and multi-tenancy
- Role-based access control
- Notifications — email, webhooks
- Audit logs for every command sent to a host
- Host grouping, tagging and environments
- Backup and restore for platform state

### Kubernetes

Explicitly out of scope for the core product today. If demand justifies it, the
agent model extends naturally:

- Cluster connections
- Node inspection
- Pod listing and logs
- Deployment inspection

### Integrations

- Prometheus — expose metrics in the standard exposition format
- Grafana — dashboards for DockSight-collected data
- Loki — ship container logs
- OpenTelemetry — traces and metrics export
- Slack — alerts and notifications
- Discord — alerts and notifications

---

## Design commitments

Some things will not change, and knowing that helps you plan around them:

1. **Agents will always connect outbound.** Every feature must work for a host
   behind NAT with no inbound ports.
2. **The message envelope is stable.** New capability arrives as new `type`
   values, not a new wire format.
3. **The three artifacts stay independent.** No feature will require lockstep
   upgrades of CLI, platform and agent.
4. **Installers stay idempotent.** Re-running any install command remains safe.
5. **Docker remains the focus.** Kubernetes support, if it ever lands, will be
   additive rather than a rewrite.

---

## Influencing the roadmap

Open an issue describing the problem you have, not only the feature you want —
the problem often has a cheaper solution than the proposed feature. See
[Contributing](contributing.md).
