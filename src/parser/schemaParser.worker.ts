import type { SchemaFormat } from '../types/tei';
import { parseXsd, serializeSchema } from './xsdParser';
import { parseRng } from './relaxngParser';
import { parseOdd } from './oddParser';
import { parseSchematron } from './schematronParser';

export type WorkerRequest = {
  type: 'parse';
  content: string;
  schemaName: string;
  format: SchemaFormat;
};

export type WorkerResponse =
  | { type: 'success'; data: ReturnType<typeof serializeSchema> }
  | { type: 'error'; message: string };

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { content, schemaName, format } = e.data;
  try {
    let schema;
    switch (format) {
      case 'xsd':
        schema = parseXsd(content, schemaName);
        break;
      case 'rng':
        schema = parseRng(content, schemaName);
        break;
      case 'odd':
        schema = parseOdd(content, schemaName);
        break;
      case 'schematron':
        schema = parseSchematron(content, schemaName);
        break;
      default:
        throw new Error(`Unknown schema format: ${format}`);
    }
    const serialized = serializeSchema(schema);
    self.postMessage({ type: 'success', data: serialized } satisfies WorkerResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown parsing error';
    self.postMessage({ type: 'error', message } satisfies WorkerResponse);
  }
};
