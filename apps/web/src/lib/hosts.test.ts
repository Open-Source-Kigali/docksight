import { describe, expect, it } from 'vitest'
import { canShowDeleteHost } from '@/lib/hosts'

describe('canShowDeleteHost', () => {
  it('is true only for admins when the server marks the host deletable', () => {
    expect(canShowDeleteHost({ canDelete: true }, true)).toBe(true)
    expect(canShowDeleteHost({ canDelete: true }, false)).toBe(false)
    expect(canShowDeleteHost({ canDelete: false }, true)).toBe(false)
    expect(canShowDeleteHost({}, true)).toBe(false)
  })
})
