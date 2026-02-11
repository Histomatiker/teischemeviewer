export interface PredefinedSchema {
  id: string;
  name: string;
  description: string;
  file: string;
}

const base = import.meta.env.BASE_URL;

export const predefinedSchemas: PredefinedSchema[] = [
  {
    id: 'tei_all',
    name: 'TEI All',
    description: 'Complete TEI schema with all modules',
    file: `${base}schemas/tei_all.xsd`,
  },
  {
    id: 'tei_lite',
    name: 'TEI Lite',
    description: 'Lightweight subset for common use cases',
    file: `${base}schemas/tei_lite.xsd`,
  },
  {
    id: 'tei_bare',
    name: 'TEI Bare',
    description: 'Minimal TEI schema',
    file: `${base}schemas/tei_bare.xsd`,
  },
  {
    id: 'tei_ms',
    name: 'TEI Manuscript',
    description: 'Schema for manuscript descriptions',
    file: `${base}schemas/tei_ms.xsd`,
  },
  {
    id: 'tei_speech',
    name: 'TEI Speech',
    description: 'Schema for transcribed speech',
    file: `${base}schemas/tei_speech.xsd`,
  },
  {
    id: 'tei_corpus',
    name: 'TEI Corpus',
    description: 'Schema for corpus linguistics',
    file: `${base}schemas/tei_corpus.xsd`,
  },
];
