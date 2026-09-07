import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/services/api';
import { renameHost } from '@/services/hosts';

vi.mock('@/services/api', () => ({
  apiClient: {
    patch: vi.fn(),
  },
}));

describe('renameHost', () => {
  beforeEach(() => {
    vi.mocked(apiClient.patch).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('PATCHes the host display name', async () => {
    const updated = {
      id: 'host-1',
      hostname: 'ip-10-0-0-1',
      displayName: 'prod-web-1',
    };
    vi.mocked(apiClient.patch).mockResolvedValueOnce(updated);

    await expect(renameHost('host-1', 'prod-web-1')).resolves.toEqual(updated);
    expect(apiClient.patch).toHaveBeenCalledWith('/hosts/host-1', {
      displayName: 'prod-web-1',
    });
  });
});
