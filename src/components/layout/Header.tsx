import { useSchemaState } from '../../context/SchemaContext';

interface HeaderProps {
  onMenuToggle: () => void;
  menuOpen: boolean;
}

export function Header({ onMenuToggle, menuOpen }: HeaderProps) {
  const { schema, loadingState } = useSchemaState();

  return (
    <header className="sticky top-0 z-30 border-b border-surface-200 bg-white/95 backdrop-blur-sm">
      <div className="flex h-14 items-center gap-3 px-4">
        <button
          type="button"
          onClick={onMenuToggle}
          className="rounded-lg p-1.5 text-slate-600 hover:bg-surface-100 md:hidden"
          aria-label={menuOpen ? 'Menü schließen' : 'Menü öffnen'}
          aria-expanded={menuOpen}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <h1 className="text-lg font-semibold text-slate-800">
            TEI Schema Viewer
          </h1>
        </div>

        {schema && loadingState === 'ready' && (
          <span className="ml-auto hidden text-sm text-slate-500 sm:block">
            {schema.name} — {schema.elementNames.length} Elemente
          </span>
        )}
      </div>
    </header>
  );
}
