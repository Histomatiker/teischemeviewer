import type {
  TeiAttribute,
  TeiElement,
  TeiSchema,
  ChildRef,
  CompositorType,
} from '../types/tei';

const RNG_NS = 'http://relaxng.org/ns/structure/1.0';
const A_NS = 'http://relaxng.org/ns/compatibility/annotations/1.0';
const TEI_NS = 'http://www.tei-c.org/ns/1.0';

// --- Helpers ---

function localName(el: Element): string {
  return el.localName;
}

function isRng(el: Element, name: string): boolean {
  return (el.namespaceURI === RNG_NS || !el.namespaceURI) && localName(el) === name;
}

function getDocumentation(node: Element): string {
  // Try <a:documentation> annotation
  for (const child of Array.from(node.children)) {
    if (
      (child.namespaceURI === A_NS && localName(child) === 'documentation') ||
      localName(child) === 'a:documentation'
    ) {
      return (child.textContent ?? '').trim().replace(/\s+/g, ' ');
    }
  }
  // Also check for tei:desc
  for (const child of Array.from(node.children)) {
    if (
      (child.namespaceURI === TEI_NS && localName(child) === 'desc') ||
      localName(child) === 'desc'
    ) {
      return (child.textContent ?? '').trim().replace(/\s+/g, ' ');
    }
  }
  return '';
}

// --- Raw types ---

interface RawDefine {
  name: string;
  element: Element;
  type: 'element' | 'model' | 'attClass' | 'macro' | 'other';
}

interface RawRngElement {
  name: string;
  documentation: string;
  children: string[];
  childRefs: { name: string; min: number; max: number | 'unbounded'; compositor: CompositorType }[];
  attributes: TeiAttribute[];
  groupRefs: string[];      // model class refs
  attrClassRefs: string[];  // attribute class refs
  contentType: string;
}

interface Cardinality {
  min: number;
  max: number | 'unbounded';
}

// --- Pass 1: Extract raw defines ---

function extractRaw(doc: Document) {
  const defines = new Map<string, RawDefine>();
  const elements = new Map<string, RawRngElement>();
  const modelClasses = new Map<string, Set<string>>();
  const attrClasses = new Map<string, TeiAttribute[]>();
  const startRefs: string[] = [];

  // Collect all <define> elements
  const allDefines = doc.getElementsByTagNameNS(RNG_NS, 'define');
  for (const def of Array.from(allDefines)) {
    const name = def.getAttribute('name');
    if (!name) continue;

    let type: RawDefine['type'] = 'other';
    if (name.startsWith('model.')) {
      type = 'model';
    } else if (name.startsWith('att.') || name.endsWith('.attributes') || name.endsWith('.attribute')) {
      type = 'attClass';
    } else if (name.startsWith('macro.')) {
      type = 'macro';
    } else {
      // Check if this define contains an <element>
      const elementChild = def.getElementsByTagNameNS(RNG_NS, 'element')[0];
      if (elementChild) {
        type = 'element';
      }
    }

    // For combine="choice" defines, we may see duplicates — store all
    const existing = defines.get(name);
    if (!existing || type === 'element') {
      defines.set(name, { name, element: def, type });
    }
  }

  // Collect <start> refs
  const starts = doc.getElementsByTagNameNS(RNG_NS, 'start');
  for (const s of Array.from(starts)) {
    const refs = s.getElementsByTagNameNS(RNG_NS, 'ref');
    for (const r of Array.from(refs)) {
      const name = r.getAttribute('name');
      if (name) startRefs.push(name);
    }
  }

  // Process element defines
  for (const [defName, def] of defines) {
    if (def.type === 'element') {
      const elNode = def.element.getElementsByTagNameNS(RNG_NS, 'element')[0];
      if (!elNode) continue;

      const elementName = elNode.getAttribute('name') ?? defName;
      const documentation = getDocumentation(elNode) || getDocumentation(def.element);

      const children: string[] = [];
      const childRefs: RawRngElement['childRefs'] = [];
      const attributes: TeiAttribute[] = [];
      const groupRefs: string[] = [];
      const attrClassRefs: string[] = [];
      let contentType = 'empty';

      contentType = processContent(
        elNode, children, childRefs, attributes, groupRefs, attrClassRefs,
        defines, { min: 1, max: 1 }
      );

      elements.set(elementName, {
        name: elementName,
        documentation,
        children: [...new Set(children)],
        childRefs: deduplicateChildRefs(childRefs),
        attributes: deduplicateAttrs(attributes),
        groupRefs: [...new Set(groupRefs)],
        attrClassRefs: [...new Set(attrClassRefs)],
        contentType,
      });
    } else if (def.type === 'model') {
      // Model class: collect member refs
      const members = new Set<string>();
      collectModelMembers(def.element, members, defines);
      modelClasses.set(defName, members);
    } else if (def.type === 'attClass') {
      // Attribute class: collect attributes
      const attrs: TeiAttribute[] = [];
      collectAttributes(def.element, attrs, defName, defines, new Set());
      if (attrs.length > 0) {
        attrClasses.set(defName, attrs);
      }
    }
  }

  return { defines, elements, modelClasses, attrClasses, startRefs };
}

function processContent(
  node: Element,
  children: string[],
  childRefs: RawRngElement['childRefs'],
  attributes: TeiAttribute[],
  groupRefs: string[],
  attrClassRefs: string[],
  defines: Map<string, RawDefine>,
  card: Cardinality,
): string {
  let contentType = 'empty';

  for (const child of Array.from(node.children)) {
    if (isRng(child, 'element')) {
      // Inline element definition
      const name = child.getAttribute('name');
      if (name) {
        children.push(name);
        childRefs.push({
          name, min: card.min, max: card.max, compositor: 'sequence',
        });
        contentType = mergeContentType(contentType, 'element');
      }
    } else if (isRng(child, 'ref')) {
      const refName = child.getAttribute('name');
      if (!refName) continue;
      const def = defines.get(refName);
      if (def) {
        if (def.type === 'element') {
          // Ref to an element define
          const elNode = def.element.getElementsByTagNameNS(RNG_NS, 'element')[0];
          const elName = elNode?.getAttribute('name') ?? refName;
          children.push(elName);
          childRefs.push({
            name: elName, min: card.min, max: card.max, compositor: 'sequence',
          });
          contentType = mergeContentType(contentType, 'element');
        } else if (def.type === 'model') {
          groupRefs.push(refName);
          contentType = mergeContentType(contentType, 'element');
        } else if (def.type === 'attClass') {
          attrClassRefs.push(refName);
        } else if (def.type === 'macro') {
          // Resolve macro inline (limited depth)
          contentType = mergeContentType(contentType,
            processContent(def.element, children, childRefs, attributes, groupRefs, attrClassRefs, defines, card)
          );
        } else {
          // Unknown ref — try to resolve
          contentType = mergeContentType(contentType,
            processContent(def.element, children, childRefs, attributes, groupRefs, attrClassRefs, defines, card)
          );
        }
      }
    } else if (isRng(child, 'attribute')) {
      const attrName = child.getAttribute('name');
      if (attrName) {
        const values = extractValues(child);
        attributes.push({
          name: attrName,
          documentation: getDocumentation(child),
          dataType: extractDataType(child),
          required: card.min >= 1,
          values: values.length > 0 ? values : undefined,
        });
      }
    } else if (isRng(child, 'optional')) {
      contentType = mergeContentType(contentType,
        processContent(child, children, childRefs, attributes, groupRefs, attrClassRefs, defines, { min: 0, max: 1 })
      );
    } else if (isRng(child, 'zeroOrMore')) {
      contentType = mergeContentType(contentType,
        processContent(child, children, childRefs, attributes, groupRefs, attrClassRefs, defines, { min: 0, max: 'unbounded' })
      );
    } else if (isRng(child, 'oneOrMore')) {
      contentType = mergeContentType(contentType,
        processContent(child, children, childRefs, attributes, groupRefs, attrClassRefs, defines, { min: 1, max: 'unbounded' })
      );
    } else if (isRng(child, 'choice')) {
      // Process choice children with compositor=choice
      const savedRefs = childRefs.length;
      contentType = mergeContentType(contentType,
        processContent(child, children, childRefs, attributes, groupRefs, attrClassRefs, defines, card)
      );
      // Mark new refs as choice
      for (let i = savedRefs; i < childRefs.length; i++) {
        childRefs[i].compositor = 'choice';
      }
    } else if (isRng(child, 'group') || isRng(child, 'interleave')) {
      contentType = mergeContentType(contentType,
        processContent(child, children, childRefs, attributes, groupRefs, attrClassRefs, defines, card)
      );
    } else if (isRng(child, 'text')) {
      contentType = mergeContentType(contentType, 'mixed');
    } else if (isRng(child, 'data') || isRng(child, 'value')) {
      contentType = mergeContentType(contentType, 'text');
    } else if (isRng(child, 'empty')) {
      // No change
    } else if (isRng(child, 'notAllowed')) {
      // No change
    } else if (isRng(child, 'mixed')) {
      contentType = mergeContentType(contentType, 'mixed');
      processContent(child, children, childRefs, attributes, groupRefs, attrClassRefs, defines, card);
    }
  }

  return contentType;
}

function mergeContentType(current: string, incoming: string): string {
  if (current === 'mixed' || incoming === 'mixed') return 'mixed';
  if (current === 'element' || incoming === 'element') return 'element';
  if (current === 'text' || incoming === 'text') return 'text';
  return current;
}

function extractValues(attrNode: Element): string[] {
  const values: string[] = [];
  // <choice><value>...</value></choice>
  const valueNodes = attrNode.getElementsByTagNameNS(RNG_NS, 'value');
  for (const v of Array.from(valueNodes)) {
    const text = (v.textContent ?? '').trim();
    if (text) values.push(text);
  }
  return values;
}

function extractDataType(attrNode: Element): string {
  const data = attrNode.getElementsByTagNameNS(RNG_NS, 'data')[0];
  if (data) {
    return data.getAttribute('type') ?? 'string';
  }
  const valueNodes = attrNode.getElementsByTagNameNS(RNG_NS, 'value');
  if (valueNodes.length > 0) return 'enumeration';
  const textNode = attrNode.getElementsByTagNameNS(RNG_NS, 'text')[0];
  if (textNode) return 'string';
  return 'string';
}

function collectModelMembers(
  node: Element,
  members: Set<string>,
  defines: Map<string, RawDefine>,
) {
  for (const child of Array.from(node.children)) {
    if (isRng(child, 'ref')) {
      const name = child.getAttribute('name');
      if (name) members.add(name);
    } else if (isRng(child, 'choice') || isRng(child, 'group') ||
               isRng(child, 'interleave') || isRng(child, 'oneOrMore') ||
               isRng(child, 'zeroOrMore') || isRng(child, 'optional')) {
      collectModelMembers(child, members, defines);
    }
  }
}

function collectAttributes(
  node: Element,
  attrs: TeiAttribute[],
  className: string,
  defines: Map<string, RawDefine>,
  visited: Set<string>,
) {
  if (visited.has(className)) return;
  visited.add(className);

  for (const child of Array.from(node.children)) {
    if (isRng(child, 'attribute')) {
      const name = child.getAttribute('name');
      if (name) {
        const values = extractValues(child);
        attrs.push({
          name,
          documentation: getDocumentation(child),
          dataType: extractDataType(child),
          required: false,
          values: values.length > 0 ? values : undefined,
          fromClass: className,
        });
      }
    } else if (isRng(child, 'ref')) {
      const refName = child.getAttribute('name');
      if (refName) {
        const def = defines.get(refName);
        if (def && (def.type === 'attClass' || def.type === 'other')) {
          collectAttributes(def.element, attrs, refName, defines, visited);
        }
      }
    } else if (isRng(child, 'optional') || isRng(child, 'zeroOrMore') ||
               isRng(child, 'oneOrMore') || isRng(child, 'choice') ||
               isRng(child, 'group') || isRng(child, 'interleave')) {
      collectAttributes(child, attrs, className, defines, visited);
    }
  }
}

function deduplicateChildRefs(refs: RawRngElement['childRefs']): RawRngElement['childRefs'] {
  const map = new Map<string, RawRngElement['childRefs'][0]>();
  for (const ref of refs) {
    const existing = map.get(ref.name);
    if (existing) {
      existing.min = Math.min(existing.min, ref.min);
      existing.max = existing.max === 'unbounded' || ref.max === 'unbounded'
        ? 'unbounded'
        : Math.max(existing.max as number, ref.max as number);
      if (ref.compositor === 'choice') existing.compositor = 'choice';
    } else {
      map.set(ref.name, { ...ref });
    }
  }
  return [...map.values()];
}

function deduplicateAttrs(attrs: TeiAttribute[]): TeiAttribute[] {
  const seen = new Set<string>();
  return attrs.filter((a) => {
    if (seen.has(a.name)) return false;
    seen.add(a.name);
    return true;
  });
}

// --- Pass 2: Resolve references ---

function resolveReferences(raw: ReturnType<typeof extractRaw>) {
  const { defines, elements, modelClasses, attrClasses } = raw;

  // Resolve model class members to actual element names
  const resolvedModelClasses = new Map<string, string[]>();

  function resolveModelClass(className: string, visited: Set<string>): string[] {
    if (visited.has(className)) return [];
    visited.add(className);

    const members = modelClasses.get(className);
    if (!members) return [];

    const result: string[] = [];
    for (const memberRef of members) {
      const def = defines.get(memberRef);
      if (!def) continue;

      if (def.type === 'element') {
        const elNode = def.element.getElementsByTagNameNS(RNG_NS, 'element')[0];
        const elName = elNode?.getAttribute('name') ?? memberRef;
        result.push(elName);
      } else if (def.type === 'model') {
        result.push(...resolveModelClass(memberRef, visited));
      }
    }
    return [...new Set(result)];
  }

  for (const [className] of modelClasses) {
    resolvedModelClasses.set(className, resolveModelClass(className, new Set()));
  }

  // Expand group refs in elements
  for (const [_name, el] of elements) {
    for (const groupRef of el.groupRefs) {
      const members = resolvedModelClasses.get(groupRef) ?? [];
      for (const memberName of members) {
        if (!el.children.includes(memberName)) {
          el.children.push(memberName);
          el.childRefs.push({
            name: memberName,
            min: 0,
            max: 'unbounded',
            compositor: 'choice',
          });
        }
      }
    }
    el.children = [...new Set(el.children)];
    el.childRefs = deduplicateChildRefs(el.childRefs);

    // Resolve attribute class refs
    for (const acRef of el.attrClassRefs) {
      const attrs = resolveAttrClass(acRef, defines, attrClasses, new Set());
      for (const attr of attrs) {
        if (!el.attributes.some((a) => a.name === attr.name)) {
          el.attributes.push(attr);
        }
      }
    }
  }

  return { elements, resolvedModelClasses, attrClasses };
}

function resolveAttrClass(
  className: string,
  defines: Map<string, RawDefine>,
  attrClasses: Map<string, TeiAttribute[]>,
  visited: Set<string>,
): TeiAttribute[] {
  if (visited.has(className)) return [];
  visited.add(className);

  const direct = attrClasses.get(className) ?? [];
  const result = [...direct];

  // Check for sub-references in the define
  const def = defines.get(className);
  if (def) {
    const refs = def.element.getElementsByTagNameNS(RNG_NS, 'ref');
    for (const r of Array.from(refs)) {
      const refName = r.getAttribute('name');
      if (refName && refName !== className && (refName.startsWith('att.') || refName.endsWith('.attributes'))) {
        result.push(...resolveAttrClass(refName, defines, attrClasses, visited));
      }
    }
  }

  return result;
}

// --- Pass 3: Compute parents ---

function computeParents(elements: Map<string, RawRngElement>): Map<string, string[]> {
  const parents = new Map<string, string[]>();

  for (const [parentName, el] of elements) {
    for (const childName of el.children) {
      if (!parents.has(childName)) {
        parents.set(childName, []);
      }
      const parentList = parents.get(childName)!;
      if (!parentList.includes(parentName)) {
        parentList.push(parentName);
      }
    }
  }

  return parents;
}

// --- Pass 4: Build TeiSchema ---

function buildSchema(
  resolved: ReturnType<typeof resolveReferences>,
  parents: Map<string, string[]>,
  schemaName: string,
): TeiSchema {
  const { elements: rawElements, resolvedModelClasses, attrClasses } = resolved;
  const elements = new Map<string, TeiElement>();
  const modelClasses = new Map<string, string[]>();
  const attributeClasses = new Map<string, TeiAttribute[]>();

  // Build model classes
  for (const [name, members] of resolvedModelClasses) {
    if (members.length > 0) {
      modelClasses.set(name, members.sort());
    }
  }

  // Build attribute classes
  for (const [name, attrs] of attrClasses) {
    attributeClasses.set(name, attrs);
  }

  // Build elements
  for (const [name, raw] of rawElements) {
    const elementParents = parents.get(name) ?? [];

    // Determine memberOf
    const memberOf: string[] = [];
    for (const [className, members] of resolvedModelClasses) {
      if (members.includes(name)) {
        memberOf.push(className);
      }
    }

    const childRefs: ChildRef[] = raw.childRefs.map((cr) => ({
      name: cr.name,
      minOccurs: cr.min,
      maxOccurs: cr.max,
      compositor: cr.compositor,
    })).sort((a, b) => a.name.localeCompare(b.name));

    // Ensure every child has a childRef
    for (const childName of raw.children) {
      if (!childRefs.some((cr) => cr.name === childName)) {
        childRefs.push({
          name: childName,
          minOccurs: 0,
          maxOccurs: 'unbounded',
          compositor: 'choice',
        });
      }
    }

    elements.set(name, {
      name,
      documentation: raw.documentation,
      parents: elementParents.sort(),
      children: raw.children.sort(),
      childRefs: childRefs.sort((a, b) => a.name.localeCompare(b.name)),
      attributes: raw.attributes.sort((a, b) => a.name.localeCompare(b.name)),
      contentType: raw.contentType,
      memberOf: memberOf.sort(),
      attributeClasses: raw.attrClassRefs.sort(),
    });
  }

  const elementNames = [...elements.keys()].sort();

  return {
    name: schemaName,
    format: 'rng',
    elements,
    modelClasses,
    attributeClasses,
    elementNames,
    schematronRules: [],
  };
}

// --- Main entry ---

export function parseRng(rngString: string, schemaName: string): TeiSchema {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rngString, 'application/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`RelaxNG parse error: ${parseError.textContent}`);
  }

  const raw = extractRaw(doc);
  const resolved = resolveReferences(raw);
  const parents = computeParents(resolved.elements);
  return buildSchema(resolved, parents, schemaName);
}
