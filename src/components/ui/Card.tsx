import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`rounded-xl bg-white shadow-sm transition-shadow hover:shadow-md ${className}`}
    >
      {children}
    </div>
  );
}
