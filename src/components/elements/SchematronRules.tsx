import type { SchematronRule } from '../../types/tei';

interface SchematronRulesProps {
  rules: SchematronRule[];
}

export function SchematronRules({ rules }: SchematronRulesProps) {
  if (rules.length === 0) return null;

  return (
    <div className="space-y-3">
      {rules.map((rule, i) => (
        <div
          key={`${rule.id}-${i}`}
          className={`rounded-lg border p-3 ${
            rule.type === 'assert'
              ? 'border-amber-200 bg-amber-50'
              : 'border-blue-200 bg-blue-50'
          }`}
        >
          <div className="mb-1 flex items-start gap-2">
            <span className="mt-0.5 text-sm">
              {rule.type === 'assert' ? '\u26A0' : '\u2139'}
            </span>
            <p className={`text-sm font-medium ${
              rule.type === 'assert' ? 'text-amber-900' : 'text-blue-900'
            }`}>
              {rule.message || '(no message)'}
            </p>
          </div>
          <div className="ml-6 space-y-1 text-xs">
            <div className={rule.type === 'assert' ? 'text-amber-700' : 'text-blue-700'}>
              <span className="font-medium">{rule.type}:</span>{' '}
              <code className={`rounded px-1 py-0.5 ${
                rule.type === 'assert' ? 'bg-amber-100' : 'bg-blue-100'
              }`}>
                {rule.test}
              </code>
            </div>
            <div className={rule.type === 'assert' ? 'text-amber-600' : 'text-blue-600'}>
              <span className="font-medium">context:</span> {rule.context}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
