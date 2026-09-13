# DockSight

Open-source Docker management and observability platform.

DockSight helps developers and teams visually manage Docker hosts, monitor
containers, inspect logs, and connect multiple hosts through lightweight Go
agents.

## What works today

- Authentication, first-run admin setup, and role-based access
- Host registration and status via connected agents
- Container inventory, plus start / stop / restart from the dashboard
- Container inspect (ports, mounts, networks, env, entrypoint)
- Live container log streaming over SSE
- Host CPU and memory metrics, pushed by the agent every 10 seconds

Still placeholder data in the UI (marked with a **Mock** badge): per-container
metric time series, and the images / networks / volumes inventory. Both need
new agent protocol messages.

## Architecture overview

DockSight is a monorepo with a modular-monolith backend:

| Path                | Role                                                       |
| ------------------- | ---------------------------------------------------------- |
| `apps/web`          | React + Vite dashboard                                     |
| `apps/server`       | NestJS API (Prisma, Redis, WebSockets, Swagger)            |
| `apps/agent`        | Go Docker host agent (discovery, lifecycle, logs, metrics) |
| `apps/cli`          | Go CLI that installs and manages a self-hosted deployment  |
| `packages/protocol` | Shared agent ↔ server WebSocket contracts                  |
| `infrastructure/`   | Compose files and installer assets                         |
| `docs/`             | Architecture, protocol, ADRs (MkDocs site)                 |

```
Web (React) ──HTTP/SSE──► Server (NestJS modular monolith)
                              │
                    PostgreSQL + Redis
                              │
                    Go agents ◄──WebSocket──► /agents
                              │
                         Docker Engine
```

See [docs/architecture.md](docs/architecture.md) for details.

## Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Query, Zustand, Lucide
- **Backend:** NestJS, TypeScript, Prisma, PostgreSQL, Redis, WebSockets, Swagger
- **Agent:** Go (Docker Engine API + WebSocket registration/discovery/metrics)
- **Infra:** Docker Compose

## Prerequisites

- Node.js 20+
- npm 10+
- Docker and Docker Compose
- Go 1.25+ (only needed for agent work; the CLI needs Go 1.26+)

## Development environment

The development Compose stack runs **infrastructure only** (PostgreSQL +
Redis). The frontend, backend, and Go agent run on your host machine.

### 1. Create env files

```bash
npm run setup
```

Copies every `.env.example` to `.env` (root, server, web, agent) without
overwriting files you already have.

### 2. Start infrastructure

```bash
npm run docker:infra
```

Equivalent to:

```bash
docker compose -f infrastructure/configs/docker-compose.yml up -d
```

This starts:

- PostgreSQL on `localhost:5432` (container `docksight-postgres-dev`)
- Redis on `localhost:6379` (container `docksight-redis-dev`)

Both join the `docksight-network` network and use the named volumes
`postgres-data` and `redis-data`. Ports come from `POSTGRES_PORT` and
`REDIS_PORT` in the root `.env`.

### 3. Verify

```bash
docker ps
```

You should see `docksight-postgres-dev` and `docksight-redis-dev` (healthy).

### 4. Stop

```bash
npm run docker:down
```

Containers stop; volumes are kept. To also delete `postgres-data` and
`redis-data` (all local DB/cache data):

```bash
docker compose -f infrastructure/configs/docker-compose.yml down -v
```

### Run the apps

```bash
npm install
npm run db:generate
npm run db:migrate
npm run dev:server
npm run dev:web
```

## Running the full loop

```bash
# Terminal A — infrastructure
npm run docker:infra

# Terminal B — backend
npm run dev:server

# Terminal C — agent
cd apps/agent
go run ./cmd/agent

# Terminal D — web
npm run dev:web
```

Expected:

1. Agent connects to `ws://localhost:3000/agents`
2. Agent registers (`agent.register` → `agent.registered`)
3. Server sends `container.list`; agent replies with `container.listed`
4. Agent pushes `metrics.host` (CPU + memory) every 10s
5. Heartbeats continue every 30s
6. Dashboard Start/Stop/Restart sends REST → WS command → `container.result`
7. Log viewer subscribes over SSE → `logs.subscribe` → `logs.chunk`

Protocol reference: [docs/protocol.md](docs/protocol.md)

- Web: http://localhost:5173
- API / Swagger: http://localhost:3000/api/docs
- Agent WS: `ws://localhost:3000/agents`

## Useful commands

| Command                              | Description                                      |
| ------------------------------------ | ------------------------------------------------ |
| `npm run setup`                      | Create `.env` files from the examples            |
| `npm run dev:web`                    | Start Vite dashboard                             |
| `npm run dev:server`                 | Start NestJS in watch mode                       |
| `npm run build`                      | Build all workspaces                             |
| `npm run lint`                       | Lint all workspaces                              |
| `npm run test`                       | Run workspace tests (incl. protocol conformance) |
| `npm run test:go`                    | Run go tests inside agent directory(apps/agents) |
| `npm run test:all`                   | Run all the projects test                        |
| `npm run docker:infra` / `docker:up` | Start Postgres + Redis                           |
| `npm run docker:down`                | Stop the infrastructure stack                    |
| `npm run docker:logs`                | Follow infrastructure logs                       |
| `npm run db:generate`                | Generate Prisma client                           |
| `npm run db:migrate`                 | Run Prisma migrations                            |
| `npm run db:studio`                  | Open Prisma Studio                               |

Agent (requires Go):

```bash
cd apps/agent
go run ./cmd/agent          # run against a local server
go test ./...               # unit + protocol conformance tests
go build ./cmd/agent        # build a binary
```

## Testing and CI

GitHub Actions runs two path-filtered workflows:

- **`.github/workflows/agent.yml`** — `go mod tidy` drift check, vet, build,
  tests, and cross-compilation for linux/amd64, linux/arm64, windows/amd64,
  and darwin/arm64.
- **`.github/workflows/node.yml`** — builds `@docksight/protocol`, runs the
  protocol conformance check, generates the Prisma client, then builds, lints,
  and tests the server and web apps.

### Protocol conformance

The Go agent cannot import `@docksight/protocol`, so its payload structs are
hand-mirrored from the TypeScript types. The shared fixtures in
[`packages/protocol/fixtures/`](packages/protocol/fixtures/) keep the two
honest — the Go test decodes and re-encodes each fixture and requires an exact
match, while `npm run test --workspace=@docksight/protocol` type-checks the
same fixtures against the TypeScript types.

**When you change a protocol message, update its fixture in the same commit.**
Both CI workflows fail if the fixtures go missing or drift.

## Repository structure

```
docksight/
├── apps/
│   ├── web/                 # React dashboard
│   ├── server/              # NestJS backend
│   ├── agent/               # Go host agent
│   └── cli/                 # Go CLI for self-hosted installs
├── packages/
│   └── protocol/            # Shared WebSocket contracts + fixtures
├── infrastructure/
│   ├── configs/             # docker-compose.yml (dev infra)
│   │                        # docker-compose-local.yml (full stack)
│   └── installer/           # Self-host installer assets
├── docs/                    # MkDocs site (architecture, protocol, ADRs)
├── scripts/                 # Repo tooling (setup.mjs)
├── .github/workflows/       # CI
├── README.md
├── LICENSE
└── CONTRIBUTING.md
```

## Self-hosting

`infrastructure/configs/docker-compose-local.yml` runs the whole platform
(PostgreSQL, Redis, server, web, nginx) behind a single port — `2002` by
default, via `DOCKSIGHT_PORT`. The `apps/cli` binary wraps this with
`install`, `start`, `stop`, `status`, `update`, `logs`, and `uninstall`
commands. See [docs/installation.md](docs/installation.md) and
[docs/cli.md](docs/cli.md).

## Roadmap

1. ~~Authentication and user management~~ — done
2. ~~Docker host connection and container inventory~~ — done
3. ~~Live logs and host metrics~~ — done
4. Per-container metrics (`container.stats` protocol message)
5. Images, networks, and volumes inventory
6. Environment grouping and notifications
7. Audit trail and team collaboration features

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
