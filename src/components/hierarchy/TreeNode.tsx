import { cardinalityTooltip } from './ParentChildTree';

interface TreeNodeProps {
  name: string;
  hasChildren: boolean;
  expanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  cardinality?: string;
}

export function TreeNode({
  name,
  hasChildren,
  expanded,
  onToggle,
  onSelect,
  onKeyDown,
  cardinality,
}: TreeNodeProps) {
  return (
    <div
      className="flex items-center gap-1 rounded-md py-0.5 hover:bg-surface-100"
      onKeyDown={onKeyDown}
    >
      {hasChildren ? (
        <button
          type="button"
          onClick={onToggle}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 hover:text-slate-600"
          aria-label={expanded ? 'Zuklappen' : 'Aufklappen'}
          tabIndex={-1}
        >
          <svg
            className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      ) : (
        <span className="h-5 w-5 shrink-0" aria-hidden="true" />
      )}
      <button
        type="button"
        onClick={onSelect}
        className="rounded px-1 py-0.5 text-left text-sm font-medium text-primary-700 hover:text-primary-900 hover:underline"
      >
        &lt;{name}&gt;
      </button>
      {cardinality && (
        <span
          className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800"
          title={cardinalityTooltip(cardinality)}
        >
          {cardinality}
        </span>
      )}
    </div>
  );
}
