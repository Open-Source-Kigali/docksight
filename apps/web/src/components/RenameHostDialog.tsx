import { useEffect, useId, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRenameHost } from '@/hooks/useRenameHost';
import { hostDisplayName, validateHostDisplayName } from '@/lib/host-name';
import { ApiError } from '@/services/api';
import type { Host } from '@/types/api';

export function RenameHostDialog({
  host,
  onClose,
}: {
  host: Host;
  onClose: () => void;
}) {
  const headingId = useId();
  const errorId = useId();
  const mutation = useRenameHost();
  const [value, setValue] = useState(hostDisplayName(host));
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !mutation.isPending) {
        onClose();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, mutation.isPending]);

  const apiError =
    mutation.error instanceof ApiError || mutation.error instanceof Error
      ? mutation.error.message
      : null;
  const error = localError ?? apiError;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const invalid = validateHostDisplayName(value);
    if (invalid) {
      setLocalError(invalid);
      return;
    }
    setLocalError(null);
    try {
      await mutation.mutateAsync({
        hostId: host.id,
        displayName: value.trim(),
      });
      onClose();
    } catch {
      // Shown via mutation.error on the form.
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
        onClick={() => {
          if (!mutation.isPending) {
            onClose();
          }
        }}
        aria-hidden
      />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onSubmit={(event) => {
          void onSubmit(event);
        }}
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-sm rounded-lg border border-border bg-card p-5 shadow-2xl"
      >
        <h2 id={headingId} className="text-base font-semibold tracking-tight">
          Rename host
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Agent hostname: <span className="font-mono">{host.hostname}</span>
        </p>
        <label
          className="mt-4 block text-sm font-medium"
          htmlFor={`${headingId}-name`}
        >
          Display name
        </label>
        <Input
          id={`${headingId}-name`}
          value={value}
          autoFocus
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          disabled={mutation.isPending}
          onChange={(event) => {
            setValue(event.target.value);
            setLocalError(null);
            mutation.reset();
          }}
          className="mt-1.5"
        />
        {error ? (
          <p id={errorId} className="mt-2 text-xs text-danger">
            {error}
          </p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={mutation.isPending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
