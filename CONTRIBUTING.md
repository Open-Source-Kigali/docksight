# Contributing to DockSight

Thanks for your interest in DockSight.

## Ground rules

- Keep changes focused and well-scoped.
- Prefer the existing modular monolith boundaries in `apps/server`.
- Do not introduce Kubernetes abstractions or microservice splits without an ADR.
- Discuss larger architectural changes in an issue or ADR under `docs/decisions/`.

## Development workflow

1. Fork and clone the repository.
2. Copy `.env.example` files and install dependencies (`npm install`).
3. Start local infra: `npm run docker:infra`.
4. Run `npm run dev:server` and `npm run dev:web`.
5. Create a branch for your change.
6. Open a pull request with a clear summary and test notes.

### Formatting and Linting

The TypeScript/JavaScript codebases use Prettier for consistent styling. Before opening a pull request, ensure your code is formatted correctly.

You can format specific workspaces using the following commands:

```bash
# Format the web app
npm run format --workspace=@docksight/web

# Format the server
npm run format --workspace=@docksight/server

# Format the protocol package
npm run format --workspace=@docksight/protocol
```

### Pull request target

Open PRs against **`develop`**, not `main`. `main` tracks releases;
day-to-day work lands on `develop` first.

## Go modules (CLI and agent)

The repo has **two separate Go modules**. You must `cd` into the module
before running `go` commands — there is no root Go workspace.

| Module | Path         | `go` version                               |
| ------ | ------------ | ------------------------------------------ |
| CLI    | `apps/cli`   | see `apps/cli/go.mod` (currently 1.26.5)   |
| Agent  | `apps/agent` | see `apps/agent/go.mod` (currently 1.25.0) |

### Install Go

Install a Go toolchain that satisfies the module you are changing (the
`go` directive in that module's `go.mod`). <https://go.dev/dl/>

### Build and test

```bash
# CLI
cd apps/cli
go build -o docksight .
go test ./...

# Agent
cd apps/agent
go build -o docksight-agent .
go test ./...
```

More CLI layout notes (including the `internal/` ↔ `ui` rule) live in
[`apps/cli/README.md`](apps/cli/README.md). User-facing command docs:
[`docs/cli.md`](docs/cli.md).

### Platform limits

CLI features that drive **systemd** or the **Docker socket** only work on
Linux (and typically need root). Use a Linux VM or cloud VPS when exercising
`docksight install`, `docksight agent install`, or agent service commands.

## Project conventions

- **Frontend:** feature folders under `apps/web/src/features`, shared UI under `components`.
- **Backend:** one NestJS module per domain under `apps/server/src/<domain>`.
- **Agent:** keep Docker and communication logic inside `agent/internal`.
- **Docs:** update architecture docs when boundaries change.

## Commit style

Use concise commit messages that explain why the change exists.

Examples:

- `add NestJS health module foundation`
- `configure Vite path aliases for shadcn`

## Code of conduct

Be respectful and constructive. Harassment or discrimination is not tolerated.
