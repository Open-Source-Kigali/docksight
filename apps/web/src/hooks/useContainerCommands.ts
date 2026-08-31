import { useState } from 'react';
import { useConfirm } from '@/components/ConfirmProvider';
import { useToast } from '@/components/ToastProvider';
import { useContainerAction } from '@/hooks/useContainerAction';
import { ApiError } from '@/services/api';
import type { ContainerAction } from '@/types/api';
import type { ContainerRow } from '@/components/ContainerTable';

const PAST_TENSE: Record<ContainerAction, string> = {
  start: 'started',
  stop: 'stopped',
  restart: 'restarted',
  remove: 'deleted',
};

/** Verb used in failure toasts; `remove` reads better as "delete" to a user. */
const VERB: Record<ContainerAction, string> = {
  start: 'start',
  stop: 'stop',
  restart: 'restart',
  remove: 'delete',
};

/**
 * Runs a lifecycle command against `POST /containers/:id/{action}` and reports
 * the agent's reply as a toast. `busyKey` is `"<containerId>:<action>"`.
 */
export function useContainerCommands(
  fallbackHostId?: string,
  onSettled?: () => void,
) {
  const toast = useToast();
  const confirm = useConfirm();
  const mutation = useContainerAction();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function run(container: ContainerRow, action: ContainerAction) {
    const hostId = container.hostId ?? fallbackHostId;
    if (!hostId) {
      return;
    }

    const name = container.name.replace(/^\//, '');
    let force = false;

    // Deletion is the one irreversible action, so it is gated here rather than
    // in any single component: every surface routes through this function.
    if (action === 'remove') {
      const running = container.state === 'running';
      const answer = await confirm({
        title: `Delete ${name}?`,
        description: running
          ? 'This container is running. Deleting it cannot be undone.'
          : 'This cannot be undone.',
        confirmLabel: 'Delete',
        toggle: running
          ? {
              label: 'Force delete',
              description:
                'Kill the container first. Without this, Docker refuses to delete a running container.',
            }
          : undefined,
      });
      if (!answer.confirmed) {
        return;
      }
      force = answer.toggled;
    }

    setBusyKey(`${container.id}:${action}`);
    try {
      const result = await mutation.mutateAsync({
        containerId: container.id,
        hostId,
        action,
        containerName: container.name,
        force,
      });

      if (result.ok) {
        toast.push({
          tone: 'success',
          title: `Container ${PAST_TENSE[action]}`,
          description: `${name} · ${result.message}`,
        });
        onSettled?.();
      } else {
        toast.push({
          tone: 'error',
          title: `Could not ${VERB[action]} container`,
          description: result.error ?? result.message,
        });
      }
    } catch (error) {
      toast.push({
        tone: 'error',
        title: `Could not ${VERB[action]} container`,
        description:
          error instanceof ApiError || error instanceof Error
            ? error.message
            : `Failed to ${VERB[action]} container`,
      });
    } finally {
      setBusyKey(null);
    }
  }

  return { busyKey, run };
}
