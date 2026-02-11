export type CompositorType = 'sequence' | 'choice' | 'all';

export type SchemaFormat = 'xsd' | 'rng' | 'odd' | 'schematron';

export interface SchematronRule {
  id: string;
  context: string;
  test: string;
  message: string;
  type: 'assert' | 'report';
}

export interface ChildRef {
  name: string;
  minOccurs: number;
  maxOccurs: number | 'unbounded';
  compositor: CompositorType;
}

export interface TeiAttribute {
  name: string;
  documentation: string;
  dataType: string;
  required: boolean;
  values?: string[];
  fromClass?: string;
}

export interface TeiElement {
  name: string;
  documentation: string;
  parents: string[];
  children: string[];
  childRefs: ChildRef[];
  attributes: TeiAttribute[];
  contentType: string;
  memberOf: string[];
  attributeClasses: string[];
}

export interface TeiSchema {
  name: string;
  format: SchemaFormat;
  elements: Map<string, TeiElement>;
  modelClasses: Map<string, string[]>;
  attributeClasses: Map<string, TeiAttribute[]>;
  elementNames: string[];
  schematronRules: SchematronRule[];
}

export type SchemaLoadingState = 'idle' | 'fetching' | 'parsing' | 'ready' | 'error';

export interface SchemaState {
  schema: TeiSchema | null;
  loadingState: SchemaLoadingState;
  error: string | null;
  selectedElement: string | null;
  searchQuery: string;
  history: string[];
  historyIndex: number;
}

export type SchemaAction =
  | { type: 'FETCH_START' }
  | { type: 'PARSE_START' }
  | { type: 'LOAD_SUCCESS'; payload: TeiSchema }
  | { type: 'LOAD_ERROR'; payload: string }
  | { type: 'SELECT_ELEMENT'; payload: string }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'GO_BACK' }
  | { type: 'GO_FORWARD' }
  | { type: 'RESET' };

export interface SerializedTeiSchema {
  name: string;
  format: SchemaFormat;
  elements: Record<string, TeiElement>;
  modelClasses: Record<string, string[]>;
  attributeClasses: Record<string, TeiAttribute[]>;
  elementNames: string[];
  schematronRules: SchematronRule[];
}
