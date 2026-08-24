import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import type { Host } from '@/types/api'

type DeleteHostDialogProps = {
  host: Host
  pending?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteHostDialog({
  host,
  pending = false,
  onCancel,
  onConfirm,
}: DeleteHostDialogProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) {
        onCancel()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCancel, pending])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="animate-overlay-in absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
        onClick={pending ? undefined : onCancel}
        aria-hidden
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-host-title"
        aria-describedby="delete-host-description"
        className="animate-pop-in relative w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-2xl"
      >
        <h2
          id="delete-host-title"
          className="text-heading font-semibold tracking-tight"
        >
          Delete {host.hostname}?
        </h2>
        <p
          id="delete-host-description"
          className="mt-2 text-sm leading-relaxed text-muted-foreground"
        >
          This host has been inactive for at least seven days. Removing it
          deletes the DockSight record. This cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? 'Deleting…' : 'Delete host'}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
