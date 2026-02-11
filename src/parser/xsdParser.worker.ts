import { parseXsd, serializeSchema } from './xsdParser';

export type WorkerRequest = {
  type: 'parse';
  xsdString: string;
  schemaName: string;
};

export type WorkerResponse =
  | { type: 'success'; data: ReturnType<typeof serializeSchema> }
  | { type: 'error'; message: string };

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { xsdString, schemaName } = e.data;
  try {
    const schema = parseXsd(xsdString, schemaName);
    const serialized = serializeSchema(schema);
    self.postMessage({ type: 'success', data: serialized } satisfies WorkerResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown parsing error';
    self.postMessage({ type: 'error', message } satisfies WorkerResponse);
  }
};
