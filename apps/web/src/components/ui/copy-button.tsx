import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { copyToClipboard } from '@/lib/format';
import { cn } from '@/lib/utils';

type CopyButtonProps = {
  value: string;
  label?: string;
  variant?: 'icon' | 'button';
  className?: string;
};

export function CopyButton({
  value,
  label = 'Copy',
  variant = 'icon',
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const ok = await copyToClipboard(value);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_600);
    }
  }

  const Icon = copied ? Check : Copy;

  if (variant === 'button') {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void handleCopy()}
        className={className}
      >
        <Icon
          className={cn('h-3.5 w-3.5', copied && 'text-success')}
          aria-hidden
        />
        {copied ? 'Copied' : label}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      title={label}
      aria-label={label}
      className={cn(
        'rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100',
        copied && 'opacity-100',
        className,
      )}
    >
      <Icon
        className={cn('h-3.5 w-3.5', copied && 'text-success')}
        aria-hidden
      />
    </button>
  );
}
