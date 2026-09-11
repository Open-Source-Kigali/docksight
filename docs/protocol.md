# DockSight Agent Protocol

This document is the **source of truth** for every WebSocket message exchanged between the DockSight Server and DockSight Agents.

All future agent features (logs, metrics, container actions, events, etc.) MUST use the same envelope and conventions defined here. Implementations in `apps/server` and `agent/` should follow this spec; when they diverge, update this document in the same change.

| Item | Value |
| --- | --- |
| Transport | Native WebSocket (JSON text frames) |
| Endpoint | `ws://<host>:<port>/agents` |
| Encoding | UTF-8 JSON |
| Spec status | v0.1 (PI-007 baseline + reserved extensions) |

---

## 1. Design goals

1. **One envelope for everything** — every message uses the same wrapper.
2. **Namespaced types** — `domain.action` (e.g. `agent.register`, `container.start`).
3. **Explicit direction** — each type is Agent→Server, Server→Agent, or bidirectional.
4. **Forward compatible** — unknown fields in `payload` SHOULD be ignored by receivers.
5. **Stable identity** — agents are identified by a durable `uuid` (persisted on disk).

---

## 2. Message envelope

Every message MUST be a JSON object with exactly these top-level keys (additional top-level keys are reserved and SHOULD NOT be used yet):

```json
{
  "type": "domain.action",
  "payload": { }
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | `string` | yes | Message type using `domain.action` naming |
| `payload` | `object` | yes | Type-specific body; use `{}` if empty |

### Rules

- `type` is case-sensitive and lowercase.
- `payload` MUST be a JSON object (not an array, string, or null).
- Receivers MUST ignore unknown `payload` properties.
- Receivers MUST ignore (and MAY log) unknown `type` values without closing the connection, unless documented otherwise.
- Binary WebSocket frames are not used in v0.1.

### Optional envelope extensions (reserved)

These fields are **reserved** for a future protocol revision. Do not send them until this document marks them as active:

| Field | Type | Purpose |
| --- | --- | --- |
| `id` | `string` | Correlation / request id |
| `replyTo` | `string` | Response correlation |
| `ts` | `string` (ISO-8601) | Sender timestamp |
| `v` | `number` | Protocol version |

---

## 3. Naming conventions

### Type format

```
<domain>.<action>
```

Examples: `agent.register`, `agent.heartbeat`, `container.start`, `logs.stream`.

### Domains

| Domain | Owner | Purpose |
| --- | --- | --- |
| `agent` | Agent + Server | Identity, session, liveness |
| `container` | Server → Agent (commands), Agent → Server (results/events) | Container lifecycle actions |
| `logs` | Agent → Server (stream), Server → Agent (subscribe/control) | Container / agent logs |
| `metrics` | Agent → Server | Resource and container metrics |
| `event` | Agent → Server | Host / Docker lifecycle events |
| `error` | Either | Protocol or command errors |
| `system` | Either | Reserved for protocol control (ping beyond heartbeat, etc.) |

### Action verbs

Prefer these verbs for consistency:

| Verb | Meaning |
| --- | --- |
| `register` / `registered` | Request / success acknowledgement |
| `heartbeat` | Liveness signal |
| `list` / `listed` | Query / result |
| `get` / `got` | Fetch one / result |
| `start` / `stop` / `restart` / `remove` | Commands |
| `subscribe` / `unsubscribe` | Stream control |
| `chunk` / `frame` | Streamed data |
| `result` | Command outcome |
| `error` | Failure |

Request/response pairs SHOULD use related names: `container.start` → `container.result` (include `action` + `requestId` in the result payload).

---

## 4. Connection lifecycle

```
Agent                                 Server
  |                                      |
  |----------- WebSocket open ---------->|
  |                                      |
  |------ agent.register --------------->|
  |<----- agent.registered --------------|
  |                                      |
  |------ agent.heartbeat -------------->|  (every 30s)
  |      ...                             |
  |----------- disconnect / reconnect ---|
```

### Rules

1. After the WebSocket opens, the agent MUST send `agent.register` before other domain messages.
2. The server SHOULD reject or ignore non-registration messages until registration succeeds (v0.1: only register + heartbeat are implemented).
3. Heartbeats MUST be sent every **30 seconds** while connected.
4. On disconnect, the agent MUST reconnect and re-register. The current client retries with exponential backoff, a 30-second cap, and jitter, so the wait before each attempt is variable.
5. On disconnect, the server MAY mark the agent `OFFLINE`.

---

## 5. Implemented messages (v0.1)

### 5.1 `agent.register`

- **Direction:** Agent → Server  
- **When:** Immediately after connect (and after each reconnect)  
- **Purpose:** Create or update the agent record by `uuid`

```json
{
  "type": "agent.register",
  "payload": {
    "uuid": "bc2bc07d-e456-4979-9f11-3293965d7436",
    "hostname": "DESKTOP-9JDKFHI",
    "os": "windows",
    "architecture": "amd64",
    "version": "0.1.0"
  }
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `uuid` | `string` | yes | Durable agent identity (UUID) |
| `hostname` | `string` | yes | Host name |
| `os` | `string` | yes | OS identifier (e.g. `linux`, `windows`, `darwin`) |
| `architecture` | `string` | yes | CPU arch (e.g. `amd64`, `arm64`) |
| `version` | `string` | yes | Agent software version |

**Server behavior:** Upsert by `uuid`, set `status=ONLINE`, update `lastSeen`.

---

### 5.2 `agent.registered`

- **Direction:** Server → Agent  
- **When:** Response to `agent.register`  
- **Purpose:** Confirm registration

```json
{
  "type": "agent.registered",
  "payload": {
    "id": "cmry2k5gk0000esv7rx4mhkwb",
    "uuid": "bc2bc07d-e456-4979-9f11-3293965d7436",
    "status": "ONLINE",
    "message": "Registration successful"
  }
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | yes* | Server-side agent id (cuid); empty on failure |
| `uuid` | `string` | yes | Echo of agent uuid |
| `status` | `string` | yes | e.g. `ONLINE`, `UNKNOWN` |
| `message` | `string` | yes | Human-readable result |

\* On validation failure, `id` may be an empty string and `message` describes the error.

---

### 5.3 `agent.heartbeat`

- **Direction:** Agent → Server  
- **When:** Every 30 seconds after successful registration  
- **Purpose:** Keep `lastSeen` fresh and status `ONLINE`

```json
{
  "type": "agent.heartbeat",
  "payload": {
    "uuid": "bc2bc07d-e456-4979-9f11-3293965d7436"
  }
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `uuid` | `string` | yes | Agent identity |

**Server behavior:** If the agent exists, update `lastSeen` and `status=ONLINE`. Unknown uuids MAY be logged and ignored.

**Note:** v0.1 does not define `agent.heartbeat.ack`. Silence from the server is normal; connection health is observed via the WebSocket itself.

---

### 5.4 `container.list`

- **Direction:** Server → Agent  
- **When:** After successful registration (and whenever the server requests discovery)  
- **Purpose:** Ask the agent to query Docker Engine for containers (read-only)

```json
{
  "type": "container.list",
  "payload": {}
}
```

---

### 5.5 `container.listed`

- **Direction:** Agent → Server  
- **When:** Response to `container.list`  
- **Purpose:** Return discovered containers (cached in-memory for the dashboard)

```json
{
  "type": "container.listed",
  "payload": {
    "containers": [
      {
        "id": "abc123...",
        "name": "docksight-postgres",
        "image": "postgres:17-alpine",
        "status": "Up 2 hours (healthy)",
        "state": "running"
      }
    ]
  }
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `containers` | `array` | yes | Container summaries |
| `containers[].id` | `string` | yes | Docker container id |
| `containers[].name` | `string` | yes | Container name |
| `containers[].image` | `string` | yes | Image reference |
| `containers[].status` | `string` | yes | Human status string from Docker |
| `containers[].state` | `string` | yes | State (e.g. `running`, `exited`) |

---

### 5.6 `container.inspect`

- **Direction:** Server to Agent
- **When:** API caller requests details for one container
- **Purpose:** Ask the agent to query Docker Engine inspect data for a container
- **Correlation:** Every command includes `requestId`; the agent must echo it on `container.inspected`

```json
{
  "type": "container.inspect",
  "payload": {
    "requestId": "3f1c9a2e-8b44-4d1a-9c2e-1a2b3c4d5e6f",
    "containerId": "abc123def456..."
  }
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `requestId` | `string` | yes | Correlation id generated by the server |
| `containerId` | `string` | yes | Docker container id (full or short) |

---

### 5.7 `container.inspected`

- **Direction:** Agent to Server
- **When:** Response to `container.inspect`
- **Purpose:** Return Docker inspect data for a correlated request

```json
{
  "type": "container.inspected",
  "payload": {
    "requestId": "3f1c9a2e-8b44-4d1a-9c2e-1a2b3c4d5e6f",
    "container": {
      "id": "abc123def456...",
      "shortId": "abc123def456",
      "name": "/web",
      "image": "nginx:latest",
      "state": {
        "status": "running",
        "running": true,
        "paused": false,
        "restarting": false
      },
      "created": "2026-07-25T10:00:00Z",
      "startedAt": "2026-07-25T10:01:00Z",
      "ports": [],
      "mounts": [],
      "networks": [],
      "workingDir": "",
      "cmd": ["nginx", "-g", "daemon off;"],
      "restartPolicy": "unless-stopped",
      "entrypoint": ["/docker-entrypoint.sh"]
    },
    "ok": true,
    "error": null
  }
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `requestId` | `string` | yes | Same id as `container.inspect` |
| `container` | `object \| null` | yes | Inspect data, or `null` on failure |
| `ok` | `boolean` | yes | Whether Docker inspect succeeded |
| `error` | `string \| null` | yes | Error detail when `ok` is false |

---

### 5.8 `container.start` / `container.stop` / `container.restart` / `container.pause` / `container.unpause`

- **Direction:** Server → Agent  
- **When:** API caller requests a lifecycle action  
- **Purpose:** Ask the agent to start, stop, restart, pause, or unpause a container  
- **Correlation:** Every command includes `requestId`; the agent must echo it on `container.result`

```json
{
  "type": "container.start",
  "payload": {
    "requestId": "3f1c9a2e-8b44-4d1a-9c2e-1a2b3c4d5e6f",
    "containerId": "abc123def456..."
  }
}
```

Same payload shape for `container.stop`, `container.restart`,
`container.pause` and `container.unpause`.

Docker rejects `container.pause` unless the container is running, and
`container.unpause` unless it is paused. The agent does not pre-check either
one; Docker's own error text is returned on `container.result`.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `requestId` | `string` | yes | Correlation id generated by the server |
| `containerId` | `string` | yes | Docker container id (full or short) |

---

### 5.9 `container.result`

- **Direction:** Agent → Server  
- **When:** After executing start/stop/restart  
- **Purpose:** Report success or failure for a correlated command

```json
{
  "type": "container.result",
  "payload": {
    "requestId": "3f1c9a2e-8b44-4d1a-9c2e-1a2b3c4d5e6f",
    "action": "start",
    "containerId": "abc123def456...",
    "ok": true,
    "message": "start succeeded",
    "error": null
  }
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `requestId` | `string` | yes | Same id as the command |
| `action` | `string` | yes | `start` \| `stop` \| `restart` |
| `containerId` | `string` | yes | Target container id |
| `ok` | `boolean` | yes | Whether Docker accepted the operation |
| `message` | `string` | yes | Short human summary |
| `error` | `string \| null` | yes | Error detail when `ok` is false |

---

### 5.10 `logs.subscribe`

- **Direction:** Server → Agent  
- **When:** A dashboard client opens a container log stream  
- **Purpose:** Stream historical + live container logs (not persisted)

```json
{
  "type": "logs.subscribe",
  "payload": {
    "requestId": "req-123",
    "containerId": "abc123",
    "tail": 100,
    "follow": true
  }
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `requestId` | `string` | yes | Correlation id for chunks / unsubscribe |
| `containerId` | `string` | yes | Docker container id |
| `tail` | `number` | no | Historical lines to send first (default `100`) |
| `follow` | `boolean` | no | Continue live streaming (default `true`) |

---

### 5.11 `logs.chunk`

- **Direction:** Agent → Server  
- **When:** While a subscribe stream is active  
- **Purpose:** Deliver batched log entries

```json
{
  "type": "logs.chunk",
  "payload": {
    "requestId": "req-123",
    "containerId": "abc123",
    "entries": [
      {
        "timestamp": "2026-07-25T10:00:00Z",
        "stream": "stdout",
        "message": "Application started"
      }
    ]
  }
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `requestId` | `string` | yes | Same id as `logs.subscribe` |
| `containerId` | `string` | yes | Container id |
| `entries` | `array` | yes | Batched lines (up to ~50 or ~200ms) |
| `entries[].timestamp` | `string` | yes | RFC3339 / RFC3339Nano |
| `entries[].stream` | `string` | yes | `stdout` or `stderr` |
| `entries[].message` | `string` | yes | Log line body |

---

### 5.12 `logs.unsubscribe`

- **Direction:** Server → Agent  
- **When:** Client closes the log view / SSE disconnects  
- **Purpose:** Stop only that stream and release Docker reader resources

```json
{
  "type": "logs.unsubscribe",
  "payload": {
    "requestId": "req-123"
  }
}
```

---

## 6. Reserved message types (not implemented yet)

These types are reserved so future work does not invent incompatible shapes. Payloads below are **draft contracts** and may gain fields, but type names SHOULD stay stable.

### 6.1 Errors — `error.report`

- **Direction:** Either  
- **Purpose:** Structured error without closing the socket

```json
{
  "type": "error.report",
  "payload": {
    "code": "VALIDATION_ERROR",
    "message": "Missing uuid",
    "retriable": false,
    "relatedType": "agent.register",
    "details": {}
  }
}
```

### 6.2 Containers (extensions — not in this increment)

Beyond list/inspect/lifecycle (`list`, `listed`, `inspect`, `inspected`, `start`, `stop`, `restart`, `result`), these remain reserved:

| Type | Direction | Purpose |
| --- | --- | --- |
| `container.remove` | Server → Agent | Remove container |

### 6.3 Metrics

| Type | Direction | Purpose |
| --- | --- | --- |
| `metrics.subscribe` | Server → Agent | Enable periodic metrics |
| `metrics.unsubscribe` | Server → Agent | Disable metrics |
| `metrics.sample` | Agent → Server | Point-in-time sample |

Draft sample:

```json
{
  "type": "metrics.sample",
  "payload": {
    "uuid": "bc2bc07d-e456-4979-9f11-3293965d7436",
    "collectedAt": "2026-07-23T22:00:00Z",
    "host": {
      "cpuPercent": 12.5,
      "memoryUsedBytes": 8589934592,
      "memoryTotalBytes": 17179869184
    },
    "containers": [
      {
        "containerId": "abc123def456",
        "cpuPercent": 1.2,
        "memoryUsedBytes": 67108864
      }
    ]
  }
}
```

### 6.4 Events

| Type | Direction | Purpose |
| --- | --- | --- |
| `event.docker` | Agent → Server | Docker / host event |

Draft:

```json
{
  "type": "event.docker",
  "payload": {
    "uuid": "bc2bc07d-e456-4979-9f11-3293965d7436",
    "time": "2026-07-23T22:00:00Z",
    "action": "start",
    "containerId": "abc123def456",
    "attributes": {
      "image": "nginx:latest",
      "name": "/web"
    }
  }
}
```

---

## 7. Status values

Agent `status` strings used in registration / DB:

| Value | Meaning |
| --- | --- |
| `ONLINE` | Connected and recently seen |
| `OFFLINE` | Disconnected |
| `UNKNOWN` | Unspecified / error path |

New status values MUST be documented here before use.

---

## 8. Versioning policy

1. This document carries the protocol revision (currently **v0.1**).
2. **Additive** changes (new optional payload fields, new message types) do not require a major bump.
3. **Breaking** changes (renamed/removed fields, changed semantics of existing types) require a major bump and a migration note in this file.
4. When envelope field `v` is activated, agents and server negotiate compatibility using that field.

---

## 9. Implementation map

| Side | Location |
| --- | --- |
| **Shared TS contracts** | `packages/protocol` (`@docksight/protocol`) |
| Human protocol spec | `docs/protocol.md` (this file) |
| Server message types | Prefer `@docksight/protocol` (legacy: `apps/server/src/agents/messages.ts`) |
| Server gateway | `apps/server/src/agents/agents.gateway.ts` |
| Agent client | `agent/internal/communication/client.go` |
| Agent identity | `agent/internal/identity/` |

When adding a message type:

1. Update **this document** and **`packages/protocol`** in the same change.
2. Add types/handlers on server and agent.
3. Keep envelope `{ type, payload }` unchanged.

---

## 10. Non-goals (current)

- Authentication / authorization of agent connections  
- TLS / message encryption  
- Multiplexing multiple logical streams on one socket beyond message `type`  
- Binary payloads  

These may be added later under the reserved envelope extensions and `system.*` / `error.*` domains without replacing the core envelope.
