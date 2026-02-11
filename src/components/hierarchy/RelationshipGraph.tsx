import { useState, useRef, useLayoutEffect, useCallback, useMemo } from 'react';
import type { ChildRef } from '../../types/tei';
import { formatCardinality, cardinalityTooltip } from './ParentChildTree';

const INITIAL_VISIBLE = 20;

interface RelationshipGraphProps {
  elementName: string;
  parents: string[];
  children: string[];
  childRefs: ChildRef[];
  onSelect: (name: string) => void;
}

interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  key: string;
}

export function RelationshipGraph({
  elementName,
  parents,
  children,
  childRefs,
  onSelect,
}: RelationshipGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const centralRef = useRef<HTMLDivElement>(null);
  const parentRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const childNodeRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const [lines, setLines] = useState<Line[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [showAllParents, setShowAllParents] = useState(false);
  const [showAllChildren, setShowAllChildren] = useState(false);

  const childRefMap = useMemo(() => {
    const m = new Map<string, ChildRef>();
    for (const cr of childRefs) m.set(cr.name, cr);
    return m;
  }, [childRefs]);

  const visibleParents = showAllParents ? parents : parents.slice(0, INITIAL_VISIBLE);
  const visibleChildren = showAllChildren ? children : children.slice(0, INITIAL_VISIBLE);
  const hiddenParentCount = parents.length - visibleParents.length;
  const hiddenChildCount = children.length - visibleChildren.length;

  // Reset expand state on element change
  const prevName = useRef(elementName);
  if (prevName.current !== elementName) {
    prevName.current = elementName;
    if (showAllParents) setShowAllParents(false);
    if (showAllChildren) setShowAllChildren(false);
  }

  const setParentRef = useCallback((name: string, el: HTMLButtonElement | null) => {
    if (el) parentRefs.current.set(name, el);
    else parentRefs.current.delete(name);
  }, []);

  const setChildRef = useCallback((name: string, el: HTMLButtonElement | null) => {
    if (el) childNodeRefs.current.set(name, el);
    else childNodeRefs.current.delete(name);
  }, []);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const central = centralRef.current;
    if (!container || !central) return;

    const computeLines = () => {
      const containerRect = container.getBoundingClientRect();
      const centralRect = central.getBoundingClientRect();
      const cx = centralRect.left + centralRect.width / 2 - containerRect.left;
      const cyTop = centralRect.top - containerRect.top;
      const cyBottom = centralRect.bottom - containerRect.top;

      const newLines: Line[] = [];

      for (const [name, el] of parentRefs.current) {
        const r = el.getBoundingClientRect();
        newLines.push({
          x1: r.left + r.width / 2 - containerRect.left,
          y1: r.bottom - containerRect.top,
          x2: cx,
          y2: cyTop,
          key: `p-${name}`,
        });
      }

      for (const [name, el] of childNodeRefs.current) {
        const r = el.getBoundingClientRect();
        newLines.push({
          x1: cx,
          y1: cyBottom,
          x2: r.left + r.width / 2 - containerRect.left,
          y2: r.top - containerRect.top,
          key: `c-${name}`,
        });
      }

      setLines(newLines);
    };

    // Use requestAnimationFrame to ensure layout is complete
    const raf = requestAnimationFrame(computeLines);
    const observer = new ResizeObserver(computeLines);
    observer.observe(container);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [visibleParents, visibleChildren, elementName]);

  if (parents.length === 0 && children.length === 0) return null;

  return (
    <div ref={containerRef} className="relative">
      {/* SVG Overlay for lines — hidden on mobile */}
      <svg
        className="pointer-events-none absolute inset-0 z-0 hidden h-full w-full md:block"
        aria-hidden="true"
      >
        {lines.map((line) => {
          const nodeKey = line.key.slice(2); // remove 'p-' or 'c-' prefix
          const isHighlighted = hoveredNode === nodeKey;
          const midY = (line.y1 + line.y2) / 2;
          return (
            <path
              key={line.key}
              d={`M ${line.x1} ${line.y1} C ${line.x1} ${midY}, ${line.x2} ${midY}, ${line.x2} ${line.y2}`}
              fill="none"
              className={`transition-colors motion-reduce:transition-none ${
                isHighlighted
                  ? 'stroke-primary-500'
                  : 'stroke-primary-200'
              }`}
              strokeWidth={isHighlighted ? 2 : 1.5}
            />
          );
        })}
      </svg>

      {/* Parents tier */}
      {parents.length > 0 && (
        <div className="relative z-10 mb-2">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400 md:hidden">
            Eltern
          </span>
          <div className="flex flex-wrap justify-center gap-2">
            {visibleParents.map((name) => (
              <button
                key={name}
                ref={(el) => setParentRef(name, el)}
                type="button"
                onClick={() => onSelect(name)}
                onMouseEnter={() => setHoveredNode(name)}
                onMouseLeave={() => setHoveredNode(null)}
                onFocus={() => setHoveredNode(name)}
                onBlur={() => setHoveredNode(null)}
                className="rounded-full bg-primary-100 px-2.5 py-1 text-xs font-medium text-primary-800 transition-colors hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-1"
                aria-label={`Eltern-Element ${name} anzeigen`}
              >
                &lt;{name}&gt;
              </button>
            ))}
            {hiddenParentCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAllParents(true)}
                className="rounded-full bg-surface-100 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-surface-200"
              >
                … und {hiddenParentCount} weitere
              </button>
            )}
          </div>
        </div>
      )}

      {/* Central node */}
      <div className="relative z-10 flex justify-center py-3">
        <div
          ref={centralRef}
          className="rounded-lg border-2 border-primary-400 bg-white px-4 py-2 shadow-sm"
        >
          <span className="text-sm font-bold text-primary-800">
            &lt;{elementName}&gt;
          </span>
        </div>
      </div>

      {/* Children tier */}
      {children.length > 0 && (
        <div className="relative z-10 mt-2">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400 md:hidden">
            Kinder
          </span>
          <div className="flex flex-wrap justify-center gap-2">
            {visibleChildren.map((name) => {
              const ref = childRefMap.get(name);
              const card = ref ? formatCardinality(ref) : undefined;
              return (
                <span key={name} className="inline-flex items-center gap-0.5">
                  <button
                    ref={(el) => setChildRef(name, el)}
                    type="button"
                    onClick={() => onSelect(name)}
                    onMouseEnter={() => setHoveredNode(name)}
                    onMouseLeave={() => setHoveredNode(null)}
                    onFocus={() => setHoveredNode(name)}
                    onBlur={() => setHoveredNode(null)}
                    className="rounded-full bg-primary-100 px-2.5 py-1 text-xs font-medium text-primary-800 transition-colors hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-1"
                    aria-label={`Kind-Element ${name} anzeigen${card ? `, Kardinalität ${card}` : ''}`}
                  >
                    &lt;{name}&gt;
                  </button>
                  {card && (
                    <span
                      className="inline-flex items-center rounded-full bg-amber-100 px-1 py-0.5 text-[10px] font-semibold text-amber-800"
                      title={cardinalityTooltip(card)}
                    >
                      {card}
                    </span>
                  )}
                </span>
              );
            })}
            {hiddenChildCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAllChildren(true)}
                className="rounded-full bg-surface-100 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-surface-200"
              >
                … und {hiddenChildCount} weitere
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
