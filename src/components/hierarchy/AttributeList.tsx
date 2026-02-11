import type { TeiAttribute } from '../../types/tei';
import { Badge } from '../ui/Badge';

interface AttributeListProps {
  attributes: TeiAttribute[];
}

export function AttributeList({ attributes }: AttributeListProps) {
  return (
    <div className="space-y-2">
      {attributes.map((attr) => (
        <div
          key={attr.name}
          className="rounded-lg border border-surface-200 px-3 py-2"
        >
          <div className="flex items-start gap-2">
            <code className="text-sm font-semibold text-purple-700">
              @{attr.name}
            </code>
            {attr.required && (
              <Badge variant="attribute">required</Badge>
            )}
            {attr.fromClass && (
              <Badge variant="class">{attr.fromClass}</Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>Typ: {attr.dataType}</span>
            {attr.values && attr.values.length > 0 && (
              <span>
                Werte: {attr.values.join(' | ')}
              </span>
            )}
          </div>
          {attr.documentation && (
            <p className="mt-1 text-xs text-slate-600">{attr.documentation}</p>
          )}
        </div>
      ))}
    </div>
  );
}
