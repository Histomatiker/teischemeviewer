import { useState } from 'react';
import { predefinedSchemas } from '../../data/predefinedSchemas';
import { useSchema } from '../../hooks/useSchema';
import { useSchemaState } from '../../context/SchemaContext';
import { SchemaUpload } from './SchemaUpload';

export function SchemaSelector() {
  const { loadSchema } = useSchema();
  const { loadingState } = useSchemaState();
  const [selectedId, setSelectedId] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedId(id);
    const schema = predefinedSchemas.find((s) => s.id === id);
    if (schema) {
      loadSchema(schema.file, schema.name);
    }
  };

  const isLoading = loadingState === 'fetching' || loadingState === 'parsing';

  return (
    <div className="border-b border-surface-200 p-4">
      <label
        htmlFor="schema-select"
        className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500"
      >
        Schema wählen
      </label>
      <select
        id="schema-select"
        value={selectedId}
        onChange={handleChange}
        disabled={isLoading}
        className="w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-slate-800 transition-colors hover:border-primary-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50"
      >
        <option value="">— Schema auswählen —</option>
        {predefinedSchemas.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <SchemaUpload />
    </div>
  );
}
