# Development

How to build, test and extend DockSight.

---

## Prerequisites

| Tool | Version | Needed for |
| --- | --- | --- |
| Node.js | 20+ | Dashboard and server |
| npm | 10+ | Workspaces |
| Go | 1.22+ | CLI and agent |
| Docker | 24+ | Local infrastructure |
| Docker Compose | v2 | Local infrastructure |
| `gh` | any | Publishing releases |

---

## Repository structure

```text
docksight/
├── apps/
│   ├── web/                     React + TypeScript dashboard (Vite)
│   ├── server/                  NestJS modular monolith
│   │   └── src/
│   │       ├── agents/          WebSocket gateway, agent registry
│   │       ├── containers/      Container operations
│   │       ├── hosts/           Host records
│   │       ├── logs/            Log streaming
│   │       ├── metrics/         Metrics (scaffolded)
│   │       ├── auth/ users/     Authentication (scaffolded)
│   │       ├── audit/           Audit trail (scaffolded)
│   │       └── common/          Prisma, Redis, WebSocket, health
│   ├── agent/                   Go agent — separate Go module
│   │   ├── cmd/agent/           main
│   │   └── internal/
│   │       ├── communication/   WebSocket client, protocol handling
│   │       ├── docker/          Engine SDK access
│   │       ├── identity/        Durable UUID
│   │       ├── config/          YAML config
│   │       ├── logs/            Log streaming
│   │       └── lifecycle/       Startup and shutdown
│   └── cli/                     Go CLI — separate Go module
│       └── cmd/
│           ├── install.go update.go version.go
│           ├── agent*.go        Agent command group
│           └── internal/
│               ├── installer/   Platform orchestration
│               ├── agent/install/ Agent orchestration
│               ├── release/     GitHub releases, assets, download, extract
│               ├── compose/     Docker Compose driver
│               ├── systemd/     Unit management
│               ├── selfinstall/ Atomic binary replacement
│               ├── system/      Host validation
│               ├── state/       Install records
│               ├── env/         .env generation
│               ├── filesystem/  Directories, copying, temp workspaces
│               ├── progress/    Reporter interface
│               └── ui/          Terminal output
├── packages/                    Shared TypeScript: protocol, types, config, utils
├── bundle/                      Platform bundle sources
├── scripts/                     build-release.sh, publish-release.sh
└── docs/                        This documentation
```

`apps/agent` and `apps/cli` are **separate Go modules**, not part of the npm
workspace. Build them from their own directories.

---

## Local development

### Infrastructure

```bash
npm install
npm run docker:infra     # PostgreSQL + Redis
npm run db:generate      # Prisma client
npm run db:migrate       # Apply migrations
```

### Server and dashboard

```bash
npm run dev:server       # NestJS, watch mode
npm run dev:web          # Vite dev server
```

Swagger is served at `http://localhost:3000/api/docs` once the server is up.

### Agent against a local platform

```bash
cd apps/agent
go run ./cmd/agent --config config.yaml
```

```yaml title="apps/agent/config.yaml"
agent:
  data_dir: ./data
  identity_file: ./data/identity.json
server:
  url: ws://127.0.0.1:3000/agents
docker:
  socket: ""      # empty uses the platform default
logging:
  level: debug
```

!!! tip "Use a scratch identity when developing"
    Point `identity_file` at a throwaway path. Reusing a production identity
    from a dev machine makes the platform believe your laptop is that server.

### CLI

```bash
cd apps/cli
go run . version
go run . agent install --url http://localhost:2002    # fails at validation on non-Linux
go build -o /tmp/docksight .
```

---

## Building

=== "Everything for a release"

    ```bash
    scripts/build-release.sh v0.0.1
    ```

=== "CLI only"

    ```bash
    cd apps/cli
    MODULE="github.com/Open-Source-Kigali/docksight/apps/cli"
    COMMIT="$(git rev-parse --short HEAD)"
    BUILD_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    go build -ldflags "-s -w \
      -X $MODULE/cmd/internal/buildinfo.Version=v0.0.1 \
      -X $MODULE/cmd/internal/buildinfo.Commit=$COMMIT \
      -X $MODULE/cmd/internal/buildinfo.BuildDate=$BUILD_DATE" \
      -o docksight .
    ```

=== "Agent only"

    ```bash
    cd apps/agent
    GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o docksight-agent ./cmd/agent
    ```

=== "TypeScript"

    ```bash
    npm run build
    ```

`CGO_ENABLED=0` produces static binaries with no glibc dependency, so one build
runs on Alpine and Ubuntu alike.

---

## Testing

```bash
cd apps/cli
go test ./...              # everything, including live GitHub checks
go test -short ./...       # hermetic — no network
go vet ./...
gofmt -l .

cd apps/agent
go test ./...

npm run lint
```

`-short` skips tests that reach the real GitHub API. CI should use it.

### Testing conventions

The CLI test suite is built on three ideas worth following when adding code:

**Fakes at the boundary, real logic inside.** `installer.Stack` and
`install.UnitController` are interfaces precisely so installation can be tested
without Docker or systemd. A test wires a fake stack, a stub GitHub served by
`httptest`, and a temporary filesystem, then asserts the real orchestration.

**Assert behaviour, not implementation.** Tests state properties: `.env` is not
regenerated on reinstall; identity survives an upgrade; the CLI is never
installed into the platform directory; a crash-looping service is reported as a
failure.

**Cover the failure paths.** Half the value is in tests for archives that try to
escape their destination, releases missing an asset, services that exit 3, and
malformed configuration.

```go title="Example: a fake stack"
type fakeStack struct {
    started   int
    restarted int
    services  []compose.Service
}

func (f *fakeStack) Start(ctx context.Context, progress io.Writer) error {
    f.started++
    return nil
}
```

---

## Coding conventions

### Go

- `gofmt` is not optional. `gofmt -l .` must be empty.
- Errors are values: wrap with `%w`, and make messages say what to do next
  (`"docker is not installed"`, not `"check failed"`).
- Internal packages **never import `ui`**. They report through the
  `progress.Reporter` interface; only the `cmd` layer prints.
- Internal packages return errors; the `cmd` layer decides how to display them.
- Prefer explicit parameters over reaching for global configuration inside a
  helper.
- Name things after their domain: `PlatformBundle()`, not `GetAsset2()`.

The reporter rule is the one people trip over. It exists so the installers can
be reused — by tests, by a future daemon, by a different front end — without
dragging terminal formatting along:

```go
// internal package
func (i *Installer) InstallCLI(ctx context.Context) error {
    i.Report.Step("Installing the CLI into " + i.Config.BinaryPath)
    // ...
}

// cmd layer
type consoleReporter struct{}
func (consoleReporter) Step(message string) { ui.Info(message) }
```

### TypeScript

- Domain modules under `apps/server/src/<domain>/`, shared infrastructure under
  `common/`.
- Protocol types belong in `packages/protocol` so both sides share one
  definition.
- React Query for server state, Zustand for UI state.

### Cross-platform care

The CLI is developed on Windows and macOS but runs on Linux. Two rules:

- Use `path` (not `path/filepath`) for paths written **into** Linux config files
  — `filepath.Join` on Windows emits backslashes that the agent would then read.
- Do not rely on `filepath.IsAbs` to validate archive entries: tar paths always
  use `/`, which is not absolute on Windows, so a traversal guard built on it
  passes on one platform and fails on another.

---

## Adding a protocol message

1. Update [`docs/protocol.md`](protocol.md) — it is the source of truth.
2. Add the type to `packages/protocol`.
3. Implement the platform handler in `apps/server/src/agents/`.
4. Implement the agent handler in `apps/agent/internal/communication/`.
5. Keep the `{ type, payload }` envelope unchanged.
6. If the agent's log wording changes, check
   `apps/cli/cmd/internal/agent/install/verify.go` — installation verification
   matches those strings.

Steps 1 and 2 belong in the *same commit* as the implementation. A spec that
lags the code is worse than no spec.

---

## Adding a CLI command

1. Create `apps/cli/cmd/<name>.go` with a `cobra.Command`.
2. Register it in `init()` on `rootCmd`, or on `agentCMD` for agent commands.
3. Put logic in an internal package; keep the command thin.
4. Report progress through `consoleReporter{}`.
5. Add tests against the internal package, not the command.

---

## Debugging

=== "Agent"

    ```bash
    journalctl -u docksight-agent -f
    sudo /usr/local/bin/docksight-agent --config /etc/docksight-agent/config.yaml
    ```

    Set `logging.level: debug` for heartbeat and message traces.

=== "Platform"

    ```bash
    cd /opt/docksight
    docker compose -f dockersight-installation.yml logs -f server
    docker compose -f dockersight-installation.yml ps
    ```

=== "Protocol"

    ```bash
    websocat ws://localhost:2002/agents
    ```

    Then paste a registration frame:

    ```json
    {"type":"agent.register","payload":{"uuid":"test-uuid","hostname":"dev","os":"linux","architecture":"amd64","version":"0.1.0"}}
    ```

---

## Documentation

The site is MkDocs Material. Sources live in `docs/`, configuration in
`mkdocs.yml`, and the built output in `site/` (git-ignored).

=== "Docker — nothing to install"

    ```bash
    # Live preview on http://localhost:8000
    docker run --rm -it -p 8000:8000 -v "${PWD}:/docs" \
      squidfunk/mkdocs-material serve -a 0.0.0.0:8000

    # Build the static site into ./site
    docker run --rm -v "${PWD}:/docs" squidfunk/mkdocs-material build
    ```

    `-a 0.0.0.0:8000` is required: the default binds to localhost *inside* the
    container, which the port mapping cannot reach.

    !!! warning "Git Bash on Windows rewrites the container path"
        MSYS converts any argument that looks like a Unix path, so `/docs`
        reaches Docker as `C:/Program Files/Git/docs` and the build fails with
        `Config file 'mkdocs.yml' does not exist.` Disable the conversion:

        ```bash
        MSYS_NO_PATHCONV=1 docker run --rm -v "${PWD}:/docs" \
          squidfunk/mkdocs-material build
        ```

        PowerShell and cmd.exe are unaffected — use `${PWD}` and `%cd%`
        respectively.

=== "Python — local toolchain"

    ```bash
    pip install -r requirements-docs.txt
    mkdocs serve
    mkdocs build
    ```

    MkDocs is a Python program, so this route needs Python 3.9+. Nothing else
    in DockSight depends on it.

Before opening a documentation pull request, build in strict mode — it turns
broken internal links into errors:

```bash
mkdocs build --strict
# or
docker run --rm -v "${PWD}:/docs" squidfunk/mkdocs-material build --strict
```

!!! note "Diagrams need network access in the browser"
    Material loads Mermaid from `unpkg.com` at runtime rather than bundling it.
    Diagrams therefore render for readers with internet access. A fully offline
    deployment would need the library vendored locally.

---

## Releasing

See [Release process](release-process.md).

---

## Related

- [Contributing](contributing.md) — workflow, commits, pull requests
- [Architecture](architecture.md) — why the code is shaped this way
