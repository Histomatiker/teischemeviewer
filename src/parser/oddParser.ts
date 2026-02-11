import type {
  TeiAttribute,
  TeiElement,
  TeiSchema,
} from '../types/tei';

const TEI_NS = 'http://www.tei-c.org/ns/1.0';

function getDesc(node: Element, preferLang = 'de'): string {
  const descs = node.getElementsByTagNameNS(TEI_NS, 'desc');
  let fallback = '';
  for (const d of Array.from(descs)) {
    // Only direct child descs
    if (d.parentElement !== node) continue;
    const lang = d.getAttribute('xml:lang') ?? d.getAttribute('lang') ?? '';
    if (lang === preferLang) {
      return (d.textContent ?? '').trim().replace(/\s+/g, ' ');
    }
    if (!fallback || lang === 'en') {
      fallback = (d.textContent ?? '').trim().replace(/\s+/g, ' ');
    }
  }
  return fallback;
}

function getGloss(node: Element, preferLang = 'de'): string {
  const glosses = node.getElementsByTagNameNS(TEI_NS, 'gloss');
  let fallback = '';
  for (const g of Array.from(glosses)) {
    if (g.parentElement !== node) continue;
    const lang = g.getAttribute('xml:lang') ?? g.getAttribute('lang') ?? '';
    if (lang === preferLang) {
      return (g.textContent ?? '').trim().replace(/\s+/g, ' ');
    }
    if (!fallback || lang === 'en') {
      fallback = (g.textContent ?? '').trim().replace(/\s+/g, ' ');
    }
  }
  return fallback;
}

export function parseOdd(oddString: string, schemaName: string): TeiSchema {
  const parser = new DOMParser();
  const doc = parser.parseFromString(oddString, 'application/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`ODD parse error: ${parseError.textContent}`);
  }

  // Find <schemaSpec>
  const schemaSpec = doc.getElementsByTagNameNS(TEI_NS, 'schemaSpec')[0] ??
                     doc.querySelector('schemaSpec');
  if (!schemaSpec) {
    throw new Error('No <schemaSpec> found in ODD file');
  }

  const elements = new Map<string, TeiElement>();
  const modelClasses = new Map<string, string[]>();
  const attributeClasses = new Map<string, TeiAttribute[]>();

  // Track class memberships for reverse lookup
  const elementClasses = new Map<string, string[]>();

  // Process <elementSpec> elements
  const elementSpecs = schemaSpec.getElementsByTagNameNS(TEI_NS, 'elementSpec');
  for (const elSpec of Array.from(elementSpecs)) {
    const ident = elSpec.getAttribute('ident');
    if (!ident) continue;

    const mode = elSpec.getAttribute('mode') ?? 'add';
    if (mode === 'delete') continue;

    const module = elSpec.getAttribute('module') ?? '';
    const desc = getDesc(elSpec);
    const gloss = getGloss(elSpec);
    const documentation = gloss ? `${gloss}: ${desc}` : desc;

    // Extract attributes from <attList>
    const attributes: TeiAttribute[] = [];
    const attLists = elSpec.getElementsByTagNameNS(TEI_NS, 'attList');
    for (const attList of Array.from(attLists)) {
      const attDefs = attList.getElementsByTagNameNS(TEI_NS, 'attDef');
      for (const attDef of Array.from(attDefs)) {
        const attrName = attDef.getAttribute('ident');
        if (!attrName) continue;

        const attrMode = attDef.getAttribute('mode') ?? 'add';
        if (attrMode === 'delete') continue;

        const usage = attDef.getAttribute('usage') ?? 'opt';
        const attrDesc = getDesc(attDef);

        // Extract values from <valList>
        const values: string[] = [];
        const valList = attDef.getElementsByTagNameNS(TEI_NS, 'valList')[0];
        if (valList) {
          const valItems = valList.getElementsByTagNameNS(TEI_NS, 'valItem');
          for (const vi of Array.from(valItems)) {
            const val = vi.getAttribute('ident');
            if (val) values.push(val);
          }
        }

        // Extract datatype
        let dataType = 'string';
        const dataRef = attDef.getElementsByTagNameNS(TEI_NS, 'dataRef')[0];
        if (dataRef) {
          dataType = dataRef.getAttribute('name') ?? dataRef.getAttribute('key') ?? 'string';
        }

        attributes.push({
          name: attrName,
          documentation: attrDesc,
          dataType: values.length > 0 ? 'enumeration' : dataType,
          required: usage === 'req',
          values: values.length > 0 ? values : undefined,
        });
      }
    }

    // Extract class memberships
    const memberOfClasses: string[] = [];
    const classesNode = elSpec.getElementsByTagNameNS(TEI_NS, 'classes')[0];
    if (classesNode) {
      const memberOfs = classesNode.getElementsByTagNameNS(TEI_NS, 'memberOf');
      for (const mo of Array.from(memberOfs)) {
        const key = mo.getAttribute('key');
        if (key) memberOfClasses.push(key);
      }
    }

    const modelMembership = memberOfClasses.filter((c) => c.startsWith('model.'));
    const attrMembership = memberOfClasses.filter((c) => c.startsWith('att.'));

    elementClasses.set(ident, memberOfClasses);

    elements.set(ident, {
      name: ident,
      documentation,
      parents: [],    // ODD doesn't provide parent/child relationships
      children: [],
      childRefs: [],
      attributes: attributes.sort((a, b) => a.name.localeCompare(b.name)),
      contentType: module ? `module: ${module}` : 'unknown',
      memberOf: modelMembership.sort(),
      attributeClasses: attrMembership.sort(),
    });
  }

  // Process <classSpec> for model and attribute classes
  const classSpecs = schemaSpec.getElementsByTagNameNS(TEI_NS, 'classSpec');
  for (const cs of Array.from(classSpecs)) {
    const ident = cs.getAttribute('ident');
    const type = cs.getAttribute('type');
    if (!ident) continue;

    if (type === 'model') {
      // Find all elements that are members of this class
      const members: string[] = [];
      for (const [elName, classes] of elementClasses) {
        if (classes.includes(ident)) {
          members.push(elName);
        }
      }
      modelClasses.set(ident, members.sort());
    } else if (type === 'atts') {
      // Extract attributes from the classSpec
      const attrs: TeiAttribute[] = [];
      const attLists = cs.getElementsByTagNameNS(TEI_NS, 'attList');
      for (const attList of Array.from(attLists)) {
        const attDefs = attList.getElementsByTagNameNS(TEI_NS, 'attDef');
        for (const attDef of Array.from(attDefs)) {
          const attrName = attDef.getAttribute('ident');
          if (!attrName) continue;
          const attrDesc = getDesc(attDef);
          const usage = attDef.getAttribute('usage') ?? 'opt';

          const values: string[] = [];
          const valList = attDef.getElementsByTagNameNS(TEI_NS, 'valList')[0];
          if (valList) {
            const valItems = valList.getElementsByTagNameNS(TEI_NS, 'valItem');
            for (const vi of Array.from(valItems)) {
              const val = vi.getAttribute('ident');
              if (val) values.push(val);
            }
          }

          attrs.push({
            name: attrName,
            documentation: attrDesc,
            dataType: values.length > 0 ? 'enumeration' : 'string',
            required: usage === 'req',
            values: values.length > 0 ? values : undefined,
            fromClass: ident,
          });
        }
      }
      if (attrs.length > 0) {
        attributeClasses.set(ident, attrs);
      }
    }
  }

  const elementNames = [...elements.keys()].sort();

  return {
    name: schemaName,
    format: 'odd',
    elements,
    modelClasses,
    attributeClasses,
    elementNames,
    schematronRules: [],
  };
}
