import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastTone = 'success' | 'error' | 'info';

export type Toast = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
};

type ToastContextValue = {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_ICON = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
} as const;

const TONE_STYLE: Record<ToastTone, string> = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-primary',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { ...toast, id }]);
      window.setTimeout(() => dismiss(id), 4_500);
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({ toasts, push, dismiss }),
    [toasts, push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:w-full"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const Icon = TONE_ICON[toast.tone];
          return (
            <div
              key={toast.id}
              className="animate-pop-in pointer-events-auto flex items-start gap-3 rounded-lg border border-border bg-popover px-4 py-3 shadow-lg"
            >
              <Icon
                className={cn(
                  'mt-0.5 h-4 w-4 shrink-0',
                  TONE_STYLE[toast.tone],
                )}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {toast.title}
                </p>
                {toast.description ? (
                  <p className="mt-0.5 break-words text-xs text-muted-foreground">
                    {toast.description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Dismiss notification"
                className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                onClick={() => dismiss(toast.id)}
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
