import { useCallback, useMemo } from 'react';
import { useSchemaState, useSchemaDispatch } from '../context/SchemaContext';

export function useNavigation() {
  const { selectedElement, history, historyIndex, schema } = useSchemaState();
  const dispatch = useSchemaDispatch();

  const selectElement = useCallback(
    (name: string) => {
      dispatch({ type: 'SELECT_ELEMENT', payload: name });
    },
    [dispatch]
  );

  const goBack = useCallback(() => {
    dispatch({ type: 'GO_BACK' });
  }, [dispatch]);

  const goForward = useCallback(() => {
    dispatch({ type: 'GO_FORWARD' });
  }, [dispatch]);

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  // Build hierarchical breadcrumbs by walking up parent chain
  const breadcrumbs = useMemo(() => {
    if (!selectedElement) return [];
    if (!schema) return [selectedElement];

    const path: string[] = [selectedElement];
    const visited = new Set<string>([selectedElement]);
    const historySet = new Set(history.slice(0, historyIndex + 1));
    let current = selectedElement;

    while (true) {
      const el = schema.elements.get(current);
      if (!el || el.parents.length === 0) break;

      // Prefer a parent the user actually navigated through
      let next = el.parents.find((p) => historySet.has(p) && !visited.has(p));
      if (!next) {
        next = el.parents.find((p) => !visited.has(p));
      }
      if (!next) break;

      visited.add(next);
      path.unshift(next);
      current = next;
    }

    return path;
  }, [schema, selectedElement, history, historyIndex]);

  return {
    selectedElement,
    selectElement,
    goBack,
    goForward,
    canGoBack,
    canGoForward,
    breadcrumbs,
  };
}
