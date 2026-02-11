import { useMemo, useRef, useEffect, useCallback } from 'react';
import { useSchemaState, useSchemaDispatch } from '../context/SchemaContext';

export function useSearch() {
  const { schema, searchQuery } = useSchemaState();
  const dispatch = useSchemaDispatch();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const setSearch = useCallback(
    (query: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        dispatch({ type: 'SET_SEARCH', payload: query });
      }, 150);
    },
    [dispatch]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const filteredElements = useMemo(() => {
    if (!schema) return [];
    if (!searchQuery.trim()) return schema.elementNames;
    const q = searchQuery.toLowerCase().trim();
    return schema.elementNames.filter((name) =>
      name.toLowerCase().includes(q)
    );
  }, [schema, searchQuery]);

  return { searchQuery, setSearch, filteredElements };
}
