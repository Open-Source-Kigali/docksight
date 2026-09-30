# DockSight Web

React dashboard for DockSight — open-source Docker management and observability.

## Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- React Query
- React Router
- Lucide React

## Install dependencies

From the monorepo root:

```bash
npm install
```

## Environment

```bash
cp .env.example .env
```

```env
VITE_API_URL=http://localhost:3000/api
```

`VITE_API_URL` is the NestJS API base URL used by the dashboard client.

## Run development server

```bash
npm run dev
```

App: `http://localhost:2002`

## Dashboard feature

Route `/` renders the dashboard:

- **Hosts** — cards for registered agents (`GET /api/hosts`)
- **Containers** — table for the selected host (`GET /api/hosts/:id/containers`)
- **Actions** — Start / Stop / Restart / Logs  
  (`POST /api/containers/:id/start|stop|restart`, SSE `GET /api/containers/:id/logs?hostId=...`)

After a successful action the table refreshes. Toasts report success or failure. **Logs** opens a live panel (historical tail + follow); closing it unsubscribes the stream.

No authentication, remove, logs, or metrics in this increment.

### Local stack + lifecycle test

```bash
# Terminal A — Postgres + Redis
docker compose up -d

# Terminal B — API
npm run dev:server

# Terminal C — Agent (required for actions)
cd agent && go run ./cmd/agent

# Terminal D — Web
npm run dev:web
```

1. Open http://localhost:2002
2. Select the connected host
3. Use **Start**, **Stop**, or **Restart** on a container
4. Confirm the toast and updated status

## Project structure

```
src/
├── app/                 # App shell, providers, routing
├── components/          # Shared UI (StatusBadge, HostCard, ContainerTable, toasts)
├── features/dashboard/  # Dashboard page
├── hooks/               # useHosts, useContainers, useContainerAction
├── services/            # API client + hosts service
├── types/               # Frontend API types
└── lib/                 # Shared utilities (e.g. cn)
```
