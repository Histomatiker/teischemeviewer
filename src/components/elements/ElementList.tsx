import { useRef, useCallback } from 'react';
import { useSchemaState } from '../../context/SchemaContext';
import { useSearch } from '../../hooks/useSearch';
import { useNavigation } from '../../hooks/useNavigation';
import { ElementCard } from './ElementCard';

interface ElementListProps {
  onSelect?: () => void;
}

export function ElementList({ onSelect }: ElementListProps) {
  const { schema } = useSchemaState();
  const { filteredElements } = useSearch();
  const { selectedElement, selectElement } = useNavigation();
  const listRef = useRef<HTMLDivElement>(null);

  const handleSelect = useCallback(
    (name: string) => {
      selectElement(name);
      onSelect?.();
    },
    [selectElement, onSelect]
  );

  if (!schema) return null;

  return (
    <div
      ref={listRef}
      role="listbox"
      aria-label="Elementliste"
      className="flex-1 overflow-y-auto px-2 pb-4"
    >
      {filteredElements.length === 0 ? (
        <p className="px-2 py-4 text-center text-sm text-slate-400">
          Keine Elemente gefunden
        </p>
      ) : (
        <div className="space-y-0.5">
          <p className="px-3 py-1 text-xs text-slate-400">
            {filteredElements.length} Element{filteredElements.length !== 1 ? 'e' : ''}
          </p>
          {filteredElements.map((name) => {
            const element = schema.elements.get(name);
            if (!element) return null;
            return (
              <ElementCard
                key={name}
                element={element}
                isSelected={selectedElement === name}
                onSelect={() => handleSelect(name)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
