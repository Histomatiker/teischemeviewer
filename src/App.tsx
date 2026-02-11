import { SchemaProvider, useSchemaState } from './context/SchemaContext';
import { MainLayout } from './components/layout/MainLayout';
import { SchemaSelector } from './components/schema/SchemaSelector';
import { LoadingSpinner } from './components/schema/LoadingSpinner';
import { SearchBar } from './components/elements/SearchBar';
import { ElementList } from './components/elements/ElementList';
import { ElementDetail } from './components/elements/ElementDetail';

function AppContent() {
  const { loadingState, selectedElement } = useSchemaState();
  const isReady = loadingState === 'ready';

  const sidebar = (
    <div className="flex h-full flex-col">
      <SchemaSelector />
      {isReady && (
        <>
          <SearchBar />
          <ElementList />
        </>
      )}
      {!isReady && <LoadingSpinner />}
    </div>
  );

  return (
    <MainLayout sidebar={sidebar}>
      {isReady && selectedElement ? (
        <ElementDetail />
      ) : isReady ? (
        <div className="flex h-full items-center justify-center">
          <p className="text-center text-slate-500">
            Wähle ein Element aus der Liste, um Details anzuzeigen.
          </p>
        </div>
      ) : loadingState === 'idle' ? (
        <div className="flex h-full items-center justify-center">
          <div className="max-w-md text-center">
            <svg
              className="mx-auto mb-4 h-16 w-16 text-primary-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            <h2 className="mb-2 text-lg font-semibold text-slate-700">
              TEI Schema Viewer
            </h2>
            <p className="text-sm text-slate-500">
              Wähle ein TEI-Schema aus der Seitenleiste oder lade eine eigene
              XSD-Datei hoch, um die Elementstruktur interaktiv zu erkunden.
            </p>
          </div>
        </div>
      ) : (
        <LoadingSpinner />
      )}
    </MainLayout>
  );
}

function App() {
  return (
    <SchemaProvider>
      <AppContent />
    </SchemaProvider>
  );
}

export default App;
