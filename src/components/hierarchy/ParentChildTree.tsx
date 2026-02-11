import { useState, useCallback, useMemo } from 'react';
import { useSchemaState } from '../../context/SchemaContext';
import { TreeNode } from './TreeNode';
import type { ChildRef } from '../../types/tei';

function formatCardinality(ref: ChildRef): string | undefined {
  const { minOccurs, maxOccurs } = ref;
  if (minOccurs === 1 && maxOccurs === 1) return undefined;
  if (minOccurs === 0 && maxOccurs === 1) return '?';
  if (minOccurs === 0 && maxOccurs === 'unbounded') return '*';
  if (minOccurs === 1 && maxOccurs === 'unbounded') return '+';
  const maxStr = maxOccurs === 'unbounded' ? '\u221E' : String(maxOccurs);
  return `${minOccurs}..${maxStr}`;
}

function cardinalityTooltip(symbol: string): string {
  switch (symbol) {
    case '?': return 'Optional (0..1)';
    case '*': return 'Beliebig viele (0..∞)';
    case '+': return 'Mindestens eines (1..∞)';
    default: return `Kardinalität ${symbol}`;
  }
}

interface ParentChildTreeProps {
  elementNames: string[];
  onSelect: (name: string) => void;
  childRefs?: ChildRef[];
}

export function ParentChildTree({ elementNames, onSelect, childRefs }: ParentChildTreeProps) {
  const refMap = useMemo(() => {
    if (!childRefs) return undefined;
    const m = new Map<string, ChildRef>();
    for (const cr of childRefs) {
      m.set(cr.name, cr);
    }
    return m;
  }, [childRefs]);

  return (
    <ul role="tree" className="space-y-0.5">
      {elementNames.map((name) => (
        <ParentChildTreeItem
          key={name}
          name={name}
          onSelect={onSelect}
          depth={0}
          cardinality={refMap?.get(name) ? formatCardinality(refMap.get(name)!) : undefined}
        />
      ))}
    </ul>
  );
}

export { formatCardinality, cardinalityTooltip };

interface TreeItemProps {
  name: string;
  onSelect: (name: string) => void;
  depth: number;
  cardinality?: string;
}

function ParentChildTreeItem({ name, onSelect, depth, cardinality }: TreeItemProps) {
  const { schema } = useSchemaState();
  const [expanded, setExpanded] = useState(false);
  const element = schema?.elements.get(name);
  const hasChildren = element && element.children.length > 0;

  const childRefMap = useMemo(() => {
    if (!element?.childRefs) return undefined;
    const m = new Map<string, ChildRef>();
    for (const cr of element.childRefs) {
      m.set(cr.name, cr);
    }
    return m;
  }, [element?.childRefs]);

  const toggleExpand = useCallback(() => {
    setExpanded((p) => !p);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowRight' && hasChildren && !expanded) {
        e.preventDefault();
        setExpanded(true);
      } else if (e.key === 'ArrowLeft' && expanded) {
        e.preventDefault();
        setExpanded(false);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(name);
      }
    },
    [hasChildren, expanded, name, onSelect]
  );

  // Limit depth to prevent excessively deep rendering
  if (depth > 3) {
    return (
      <TreeNode
        name={name}
        hasChildren={false}
        expanded={false}
        onToggle={() => {}}
        onSelect={() => onSelect(name)}
        onKeyDown={handleKeyDown}
        cardinality={cardinality}
      />
    );
  }

  return (
    <li role="treeitem" aria-expanded={hasChildren ? expanded : undefined}>
      <TreeNode
        name={name}
        hasChildren={!!hasChildren}
        expanded={expanded}
        onToggle={toggleExpand}
        onSelect={() => onSelect(name)}
        onKeyDown={handleKeyDown}
        cardinality={cardinality}
      />
      {hasChildren && expanded && (
        <ul role="group" className="ml-4">
          {element.children.map((child) => (
            <ParentChildTreeItem
              key={child}
              name={child}
              onSelect={onSelect}
              depth={depth + 1}
              cardinality={childRefMap?.get(child) ? formatCardinality(childRefMap.get(child)!) : undefined}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
