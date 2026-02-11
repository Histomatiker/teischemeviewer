import type { ReactNode } from 'react';

interface SidebarProps {
  children: ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  return (
    <aside className="hidden w-80 shrink-0 border-r border-surface-200 bg-white md:flex md:flex-col lg:w-80">
      {children}
    </aside>
  );
}
