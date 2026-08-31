/**
 * The single place that knows *where* the access token lives.
 *
 * Everything else in the app calls getToken/setToken/clearToken, so swapping
 * localStorage for sessionStorage, memory, or an httpOnly cookie later is one
 * file's worth of change rather than a codebase-wide search.
 *
 * Note on the storage choice: localStorage is readable by any script on the
 * origin, so it is only as safe as the app's XSS posture. It is the pragmatic
 * MVP choice; the long-term fix is a httpOnly, SameSite cookie issued by the
 * server — see the notes in the auth service.
 */

const TOKEN_KEY = 'docksight.accessToken';

type TokenListener = (token: string | null) => void;

const listeners = new Set<TokenListener>();

/** In-memory mirror so reads do not hit localStorage on every request. */
let cachedToken: string | null | undefined;

export function getToken(): string | null {
  if (cachedToken !== undefined) {
    return cachedToken;
  }

  try {
    cachedToken = window.localStorage.getItem(TOKEN_KEY);
  } catch {
    // Private mode or storage disabled — fall back to memory-only for the
    // lifetime of the tab rather than crashing every API call.
    cachedToken = null;
  }

  return cachedToken;
}

export function setToken(token: string): void {
  cachedToken = token;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Keep the in-memory value; the session still works until reload.
  }
  notify(token);
}

export function clearToken(): void {
  cachedToken = null;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nothing to do — the cache is already cleared.
  }
  notify(null);
}

export function hasToken(): boolean {
  return Boolean(getToken());
}

/**
 * Subscribes to token changes, including sign-out triggered by a 401 from the
 * API client. Returns an unsubscribe function.
 */
export function onTokenChange(listener: TokenListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(token: string | null): void {
  for (const listener of listeners) {
    listener(token);
  }
}
