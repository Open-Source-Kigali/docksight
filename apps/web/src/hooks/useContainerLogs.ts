import { useCallback, useEffect, useRef, useState } from 'react';
import { getToken } from '@/services/tokenStorage';
import type { LogEntry } from '@/types/api';

export type LogStreamStatus = 'connecting' | 'live' | 'paused' | 'error';

const MAX_ENTRIES = 5_000;

function resolveApiBase(): string {
  const raw = import.meta.env.VITE_API_URL as string | undefined;
  if (!raw || raw.trim() === '') {
    return 'http://localhost:3000/api';
  }
  return raw.replace(/\/$/, '');
}

/**
 * Subscribes to `GET /containers/:id/logs` (server-sent events).
 *
 * Uses fetch + a stream reader rather than `EventSource`, because EventSource
 * cannot set request headers — the only way to authenticate it is to put the
 * JWT in the query string, where it lands in server access logs and browser
 * history. A fetch reader sends a normal `Authorization: Bearer` header.
 *
 * Pausing keeps the stream open and buffers entries so nothing is lost while
 * the user reads.
 */
export function useContainerLogs(
  hostId: string | undefined,
  containerId: string | undefined,
  { tail = 200 }: { tail?: number } = {},
) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState<LogStreamStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [bufferedCount, setBufferedCount] = useState(0);

  const pausedRef = useRef(paused);
  const bufferRef = useRef<LogEntry[]>([]);
  const [reconnectToken, setReconnectToken] = useState(0);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    if (!hostId || !containerId) {
      return;
    }

    setEntries([]);
    setError(null);
    setStatus('connecting');
    bufferRef.current = [];
    setBufferedCount(0);

    const controller = new AbortController();
    const url = `${resolveApiBase()}/containers/${encodeURIComponent(containerId)}/logs?hostId=${encodeURIComponent(hostId)}&tail=${tail}&follow=true`;

    const pushEntries = (next: LogEntry[]) => {
      if (next.length === 0) {
        return;
      }
      if (pausedRef.current) {
        bufferRef.current = [...bufferRef.current, ...next].slice(-MAX_ENTRIES);
        setBufferedCount(bufferRef.current.length);
        return;
      }
      setEntries((current) => [...current, ...next].slice(-MAX_ENTRIES));
      setStatus('live');
    };

    async function stream() {
      const token = getToken();

      let response: Response;
      try {
        response = await fetch(url, {
          headers: {
            Accept: 'text/event-stream',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: controller.signal,
        });
      } catch {
        if (!controller.signal.aborted) {
          setStatus('error');
          setError('Could not reach the log stream');
        }
        return;
      }

      if (!response.ok || !response.body) {
        setStatus('error');
        setError(
          response.status === 401
            ? 'Session expired — sign in again'
            : response.status === 403
              ? 'Not permitted to read these logs'
              : `Log stream failed (${response.status})`,
        );
        return;
      }

      setStatus(pausedRef.current ? 'paused' : 'live');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          // SSE frames are separated by a blank line.
          let separator = buffer.indexOf('\n\n');
          while (separator !== -1) {
            const frame = buffer.slice(0, separator);
            buffer = buffer.slice(separator + 2);
            handleFrame(frame, pushEntries);
            separator = buffer.indexOf('\n\n');
          }
        }
      } catch {
        // Aborted on unmount is the normal path; anything else is a drop.
      }

      if (!controller.signal.aborted) {
        setStatus('error');
        setError('Log stream disconnected');
      }
    }

    void stream();

    return () => {
      controller.abort();
    };
  }, [hostId, containerId, tail, reconnectToken]);

  const togglePause = useCallback(() => {
    setPaused((current) => {
      const next = !current;
      if (!next && bufferRef.current.length > 0) {
        const buffered = bufferRef.current;
        bufferRef.current = [];
        setBufferedCount(0);
        setEntries((entriesNow) =>
          [...entriesNow, ...buffered].slice(-MAX_ENTRIES),
        );
      }
      setStatus(next ? 'paused' : 'live');
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setEntries([]);
    bufferRef.current = [];
    setBufferedCount(0);
  }, []);

  const reconnect = useCallback(() => {
    setReconnectToken((token) => token + 1);
  }, []);

  return {
    entries,
    status,
    error,
    paused,
    bufferedCount,
    togglePause,
    clear,
    reconnect,
  };
}

/** Parses one `event:`/`data:` SSE frame and forwards log chunks. */
function handleFrame(frame: string, push: (entries: LogEntry[]) => void): void {
  let eventName = 'message';
  const dataLines: string[] = [];

  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }

  if (eventName !== 'logs.chunk' || dataLines.length === 0) {
    return;
  }

  try {
    const payload = JSON.parse(dataLines.join('\n')) as {
      entries?: LogEntry[];
    };
    push(Array.isArray(payload.entries) ? payload.entries : []);
  } catch {
    // Ignore a malformed chunk rather than tearing down the stream.
  }
}
