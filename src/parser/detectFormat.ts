import type { SchemaFormat } from '../types/tei';

const XS_NS = 'http://www.w3.org/2001/XMLSchema';
const RNG_NS = 'http://relaxng.org/ns/structure/1.0';
const SCH_NS = 'http://purl.oclc.org/dml/schematron';
const SCH_ISO_NS = 'http://purl.oclc.org/dml/schematron'; // also check for iso variant
const TEI_NS = 'http://www.tei-c.org/ns/1.0';

export function detectFormat(content: string, fileName?: string): SchemaFormat {
  // Try XML-based detection first
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'application/xml');
    const root = doc.documentElement;

    if (root) {
      const ns = root.namespaceURI;
      const ln = root.localName;

      // XSD: <xs:schema> or <schema xmlns="...XMLSchema">
      if (ns === XS_NS || ln === 'schema' && content.includes('XMLSchema')) {
        return 'xsd';
      }

      // RelaxNG: <grammar xmlns="...relaxng...">
      if (ns === RNG_NS || ln === 'grammar' && content.includes('relaxng.org')) {
        return 'rng';
      }

      // Schematron: <schema xmlns="...schematron"> or <sch:schema>
      if (
        (ln === 'schema' && (ns === SCH_NS || ns === SCH_ISO_NS || content.includes('schematron'))) ||
        (ln === 'schema' && root.lookupPrefix(SCH_NS))
      ) {
        // Distinguish from XSD schema: check if it has schematron patterns
        if (root.getElementsByTagNameNS(SCH_NS, 'pattern').length > 0 ||
            root.getElementsByTagNameNS(SCH_ISO_NS, 'pattern').length > 0 ||
            root.querySelector('pattern')) {
          return 'schematron';
        }
      }

      // ODD: <TEI> with <schemaSpec> inside
      if (ln === 'TEI' || (ns === TEI_NS && ln === 'TEI')) {
        const schemaSpec = root.getElementsByTagNameNS(TEI_NS, 'schemaSpec')[0] ??
                           root.querySelector('schemaSpec');
        if (schemaSpec) {
          return 'odd';
        }
      }
    }
  } catch {
    // XML parsing failed, fall through to filename detection
  }

  // Fallback: detect from file extension
  if (fileName) {
    const ext = fileName.toLowerCase().split('.').pop();
    switch (ext) {
      case 'xsd': return 'xsd';
      case 'rng': return 'rng';
      case 'odd': return 'odd';
      case 'sch': return 'schematron';
    }
  }

  // Default to XSD for backward compatibility
  return 'xsd';
}
