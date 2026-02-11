interface BreadcrumbsProps {
  items: string[];
  onNavigate: (name: string) => void;
}

export function Breadcrumbs({ items, onNavigate }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Navigationspfad" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
        {items.map((item, i) => (
          <li key={`${item}-${i}`} className="flex items-center gap-1">
            {i > 0 && (
              <svg
                className="h-3.5 w-3.5 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
            {i === items.length - 1 ? (
              <span className="font-medium text-slate-800" aria-current="page">
                &lt;{item}&gt;
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate(item)}
                className="rounded px-1 hover:text-primary-600 hover:underline"
              >
                &lt;{item}&gt;
              </button>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
