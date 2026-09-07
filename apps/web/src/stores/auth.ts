import { create } from 'zustand';
import {
  createFirstAdmin,
  fetchCurrentUser,
  fetchSetupStatus,
  login as loginRequest,
  logout as logoutRequest,
  onTokenChange,
  type AuthUser,
} from '@/services/auth.service';

export type AuthStatus =
  /** Still deciding — the app shows a splash instead of flashing a login form. */
  | 'loading'
  /** No usable token. Render the login screen. */
  | 'unauthenticated'
  /** Token accepted by the server; `user` is populated. */
  | 'authenticated'
  /** No user exists yet on this instance. Render first-run setup. */
  | 'setup-required';

type AuthState = {
  status: AuthStatus;
  user: AuthUser | null;
  /** Resolves the session on app start. Safe to call more than once. */
  bootstrap: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  completeSetup: (email: string, password: string) => Promise<void>;
};

/**
 * Session state for the UI.
 *
 * This store decides what to *render*, never what is *allowed* — the server
 * re-checks the token and the role on every request. A user who edits
 * `user.role` in devtools gets a nicer-looking button and a 403.
 */
export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  user: null,

  bootstrap: async () => {
    // Ask about setup first: on a fresh instance there is nothing to log in
    // to, and the login form would be a dead end.
    try {
      const { setupRequired } = await fetchSetupStatus();
      if (setupRequired) {
        set({ status: 'setup-required', user: null });
        return;
      }
    } catch {
      // Server unreachable. Treat as signed out — the login screen surfaces
      // the connection error when the user tries to submit.
      set({ status: 'unauthenticated', user: null });
      return;
    }

    const user = await fetchCurrentUser();
    set(
      user
        ? { status: 'authenticated', user }
        : { status: 'unauthenticated', user: null },
    );
  },

  signIn: async (email, password) => {
    const user = await loginRequest(email, password);
    set({ status: 'authenticated', user });
  },

  signOut: () => {
    logoutRequest();
    set({ status: 'unauthenticated', user: null });
  },

  completeSetup: async (email, password) => {
    await createFirstAdmin(email, password);
    // Sign straight in so the operator is not asked for the password twice.
    const user = await loginRequest(email, password);
    set({ status: 'authenticated', user });
  },
}));

/**
 * The api client clears the token when the server rejects it (401). Mirror
 * that into the store so an expired session drops to the login screen
 * immediately, rather than on the next manual navigation.
 */
onTokenChange((token) => {
  if (token === null && useAuthStore.getState().status === 'authenticated') {
    useAuthStore.setState({ status: 'unauthenticated', user: null });
  }
});

/** Convenience selector — true when the signed-in user may mutate containers. */
export function useIsAdmin(): boolean {
  return useAuthStore((state) => state.user?.role === 'ADMIN');
}
