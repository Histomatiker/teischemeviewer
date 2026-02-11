import type { ReactNode } from 'react';

type BadgeVariant = 'element' | 'attribute' | 'class' | 'default';

const variantClasses: Record<BadgeVariant, string> = {
  element: 'bg-primary-100 text-primary-800 hover:bg-primary-200',
  attribute: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
  class: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
  default: 'bg-surface-100 text-slate-600 hover:bg-surface-200',
};

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  onClick?: () => void;
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  onClick,
  className = '',
}: BadgeProps) {
  const base =
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors';
  const classes = `${base} ${variantClasses[variant]} ${onClick ? 'cursor-pointer' : ''} ${className}`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {children}
      </button>
    );
  }

  return <span className={classes}>{children}</span>;
}
