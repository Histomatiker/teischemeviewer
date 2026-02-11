import { useCallback, useEffect, useRef } from 'react';
import { useSchemaDispatch, useSchemaState } from '../context/SchemaContext';
import type { SchemaFormat, TeiSchema } from '../types/tei';
import { parseXsd, deserializeSchema } from '../parser/xsdParser';
import { parseRng } from '../parser/relaxngParser';
import { parseOdd } from '../parser/oddParser';
import { parseSchematron, extractSchematronRules } from '../parser/schematronParser';
import { detectFormat } from '../parser/detectFormat';
import type { WorkerResponse } from '../parser/schemaParser.worker';

async function resolveImports(
  mainXsd: string,
  baseUrl: string
): Promise<string> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(mainXsd, 'application/xml');
  const imports = doc.querySelectorAll('import, *|import');

  const importedElements: string[] = [];

  for (const imp of Array.from(imports)) {
    const schemaLocation = imp.getAttribute('schemaLocation');
    if (!schemaLocation) continue;

    const url = new URL(schemaLocation, baseUrl).href;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const text = await res.text();
        const importDoc = parser.parseFromString(text, 'application/xml');
        const root = importDoc.documentElement;
        for (const child of Array.from(root.children)) {
          const ln = child.localName;
          if (
            ['element', 'complexType', 'simpleType', 'group', 'attributeGroup', 'attribute'].includes(ln)
          ) {
            importedElements.push(child.outerHTML);
          }
        }
      }
    } catch {
      // Ignore import failures
    }
  }

  if (importedElements.length === 0) return mainXsd;

  const closingTag = '</xs:schema>';
  const insertionPoint = mainXsd.lastIndexOf(closingTag);
  if (insertionPoint === -1) return mainXsd;

  return (
    mainXsd.slice(0, insertionPoint) +
    '\n<!-- Merged imports -->\n' +
    importedElements.join('\n') +
    '\n' +
    closingTag
  );
}

function parseOnMainThread(content: string, name: string, format: SchemaFormat): Promise<TeiSchema> {
  return new Promise<TeiSchema>((resolve, reject) => {
    setTimeout(() => {
      try {
        switch (format) {
          case 'xsd':
            resolve(parseXsd(content, name));
            break;
          case 'rng':
            resolve(parseRng(content, name));
            break;
          case 'odd':
            resolve(parseOdd(content, name));
            break;
          case 'schematron':
            resolve(parseSchematron(content, name));
            break;
          default:
            reject(new Error(`Unknown format: ${format}`));
        }
      } catch (err) {
        reject(err);
      }
    }, 0);
  });
}

export function useSchema() {
  const dispatch = useSchemaDispatch();
  const { schema: currentSchema } = useSchemaState();
  const workerRef = useRef<Worker | null>(null);
  const schemaRef = useRef<TeiSchema | null>(null);

  // Keep ref in sync without causing re-renders in dependents
  useEffect(() => {
    schemaRef.current = currentSchema;
  }, [currentSchema]);

  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  const parseWithFallback = useCallback(
    (content: string, name: string, format: SchemaFormat) => {
      dispatch({ type: 'PARSE_START' });

      let workerFailed = false;

      try {
        const worker = new Worker(
          new URL('../parser/schemaParser.worker.ts', import.meta.url),
          { type: 'module' }
        );
        workerRef.current = worker;

        worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
          if (e.data.type === 'success') {
            const schema = deserializeSchema(e.data.data);
            dispatch({ type: 'LOAD_SUCCESS', payload: schema });
            terminateWorker();
          } else {
            workerFailed = true;
            terminateWorker();
            parseOnMainThread(content, name, format)
              .then((schema) => {
                dispatch({ type: 'LOAD_SUCCESS', payload: schema });
              })
              .catch((err) => {
                dispatch({
                  type: 'LOAD_ERROR',
                  payload: err instanceof Error ? err.message : 'Parse error',
                });
              });
          }
        };

        worker.onerror = () => {
          if (workerFailed) return;
          terminateWorker();
          parseOnMainThread(content, name, format)
            .then((schema) => {
              dispatch({ type: 'LOAD_SUCCESS', payload: schema });
            })
            .catch((err) => {
              dispatch({
                type: 'LOAD_ERROR',
                payload: err instanceof Error ? err.message : 'Parse error',
              });
            });
        };

        worker.postMessage({ type: 'parse', content, schemaName: name, format });
      } catch {
        parseOnMainThread(content, name, format)
          .then((schema) => {
            dispatch({ type: 'LOAD_SUCCESS', payload: schema });
          })
          .catch((err) => {
            dispatch({
              type: 'LOAD_ERROR',
              payload: err instanceof Error ? err.message : 'Parse error',
            });
          });
      }
    },
    [dispatch, terminateWorker]
  );

  const loadSchema = useCallback(
    async (url: string, name: string) => {
      terminateWorker();
      dispatch({ type: 'FETCH_START' });

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch schema: ${response.statusText}`);
        }
        const content = await response.text();
        const format = detectFormat(content, url);

        if (format === 'xsd') {
          const baseUrl = new URL(url, window.location.href).href;
          const mergedXsd = await resolveImports(content, baseUrl);
          parseWithFallback(mergedXsd, name, 'xsd');
        } else {
          parseWithFallback(content, name, format);
        }
      } catch (err) {
        dispatch({
          type: 'LOAD_ERROR',
          payload: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
    [dispatch, terminateWorker, parseWithFallback]
  );

  const loadFromString = useCallback(
    (content: string, name: string, format?: SchemaFormat) => {
      terminateWorker();
      dispatch({ type: 'FETCH_START' });
      const detectedFormat = format ?? detectFormat(content, name);
      parseWithFallback(content, name, detectedFormat);
    },
    [dispatch, terminateWorker, parseWithFallback]
  );

  const mergeSchematron = useCallback(
    (schematronContent: string) => {
      const schema = schemaRef.current;
      if (!schema) return;

      try {
        const rules = extractSchematronRules(schematronContent);
        const merged: TeiSchema = {
          ...schema,
          schematronRules: [...schema.schematronRules, ...rules],
        };
        dispatch({ type: 'LOAD_SUCCESS', payload: merged });
      } catch (err) {
        dispatch({
          type: 'LOAD_ERROR',
          payload: err instanceof Error ? err.message : 'Schematron parse error',
        });
      }
    },
    [dispatch]
  );

  return { loadSchema, loadFromString, mergeSchematron };
}
