import { Badge } from '@/components/ui/badge';
import { statusLabel, statusTone } from '@/lib/status';

type StatusBadgeProps = {
  status: string;
  className?: string;
  /** Animate the dot while the entity is live (running / online). */
  live?: boolean;
  label?: string;
};

export function StatusBadge({
  status,
  className,
  live = true,
  label,
}: StatusBadgeProps) {
  const tone = statusTone(status);
  return (
    <Badge
      tone={tone}
      className={className}
      dot
      pulse={live && tone === 'success'}
    >
      {label ?? statusLabel(status)}
    </Badge>
  );
}
