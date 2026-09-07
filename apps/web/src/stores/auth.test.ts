import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '@/services/auth.service';

const {
  mockCreateFirstAdmin,
  mockFetchCurrentUser,
  mockFetchSetupStatus,
  mockLogin,
  mockLogout,
  mockOnTokenChange,
  testState,
} = vi.hoisted(() => {
  const testState = {
    tokenChangeCallback: null as ((token: string | null) => void) | null,
  };
  return {
    mockCreateFirstAdmin: vi.fn(),
    mockFetchCurrentUser: vi.fn(),
    mockFetchSetupStatus: vi.fn(),
    mockLogin: vi.fn(),
    mockLogout: vi.fn(),
    mockOnTokenChange: vi.fn((cb) => {
      testState.tokenChangeCallback = cb;
    }),
    testState,
  };
});

vi.mock('@/services/auth.service', () => ({
  createFirstAdmin: mockCreateFirstAdmin,
  fetchCurrentUser: mockFetchCurrentUser,
  fetchSetupStatus: mockFetchSetupStatus,
  login: mockLogin,
  logout: mockLogout,
  onTokenChange: mockOnTokenChange,
}));

// Import store AFTER mocks are hoisted
import { useAuthStore } from './auth';

const MOCK_USER: AuthUser = {
  id: 'usr_123',
  email: 'admin@docksight.io',
  role: 'ADMIN',
};

describe('stores/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      status: 'loading',
      user: null,
    });
  });

  it('initializes with loading state and null user', () => {
    const state = useAuthStore.getState();
    expect(state.status).toBe('loading');
    expect(state.user).toBeNull();
  });

  describe('bootstrap', () => {
    it('sets status to "setup-required" when first-run setup is needed', async () => {
      mockFetchSetupStatus.mockResolvedValueOnce({ setupRequired: true });

      await useAuthStore.getState().bootstrap();

      expect(mockFetchSetupStatus).toHaveBeenCalledTimes(1);
      expect(mockFetchCurrentUser).not.toHaveBeenCalled();
      expect(useAuthStore.getState().status).toBe('setup-required');
      expect(useAuthStore.getState().user).toBeNull();
    });

    it('sets status to "unauthenticated" when setup check throws a network error', async () => {
      mockFetchSetupStatus.mockRejectedValueOnce(
        new Error('Server unreachable'),
      );

      await useAuthStore.getState().bootstrap();

      expect(useAuthStore.getState().status).toBe('unauthenticated');
      expect(useAuthStore.getState().user).toBeNull();
    });

    it('sets status to "authenticated" when setup is done and valid user session exists', async () => {
      mockFetchSetupStatus.mockResolvedValueOnce({ setupRequired: false });
      mockFetchCurrentUser.mockResolvedValueOnce(MOCK_USER);

      await useAuthStore.getState().bootstrap();

      expect(mockFetchCurrentUser).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState().status).toBe('authenticated');
      expect(useAuthStore.getState().user).toEqual(MOCK_USER);
    });

    it('sets status to "unauthenticated" when setup is done but no active session exists', async () => {
      mockFetchSetupStatus.mockResolvedValueOnce({ setupRequired: false });
      mockFetchCurrentUser.mockResolvedValueOnce(null);

      await useAuthStore.getState().bootstrap();

      expect(useAuthStore.getState().status).toBe('unauthenticated');
      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe('signIn', () => {
    it('authenticates user and populates user state on successful login', async () => {
      mockLogin.mockResolvedValueOnce(MOCK_USER);

      await useAuthStore.getState().signIn('admin@docksight.io', 'secret-pass');

      expect(mockLogin).toHaveBeenCalledWith(
        'admin@docksight.io',
        'secret-pass',
      );
      expect(useAuthStore.getState().status).toBe('authenticated');
      expect(useAuthStore.getState().user).toEqual(MOCK_USER);
    });
  });

  describe('signOut', () => {
    it('clears user state and updates status to unauthenticated', () => {
      useAuthStore.setState({ status: 'authenticated', user: MOCK_USER });

      useAuthStore.getState().signOut();

      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState().status).toBe('unauthenticated');
      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe('completeSetup', () => {
    it('creates first admin and immediately logs user in', async () => {
      mockCreateFirstAdmin.mockResolvedValueOnce(undefined);
      mockLogin.mockResolvedValueOnce(MOCK_USER);

      await useAuthStore
        .getState()
        .completeSetup('admin@docksight.io', 'secret-pass');

      expect(mockCreateFirstAdmin).toHaveBeenCalledWith(
        'admin@docksight.io',
        'secret-pass',
      );
      expect(mockLogin).toHaveBeenCalledWith(
        'admin@docksight.io',
        'secret-pass',
      );
      expect(useAuthStore.getState().status).toBe('authenticated');
      expect(useAuthStore.getState().user).toEqual(MOCK_USER);
    });
  });

  describe('onTokenChange listener', () => {
    it('drops authenticated session to unauthenticated when token is cleared', () => {
      useAuthStore.setState({ status: 'authenticated', user: MOCK_USER });

      expect(testState.tokenChangeCallback).not.toBeNull();
      testState.tokenChangeCallback?.(null);

      expect(useAuthStore.getState().status).toBe('unauthenticated');
      expect(useAuthStore.getState().user).toBeNull();
    });

    it('does not alter state when token is cleared if status is not authenticated', () => {
      useAuthStore.setState({ status: 'setup-required', user: null });

      testState.tokenChangeCallback?.(null);

      expect(useAuthStore.getState().status).toBe('setup-required');
    });

    it('does not alter state when token is non-null', () => {
      useAuthStore.setState({ status: 'authenticated', user: MOCK_USER });

      testState.tokenChangeCallback?.('valid.jwt.token');

      expect(useAuthStore.getState().status).toBe('authenticated');
      expect(useAuthStore.getState().user).toEqual(MOCK_USER);
    });
  });
});
