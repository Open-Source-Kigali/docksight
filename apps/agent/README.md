# DockSight Agent

Lightweight Go agent that runs beside a Docker host, registers with the DockSight backend, and executes Docker read/lifecycle/log operations.

## Current capabilities

- Bootstrap: config, identity, logging, graceful shutdown
- WebSocket registration + 30s heartbeats + reconnect
- Container discovery (`container.list` / `container.listed`)
- Lifecycle via Docker Go SDK (`start` / `stop` / `restart` / `pause` / `unpause` / `remove`)
- Container inspection (`container.inspect` / `container.inspected`)
- Host CPU/memory metrics every 10s (`metrics.host`)
- Log streaming (`logs.subscribe` / `logs.chunk` / `logs.unsubscribe`)
  - Last N lines, then live follow
  - Multiplexed stdout/stderr decoding
  - Batched chunks (≤50 lines or ≤200ms)
  - Multiple concurrent streams keyed by `requestId`

Not implemented yet: per-container metrics, agent authentication.

## Structure

```
apps/agent/
├── cmd/agent/
├── config.yaml
├── data/
└── internal/
    ├── app/
    ├── communication/   # WebSocket client
    ├── config/
    ├── docker/          # Docker Engine SDK wrapper
    ├── identity/
    ├── lifecycle/
    ├── logger/
    ├── logs/            # Log stream service (subscribe/batch/decode)
    ├── metrics/         # Host CPU/memory sampling
    ├── service/         # Windows Service Control Manager integration
    └── version/
```

## Run

After completing the repository's development setup, start the backend from
the repository root:

```bash
npm run docker:infra
npm run dev:server
```

In a separate terminal, also starting from the repository root:

```bash
cd apps/agent
go run ./cmd/agent
```

On Windows the same binary also runs as a Service Control Manager service; it
detects which mode it is in at startup, so the command above is unchanged.
See [Windows support](../../docs/agent.md#windows-support).

## Tests

From the repository root:

```bash
cd apps/agent
go test ./...
```

Protocol reference: [docs/protocol.md](../../docs/protocol.md)
