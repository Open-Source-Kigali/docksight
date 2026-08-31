import { apiClient } from '@/services/api';
import {
  clearToken,
  getToken,
  hasToken,
  onTokenChange,
  setToken,
} from '@/services/tokenStorage';

export type UserRole = 'ADMIN' | 'VIEWER';

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
};

export type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};

export type SetupStatus = {
  setupRequired: boolean;
};

/**
 * The React app's entire authentication surface.
 *
 * The server is the security boundary — this module only moves a token around
 * and never decides what the user is allowed to do. Any role check done here
 * is for showing or hiding UI; the API re-checks it on every request.
 */

/**
 * Exchanges credentials for a token and stores it.
 * Sent anonymously: an expired token in storage must not turn a valid login
 * into a 401.
 */
export async function login(
  email: string,
  password: string,
): Promise<AuthUser> {
  const result = await apiClient.post<LoginResponse>(
    '/auth/login',
    { email, password },
    { anonymous: true },
  );

  setToken(result.accessToken);
  return result.user;
}

/**
 * Drops the token. Stateless JWT means there is no server call to make — the
 * token stays technically valid until it expires, which is the trade-off of
 * having no refresh-token/revocation layer in the MVP.
 */
export function logout(): void {
  clearToken();
}

/** Current access token, or null. Prefer `isAuthenticated()` for checks. */
export { getToken };

/** Whether a token is present. Says nothing about whether it is still valid. */
export function isAuthenticated(): boolean {
  return hasToken();
}

/**
 * Resolves the signed-in user from the server. Returns null when there is no
 * token or the server rejects it — the api client clears a rejected token, so
 * calling this on startup is also how the app detects an expired session.
 */
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  if (!hasToken()) {
    return null;
  }

  try {
    return await apiClient.get<AuthUser>('/auth/me');
  } catch {
    return null;
  }
}

/** Whether this instance still needs its first administrator. */
export function fetchSetupStatus(): Promise<SetupStatus> {
  return apiClient.get<SetupStatus>('/setup/status', { anonymous: true });
}

/** Creates the first administrator. Only succeeds while no user exists. */
export function createFirstAdmin(
  email: string,
  password: string,
): Promise<AuthUser> {
  return apiClient.post<AuthUser>(
    '/setup/create-admin',
    { email, password },
    { anonymous: true },
  );
}

/** Subscribe to sign-in/sign-out, including forced sign-out from a 401. */
export { onTokenChange };
