import {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';
import type { SchemaState, SchemaAction } from '../types/tei';

const initialState: SchemaState = {
  schema: null,
  loadingState: 'idle',
  error: null,
  selectedElement: null,
  searchQuery: '',
  history: [],
  historyIndex: -1,
};

function schemaReducer(state: SchemaState, action: SchemaAction): SchemaState {
  switch (action.type) {
    case 'FETCH_START':
      return {
        ...state,
        loadingState: 'fetching',
        error: null,
        schema: null,
        selectedElement: null,
        history: [],
        historyIndex: -1,
        searchQuery: '',
      };
    case 'PARSE_START':
      return { ...state, loadingState: 'parsing' };
    case 'LOAD_SUCCESS':
      return {
        ...state,
        loadingState: 'ready',
        schema: action.payload,
        error: null,
      };
    case 'LOAD_ERROR':
      return {
        ...state,
        loadingState: 'error',
        error: action.payload,
        schema: null,
      };
    case 'SELECT_ELEMENT': {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(action.payload);
      return {
        ...state,
        selectedElement: action.payload,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.payload };
    case 'GO_BACK': {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      return {
        ...state,
        historyIndex: newIndex,
        selectedElement: state.history[newIndex],
      };
    }
    case 'GO_FORWARD': {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      return {
        ...state,
        historyIndex: newIndex,
        selectedElement: state.history[newIndex],
      };
    }
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

const SchemaStateContext = createContext<SchemaState>(initialState);
const SchemaDispatchContext = createContext<Dispatch<SchemaAction>>(() => {});

export function SchemaProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(schemaReducer, initialState);

  return (
    <SchemaStateContext.Provider value={state}>
      <SchemaDispatchContext.Provider value={dispatch}>
        {children}
      </SchemaDispatchContext.Provider>
    </SchemaStateContext.Provider>
  );
}

export function useSchemaState() {
  return useContext(SchemaStateContext);
}

export function useSchemaDispatch() {
  return useContext(SchemaDispatchContext);
}
