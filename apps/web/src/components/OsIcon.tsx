import { cn } from '@/lib/utils';

/**
 * Minimal OS glyphs — lucide dropped brand marks, so these are drawn inline
 * from the same geometric language as the empty-state illustrations.
 */
export function OsIcon({ os, className }: { os: string; className?: string }) {
  const value = (os || '').toLowerCase();
  const classes = cn('h-4 w-4', className);

  if (value.includes('win')) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={classes}
        aria-hidden
      >
        <path d="M3 5.5l7.5-1v7.1H3V5.5zm8.7-1.2L21 3v8.4h-9.3V4.3zM3 12.8h7.5v7L3 18.6v-5.8zm8.7 0H21V21l-9.3-1.3v-6.9z" />
      </svg>
    );
  }

  if (value.includes('darwin') || value.includes('mac')) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={classes}
        aria-hidden
      >
        <path d="M15.5 3c.1 1.2-.4 2.3-1.1 3.1-.7.8-1.8 1.4-2.9 1.3-.1-1.1.4-2.3 1.1-3.1.8-.8 2-1.4 2.9-1.3zM19 16.3c-.5 1.2-.8 1.7-1.4 2.7-.9 1.4-2.2 3.1-3.8 3.1-1.4 0-1.8-.9-3.7-.9s-2.3.9-3.7.9c-1.6 0-2.8-1.5-3.7-2.9C1 15.9.7 11.2 2.4 8.8c1.2-1.7 3-2.7 4.8-2.7 1.8 0 2.9 1 4.4 1 1.4 0 2.3-1 4.4-1 1.6 0 3.2.8 4.4 2.3-3.9 2.1-3.2 7.5-1.4 7.9z" />
      </svg>
    );
  }

  // Linux / everything else — a simplified penguin mark.
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={classes}
      aria-hidden
    >
      <path d="M12 2c-2.6 0-4.4 2-4.3 4.6.1 1.6-.1 2.6-.8 3.7-1 1.6-2.2 3.3-2.2 5.1 0 .8.5 1.3 1.2 1.4-.3.9.1 1.7 1 2.2 1.5.8 3.4 1.2 5.1 1.2s3.6-.4 5.1-1.2c.9-.5 1.3-1.3 1-2.2.7-.1 1.2-.6 1.2-1.4 0-1.8-1.2-3.5-2.2-5.1-.7-1.1-.9-2.1-.8-3.7C16.4 4 14.6 2 12 2zm-1.6 4.1c.5 0 .9.5.9 1.2s-.4 1.2-.9 1.2-.9-.5-.9-1.2.4-1.2.9-1.2zm3.2 0c.5 0 .9.5.9 1.2s-.4 1.2-.9 1.2-.9-.5-.9-1.2.4-1.2.9-1.2zM12 9.4c.9 0 1.9.5 1.9 1s-1 1.1-1.9 1.1-1.9-.6-1.9-1.1 1-1 1.9-1z" />
    </svg>
  );
}
