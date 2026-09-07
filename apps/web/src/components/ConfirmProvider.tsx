import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type ConfirmToggle = {
  label: string;
  description?: string;
  /** Initial checked state. Always start unchecked for destructive toggles. */
  defaultChecked?: boolean;
};

export type ConfirmRequest = {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Optional checkbox rendered above the buttons (e.g. "force remove"). */
  toggle?: ConfirmToggle;
};

export type ConfirmResult = {
  confirmed: boolean;
  /** Final state of `toggle`; false when no toggle was offered. */
  toggled: boolean;
};

type ConfirmContextValue = {
  confirm: (request: ConfirmRequest) => Promise<ConfirmResult>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

/**
 * Promise-based confirmation dialog, mirroring `ToastProvider`.
 *
 * Living behind a promise rather than component state means a caller can write
 * `if (!(await confirm(...)).confirmed) return` inline. Destructive commands can
 * therefore gate themselves inside the shared command hook, instead of every
 * surface that renders a delete control having to remember to ask first.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const [toggled, setToggled] = useState(false);
  const resolveRef = useRef<((result: ConfirmResult) => void) | null>(null);

  const settle = useCallback((result: ConfirmResult) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setRequest(null);
  }, []);

  const confirm = useCallback((next: ConfirmRequest) => {
    // A second request while one is open would orphan the first promise, so
    // resolve it as a cancel before taking over.
    resolveRef.current?.({ confirmed: false, toggled: false });
    setToggled(next.toggle?.defaultChecked ?? false);
    setRequest(next);
    return new Promise<ConfirmResult>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  useEffect(() => {
    if (!request) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        settle({ confirmed: false, toggled: false });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [request, settle]);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {request ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onClick={() => settle({ confirmed: false, toggled: false })}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-description"
            className="animate-pop-in w-full max-w-md rounded-lg border border-border bg-popover p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="mt-0.5 h-5 w-5 shrink-0 text-danger"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <h2
                  id="confirm-title"
                  className="text-sm font-semibold text-foreground"
                >
                  {request.title}
                </h2>
                <div
                  id="confirm-description"
                  className="mt-1 break-words text-xs text-muted-foreground"
                >
                  {request.description}
                </div>
              </div>
            </div>

            {request.toggle ? (
              <label className="mt-4 flex cursor-pointer items-start gap-2 rounded-md border border-border bg-background p-3">
                <input
                  type="checkbox"
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[var(--danger)]"
                  checked={toggled}
                  onChange={(event) => setToggled(event.target.checked)}
                />
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-foreground">
                    {request.toggle.label}
                  </span>
                  {request.toggle.description ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {request.toggle.description}
                    </span>
                  ) : null}
                </span>
              </label>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => settle({ confirmed: false, toggled: false })}
              >
                {request.cancelLabel ?? 'Cancel'}
              </Button>
              <Button
                autoFocus
                variant="danger"
                size="sm"
                onClick={() => settle({ confirmed: true, toggled })}
              >
                {request.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return ctx.confirm;
}
