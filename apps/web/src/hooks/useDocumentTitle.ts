import { useEffect } from 'react';

const PRODUCT = 'DockSight';

/**
 * Sets `document.title` to `"{title} · DockSight"` (or just `DockSight` when
 * title is empty). Restores the previous title on unmount so a departing page
 * never leaves a stale entity name behind.
 */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} · ${PRODUCT}` : PRODUCT;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
