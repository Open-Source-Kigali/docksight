# Protocol fixtures

Canonical on-the-wire samples, and the single source of truth for the message
formats shared by the TypeScript server and the Go agent.

The agent cannot import `@docksight/protocol` — it is Go, so its payload structs
in `apps/agent/internal/communication/client.go` are hand-mirrored from the
TypeScript types. Nothing in either compiler checks that the two agree. These
fixtures are what does:

- **Go side** — `apps/agent/internal/communication/conformance_test.go` decodes
  each fixture into its structs, re-encodes it, and requires the result to match
  the fixture exactly. A renamed, dropped, or retyped Go field fails the test.
- **TypeScript side** — `npm run test --workspace=@docksight/protocol`
  type-checks each fixture against the exported payload type. A renamed or
  dropped TypeScript field fails compilation.

**These files are load-bearing: deleting them breaks CI on both sides.**

## Changing a message

Edit the fixture in the same commit as the type change, then run both checks.
If a change is intended to be backwards compatible, add a *new* fixture rather
than editing the existing one, so the old wire format stays covered.

`container.listed.json` carries one container with two port mappings (one
published with a host `ip`, one exposed but unpublished with an empty `public`)
and one container with no ports. It is the only lifecycle message every
dashboard view depends on, so both sides pin its shape.

`loadAvg` has two fixtures on purpose: it is null on Windows, where there is no
load-average equivalent, and populated on Linux. Both forms must decode.
