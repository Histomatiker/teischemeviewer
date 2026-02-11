import type { TeiElement } from '../../types/tei';

interface ElementCardProps {
  element: TeiElement;
  isSelected: boolean;
  onSelect: () => void;
}

export function ElementCard({ element, isSelected, onSelect }: ElementCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
        isSelected
          ? 'bg-primary-50 text-primary-800'
          : 'text-slate-700 hover:bg-surface-100'
      }`}
      aria-current={isSelected ? 'true' : undefined}
    >
      <span className="block text-sm font-medium">
        &lt;{element.name}&gt;
      </span>
      {element.documentation && (
        <span className="mt-0.5 block truncate text-xs text-slate-500">
          {element.documentation}
        </span>
      )}
    </button>
  );
}
