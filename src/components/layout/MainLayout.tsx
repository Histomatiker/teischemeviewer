import { useState, useCallback, type ReactNode } from 'react';
import { SkipLink } from '../ui/SkipLink';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';

interface MainLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
}

export function MainLayout({ sidebar, children }: MainLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = useCallback(() => setMenuOpen((p) => !p), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <div className="flex h-screen flex-col">
      <SkipLink />
      <Header onMenuToggle={toggleMenu} menuOpen={menuOpen} />
      <div className="flex min-h-0 flex-1">
        <Sidebar>{sidebar}</Sidebar>
        <main id="main-content" className="flex-1 overflow-y-auto p-4 md:p-6" tabIndex={-1}>
          {children}
        </main>
      </div>
      <MobileNav open={menuOpen} onClose={closeMenu}>
        {sidebar}
      </MobileNav>
    </div>
  );
}
