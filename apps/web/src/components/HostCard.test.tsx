/** @vitest-environment jsdom */

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { HostCard } from '@/components/HostCard'
import type { Host } from '@/types/api'

afterEach(() => {
  cleanup()
})

function makeHost(overrides: Partial<Host> = {}): Host {
  return {
    id: 'host-1',
    uuid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    hostname: 'old-box',
    os: 'linux',
    architecture: 'amd64',
    version: '27.0.0',
    status: 'OFFLINE',
    lastSeen: '2026-01-01T00:00:00Z',
    canDelete: true,
    metrics: {
      hostId: 'host-1',
      cpu: null,
      memory: null,
      collectedAt: null,
    },
    ...overrides,
  }
}

function renderCard(
  overrides: {
    host?: Host
    canManage?: boolean
    onDelete?: (host: Host) => Promise<void> | void
  } = {},
) {
  const onDelete = overrides.onDelete ?? vi.fn()
  render(
    <MemoryRouter>
      <HostCard
        host={overrides.host ?? makeHost()}
        canManage={overrides.canManage ?? true}
        onDelete={onDelete}
      />
    </MemoryRouter>,
  )
  return { onDelete }
}

async function openActions() {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Actions for old-box' }))
  return user
}

describe('HostCard delete action', () => {
  it('shows delete for an admin when the host is eligible', async () => {
    renderCard()
    await openActions()
    expect(
      screen.getByRole('menuitem', { name: 'Delete host' }),
    ).toBeTruthy()
  })

  it('hides delete for an ineligible host', async () => {
    renderCard({ host: makeHost({ canDelete: false, status: 'ONLINE' }) })
    await openActions()
    expect(screen.queryByRole('menuitem', { name: 'Delete host' })).toBeNull()
  })

  it('hides delete for a viewer', async () => {
    renderCard({ canManage: false })
    await openActions()
    expect(screen.queryByRole('menuitem', { name: 'Delete host' })).toBeNull()
  })

  it('does not delete when confirmation is cancelled', async () => {
    const { onDelete } = renderCard()
    const user = await openActions()
    await user.click(screen.getByRole('menuitem', { name: 'Delete host' }))
    expect(screen.getByRole('alertdialog')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('deletes after explicit confirmation', async () => {
    const { onDelete } = renderCard()
    const user = await openActions()
    await user.click(screen.getByRole('menuitem', { name: 'Delete host' }))
    await user.click(screen.getByRole('button', { name: 'Delete host' }))
    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'host-1', hostname: 'old-box' }),
    )
  })
})
