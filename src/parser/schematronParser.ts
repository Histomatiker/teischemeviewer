import type { TeiSchema, SchematronRule } from '../types/tei';

const SCH_NS = 'http://purl.oclc.org/dml/schematron';

function findElements(doc: Document, localName: string): Element[] {
  // Try namespace-qualified first, then fallback to local name
  const nsResults = doc.getElementsByTagNameNS(SCH_NS, localName);
  if (nsResults.length > 0) return Array.from(nsResults);

  // Fallback: querySelector for prefixed or unprefixed
  const results = doc.querySelectorAll(localName);
  return Array.from(results);
}

export function extractSchematronRules(schContent: string): SchematronRule[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(schContent, 'application/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`Schematron parse error: ${parseError.textContent}`);
  }

  const rules: SchematronRule[] = [];

  // Find all <pattern> elements
  const patterns = findElements(doc, 'pattern');
  for (const pattern of patterns) {
    const patternId = pattern.getAttribute('id') ?? pattern.getAttribute('name') ?? '';

    // Find <rule> elements within this pattern
    const ruleElements = pattern.getElementsByTagNameNS(SCH_NS, 'rule');
    const ruleArray = ruleElements.length > 0
      ? Array.from(ruleElements)
      : Array.from(pattern.querySelectorAll('rule'));

    for (const rule of ruleArray) {
      const context = rule.getAttribute('context') ?? '';

      // Find <assert> elements
      const asserts = rule.getElementsByTagNameNS(SCH_NS, 'assert');
      const assertArray = asserts.length > 0
        ? Array.from(asserts)
        : Array.from(rule.querySelectorAll('assert'));

      for (const a of assertArray) {
        rules.push({
          id: patternId,
          context,
          test: a.getAttribute('test') ?? '',
          message: (a.textContent ?? '').trim().replace(/\s+/g, ' '),
          type: 'assert',
        });
      }

      // Find <report> elements
      const reports = rule.getElementsByTagNameNS(SCH_NS, 'report');
      const reportArray = reports.length > 0
        ? Array.from(reports)
        : Array.from(rule.querySelectorAll('report'));

      for (const r of reportArray) {
        rules.push({
          id: patternId,
          context,
          test: r.getAttribute('test') ?? '',
          message: (r.textContent ?? '').trim().replace(/\s+/g, ' '),
          type: 'report',
        });
      }
    }
  }

  return rules;
}

/**
 * Extract the element name from a Schematron context XPath.
 * Examples:
 *   "tei:add" → "add"
 *   "tei:*[@subtype]" → "*"
 *   "tei:div[@type='chapter']" → "div"
 */
function extractElementFromContext(context: string): string | null {
  // Match tei:elementName or just elementName
  const match = context.match(/(?:tei:|teiHeader:|TEI:)?([a-zA-Z*][\w]*)/);
  return match ? match[1] : null;
}

/**
 * Get rules that apply to a specific element.
 */
export function getRulesForElement(rules: SchematronRule[], elementName: string): SchematronRule[] {
  return rules.filter((rule) => {
    const ctxElement = extractElementFromContext(rule.context);
    if (!ctxElement) return false;
    // Match exact element name or wildcard
    return ctxElement === elementName || ctxElement === '*';
  });
}

/**
 * Parse Schematron as a standalone schema (no element definitions, only rules).
 */
export function parseSchematron(schContent: string, schemaName: string): TeiSchema {
  const rules = extractSchematronRules(schContent);

  // Build a minimal element map from rule contexts
  const elements = new Map<string, import('../types/tei').TeiElement>();
  const seenElements = new Set<string>();

  for (const rule of rules) {
    const elName = extractElementFromContext(rule.context);
    if (elName && elName !== '*' && !seenElements.has(elName)) {
      seenElements.add(elName);
      elements.set(elName, {
        name: elName,
        documentation: `Element referenced in Schematron rules`,
        parents: [],
        children: [],
        childRefs: [],
        attributes: [],
        contentType: 'unknown',
        memberOf: [],
        attributeClasses: [],
      });
    }
  }

  return {
    name: schemaName,
    format: 'schematron',
    elements,
    modelClasses: new Map(),
    attributeClasses: new Map(),
    elementNames: [...elements.keys()].sort(),
    schematronRules: rules,
  };
}
