import { describe, expect, it } from 'vitest';
import {
  HOST_DISPLAY_NAME_MAX_LENGTH,
  hostDisplayName,
  hostInventoryLabel,
  validateHostDisplayName,
} from './host-name';

describe('hostDisplayName', () => {
  it('falls back to hostname when displayName is missing', () => {
    expect(hostDisplayName({ hostname: 'ip-10-0-0-1' })).toBe('ip-10-0-0-1');
  });

  it('uses the stored display name when set', () => {
    expect(
      hostDisplayName({ hostname: 'ip-10-0-0-1', displayName: 'prod-web-1' }),
    ).toBe('prod-web-1');
  });
});

describe('hostInventoryLabel', () => {
  it('is just the hostname when no display name is set', () => {
    expect(hostInventoryLabel({ hostname: 'ip-10-0-0-1' })).toBe('ip-10-0-0-1');
  });

  it('keeps the agent hostname next to the display name', () => {
    expect(
      hostInventoryLabel({
        hostname: 'ip-10-0-0-1',
        displayName: 'prod-web-1',
      }),
    ).toBe('prod-web-1 (ip-10-0-0-1)');
  });
});

describe('validateHostDisplayName', () => {
  it('rejects empty and whitespace-only names', () => {
    expect(validateHostDisplayName('')).toMatch(/empty/i);
    expect(validateHostDisplayName('   ')).toMatch(/empty/i);
  });

  it('rejects names that are too long', () => {
    expect(
      validateHostDisplayName('a'.repeat(HOST_DISPLAY_NAME_MAX_LENGTH + 1)),
    ).toMatch(/at most/);
  });

  it('accepts a trimmed name', () => {
    expect(validateHostDisplayName('  prod-web-1  ')).toBeNull();
  });
});
