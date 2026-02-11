import { useSchemaState } from '../../context/SchemaContext';

export function LoadingSpinner() {
  const { loadingState, error } = useSchemaState();

  if (loadingState === 'idle') {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-center text-slate-500">
          Wähle ein TEI-Schema aus der Liste oder lade eine eigene XSD-Datei
          hoch, um die Elementstruktur zu erkunden.
        </p>
      </div>
    );
  }

  if (loadingState === 'error') {
    return (
      <div className="flex flex-1 items-center justify-center p-8" role="alert">
        <div className="text-center">
          <div className="mb-2 text-red-500">
            <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="font-medium text-red-700">Fehler beim Laden</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (loadingState === 'fetching' || loadingState === 'parsing') {
    return (
      <div
        className="flex flex-1 items-center justify-center p-8"
        role="status"
        aria-live="polite"
      >
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-surface-300 border-t-primary-600" />
          <p className="text-sm text-slate-600">
            {loadingState === 'fetching'
              ? 'Schema wird geladen...'
              : 'Verarbeitung läuft...'}
          </p>
        </div>
      </div>
    );
  }

  return null;
}
