import { useCallback, useRef, useState } from 'react';
import { useSchema } from '../../hooks/useSchema';
import { useSchemaState } from '../../context/SchemaContext';

export function SchemaUpload() {
  const { loadFromString, mergeSchematron } = useSchema();
  const { loadingState, schema } = useSchemaState();
  const inputRef = useRef<HTMLInputElement>(null);
  const schemaRef = useRef(schema);
  schemaRef.current = schema;
  const [fileName, setFileName] = useState<string | null>(null);

  const isLoading = loadingState === 'fetching' || loadingState === 'parsing';

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        const name = file.name.replace(/\.(xsd|rng|odd|sch|xml)$/i, '');

        if (schemaRef.current && file.name.toLowerCase().endsWith('.sch')) {
          mergeSchematron(text);
        } else {
          loadFromString(text, name);
        }
      };
      reader.readAsText(file);

      if (inputRef.current) inputRef.current.value = '';
    },
    [loadFromString, mergeSchematron]
  );

  return (
    <div className="mt-3">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
        Oder eigene Schema-Datei
      </span>
      <label
        className={`flex w-full cursor-pointer items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-medium text-primary-700 transition-colors hover:border-primary-300 hover:bg-primary-50 ${isLoading ? 'pointer-events-none opacity-50' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xsd,.xml,.rng,.odd,.sch"
          onChange={handleFileChange}
          disabled={isLoading}
          className="sr-only"
        />
        Datei auswählen (.xsd, .rng, .odd, .sch)
      </label>
      {fileName && (
        <p className="mt-1.5 truncate text-xs text-slate-500">
          {fileName}
        </p>
      )}
    </div>
  );
}
