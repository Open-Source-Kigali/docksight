/**
 * Type-level conformance check for the shared protocol fixtures.
 *
 * This file is never executed and never emitted — `npm test` type-checks it
 * with `--noEmit`. Assigning each fixture to its exported payload type makes a
 * renamed, removed, or retyped TypeScript field a compile error, which is the
 * TypeScript-side counterpart to the Go round-trip test in
 * `apps/agent/internal/communication/conformance_test.go`.
 */
import type { ContainerCommandPayload } from '../src/container'
import { CONTAINER_PAUSE } from '../src/container'
import type { HostMetricsPayload } from '../src/metrics'
import { METRICS_HOST } from '../src/metrics'

import pauseFixture from '../fixtures/container.pause.json'
import linuxFixture from '../fixtures/metrics.host.linux.json'
import windowsFixture from '../fixtures/metrics.host.windows.json'

/**
 * Pin the exported constant to its literal value. The fixtures' own `type`
 * field cannot be checked here — importing JSON widens `"metrics.host"` to
 * `string` — so that side is asserted by the Go test, which compares each
 * fixture's envelope type against its own constant.
 */
const messageType: 'metrics.host' = METRICS_HOST

/**
 * `loadAvg` is a fixed 3-tuple in the type but widens to `number[]` when
 * imported from JSON, so it is asserted separately; every other field is
 * checked structurally by the assignment.
 */
const linuxPayload: HostMetricsPayload = {
  ...linuxFixture.payload,
  cpu: {
    ...linuxFixture.payload.cpu,
    loadAvg: linuxFixture.payload.cpu.loadAvg as [number, number, number],
  },
}

/** The Windows fixture pins the null form of `loadAvg`. */
const windowsPayload: HostMetricsPayload = {
  ...windowsFixture.payload,
  cpu: {
    ...windowsFixture.payload.cpu,
    loadAvg: windowsFixture.payload.cpu.loadAvg as null,
  },
}

/**
 * `container.pause` and `container.unpause` share `ContainerCommandPayload`
 * with start/stop/restart, so this one fixture pins the shape for all five.
 */
const pauseMessageType: 'container.pause' = CONTAINER_PAUSE

const pausePayload: ContainerCommandPayload = pauseFixture.payload

// Reference the bindings so `noUnusedLocals` stays satisfied.
export const checked = {
  messageType,
  linuxPayload,
  windowsPayload,
  pauseMessageType,
  pausePayload,
}
