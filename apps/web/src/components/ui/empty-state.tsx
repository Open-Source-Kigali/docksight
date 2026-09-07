import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type EmptyStateProps = {
  illustration?: 'containers' | 'images' | 'hosts' | 'search' | 'logs';
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  illustration = 'containers',
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-card/60 px-6 py-14 text-center',
        className,
      )}
    >
      <Illustration kind={illustration} />
      <div className="space-y-1.5">
        <p className="text-heading font-semibold tracking-tight">{title}</p>
        {description ? (
          <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/**
 * Flat line illustrations drawn from the token palette so they follow the
 * active theme. Deliberately geometric — no stock art.
 */
function Illustration({
  kind,
}: {
  kind: NonNullable<EmptyStateProps['illustration']>;
}) {
  const stroke = 'stroke-border';
  const accent = 'stroke-primary/50';
  const fill = 'fill-secondary';

  return (
    <svg
      width="132"
      height="92"
      viewBox="0 0 132 92"
      fill="none"
      aria-hidden
      className="text-muted-foreground"
    >
      <ellipse cx="66" cy="80" rx="46" ry="6" className="fill-secondary" />

      {kind === 'containers' ? (
        <g strokeWidth="2" strokeLinejoin="round">
          <rect
            x="30"
            y="40"
            width="30"
            height="26"
            rx="4"
            className={`${fill} ${stroke}`}
          />
          <rect
            x="66"
            y="40"
            width="30"
            height="26"
            rx="4"
            className={`${fill} ${stroke}`}
          />
          <rect
            x="48"
            y="12"
            width="30"
            height="26"
            rx="4"
            className={`${fill} ${accent}`}
          />
          <path
            d="M57 25h12M57 53h12M21 53h12"
            className={accent}
            strokeLinecap="round"
          />
        </g>
      ) : null}

      {kind === 'images' ? (
        <g strokeWidth="2" strokeLinejoin="round">
          <rect
            x="34"
            y="22"
            width="64"
            height="44"
            rx="6"
            className={`${fill} ${stroke}`}
          />
          <rect
            x="42"
            y="30"
            width="48"
            height="10"
            rx="3"
            className={accent}
          />
          <path
            d="M42 50h30M42 58h20"
            className={stroke}
            strokeLinecap="round"
          />
        </g>
      ) : null}

      {kind === 'hosts' ? (
        <g strokeWidth="2" strokeLinejoin="round">
          <rect
            x="34"
            y="18"
            width="64"
            height="20"
            rx="5"
            className={`${fill} ${stroke}`}
          />
          <rect
            x="34"
            y="46"
            width="64"
            height="20"
            rx="5"
            className={`${fill} ${accent}`}
          />
          <circle cx="46" cy="28" r="2.5" className="fill-current opacity-40" />
          <circle cx="46" cy="56" r="2.5" className="fill-primary" />
          <path
            d="M62 28h24M62 56h24"
            className={stroke}
            strokeLinecap="round"
          />
        </g>
      ) : null}

      {kind === 'search' ? (
        <g strokeWidth="2" strokeLinejoin="round">
          <circle cx="60" cy="38" r="20" className={`${fill} ${stroke}`} />
          <path d="M75 53l14 14" className={accent} strokeLinecap="round" />
          <path d="M52 38h16" className={accent} strokeLinecap="round" />
        </g>
      ) : null}

      {kind === 'logs' ? (
        <g strokeWidth="2" strokeLinejoin="round">
          <rect
            x="30"
            y="18"
            width="72"
            height="48"
            rx="6"
            className={`${fill} ${stroke}`}
          />
          <path
            d="M40 32l6 5-6 5"
            className={accent}
            strokeLinecap="round"
            fill="none"
          />
          <path d="M54 42h18" className={stroke} strokeLinecap="round" />
        </g>
      ) : null}
    </svg>
  );
}
