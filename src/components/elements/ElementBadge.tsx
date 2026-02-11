import { Badge } from '../ui/Badge';

interface ElementBadgeProps {
  name: string;
  variant?: 'element' | 'attribute' | 'class';
  onClick?: () => void;
}

export function ElementBadge({
  name,
  variant = 'element',
  onClick,
}: ElementBadgeProps) {
  return (
    <Badge variant={variant} onClick={onClick}>
      {variant === 'element' ? `<${name}>` : name}
    </Badge>
  );
}
