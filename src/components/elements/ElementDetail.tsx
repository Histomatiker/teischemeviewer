import { useMemo } from 'react';
import { useSchemaState } from '../../context/SchemaContext';
import { useNavigation } from '../../hooks/useNavigation';
import { Card } from '../ui/Card';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { Button } from '../ui/Button';
import { ElementBadge } from './ElementBadge';
import { AttributeList } from '../hierarchy/AttributeList';
import { ParentChildTree, formatCardinality, cardinalityTooltip } from '../hierarchy/ParentChildTree';
import { RelationshipGraph } from '../hierarchy/RelationshipGraph';
import { SchematronRules } from './SchematronRules';
import { getRulesForElement } from '../../parser/schematronParser';
import type { ChildRef } from '../../types/tei';

export function ElementDetail() {
  const { schema } = useSchemaState();
  const {
    selectedElement,
    selectElement,
    goBack,
    goForward,
    canGoBack,
    canGoForward,
    breadcrumbs,
  } = useNavigation();

  if (!schema || !selectedElement) {
    return null;
  }

  // Build a map: parentName → cardinality string for the current element in that parent
  const parentCardinalityMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!schema || !selectedElement) return map;
    const el = schema.elements.get(selectedElement);
    if (!el) return map;
    for (const parentName of el.parents) {
      const parentEl = schema.elements.get(parentName);
      if (!parentEl) continue;
      const ref = parentEl.childRefs.find((cr: ChildRef) => cr.name === selectedElement);
      if (ref) {
        const card = formatCardinality(ref);
        if (card) map.set(parentName, card);
      }
    }
    return map;
  }, [schema, selectedElement]);

  const element = schema.elements.get(selectedElement);
  if (!element) {
    return (
      <div className="p-4 text-sm text-slate-500">
        Element &quot;{selectedElement}&quot; nicht gefunden.
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* Navigation */}
      <div className="mb-4 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={goBack}
          disabled={!canGoBack}
          aria-label="Zurück"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={goForward}
          disabled={!canGoForward}
          aria-label="Vorwärts"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>

      <Breadcrumbs items={breadcrumbs} onNavigate={selectElement} />

      {/* ODD Customization Banner */}
      {schema.format === 'odd' && (
        <Card className="mb-4 border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-slate-400">{'\u2139\uFE0F'}</span>
            <p className="text-sm text-slate-600">
              <span className="font-medium">ODD-Customization</span> — Eltern/Kind-Beziehungen nicht
              verfügbar. Für ein vollständiges Schema die kompilierte RNG-Datei verwenden.
            </p>
          </div>
        </Card>
      )}

      {/* Element Header */}
      <Card className="mb-4 p-5">
        <h2 className="mb-1 text-xl font-bold text-slate-800">
          &lt;{element.name}&gt;
        </h2>
        {element.documentation && (
          <p className="text-sm leading-relaxed text-slate-600">
            {element.documentation}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="rounded bg-surface-100 px-2 py-0.5">
            Inhalt: {element.contentType}
          </span>
          {element.children.length > 0 && (
            <span className="rounded bg-surface-100 px-2 py-0.5">
              {element.children.length} Kind-Element{element.children.length !== 1 ? 'e' : ''}
            </span>
          )}
          {element.parents.length > 0 && (
            <span className="rounded bg-surface-100 px-2 py-0.5">
              {element.parents.length} Eltern-Element{element.parents.length !== 1 ? 'e' : ''}
            </span>
          )}
          {element.attributes.length > 0 && (
            <span className="rounded bg-surface-100 px-2 py-0.5">
              {element.attributes.length} Attribut{element.attributes.length !== 1 ? 'e' : ''}
            </span>
          )}
        </div>
      </Card>

      {/* Relationship Graph */}
      {(element.parents.length > 0 || element.children.length > 0) && (
        <Card className="mb-4 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Beziehungen
          </h3>
          <RelationshipGraph
            elementName={element.name}
            parents={element.parents}
            children={element.children}
            childRefs={element.childRefs}
            onSelect={selectElement}
          />
        </Card>
      )}

      {/* Attributes */}
      {element.attributes.length > 0 && (
        <Card className="mb-4 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Attribute
          </h3>
          <AttributeList attributes={element.attributes} />
        </Card>
      )}

      {/* Parents */}
      {element.parents.length > 0 && (
        <Card className="mb-4 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Eltern-Elemente
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {element.parents.map((p) => {
              const card = parentCardinalityMap.get(p);
              return (
                <span key={p} className="inline-flex items-center gap-1">
                  <ElementBadge
                    name={p}
                    variant="element"
                    onClick={() => selectElement(p)}
                  />
                  {card && (
                    <span
                      className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800"
                      title={cardinalityTooltip(card)}
                    >
                      {card}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </Card>
      )}

      {/* Children */}
      {element.children.length > 0 && (
        <Card className="mb-4 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Kind-Elemente
          </h3>
          <ParentChildTree
            elementNames={element.children}
            onSelect={selectElement}
            childRefs={element.childRefs}
          />
        </Card>
      )}

      {/* Member Of (Model Classes) */}
      {element.memberOf.length > 0 && (
        <Card className="mb-4 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Modellklassen
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {element.memberOf.map((c) => (
              <ElementBadge key={c} name={c} variant="class" />
            ))}
          </div>
        </Card>
      )}

      {/* Attribute Classes */}
      {element.attributeClasses.length > 0 && (
        <Card className="mb-4 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Attributklassen
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {element.attributeClasses.map((c) => (
              <ElementBadge key={c} name={c} variant="class" />
            ))}
          </div>
        </Card>
      )}

      {/* Schematron Rules */}
      {schema.schematronRules.length > 0 && (() => {
        const elementRules = getRulesForElement(schema.schematronRules, element.name);
        if (elementRules.length === 0) return null;
        return (
          <Card className="mb-4 p-5">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Validierungsregeln
            </h3>
            <SchematronRules rules={elementRules} />
          </Card>
        );
      })()}
    </div>
  );
}
