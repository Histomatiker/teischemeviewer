import type {
  TeiAttribute,
  TeiElement,
  TeiSchema,
  SerializedTeiSchema,
  ChildRef,
  CompositorType,
} from '../types/tei';

const XS = 'http://www.w3.org/2001/XMLSchema';

function getDocumentation(node: Element): string {
  const ann =
    node.getElementsByTagNameNS(XS, 'annotation')[0] ??
    node.querySelector('annotation');
  if (!ann) return '';
  const doc =
    ann.getElementsByTagNameNS(XS, 'documentation')[0] ??
    ann.querySelector('documentation');
  if (!doc) return '';
  return (doc.textContent ?? '').trim().replace(/\s+/g, ' ');
}

interface RawChildRef {
  name: string;
  minOccurs: number;
  maxOccurs: number | 'unbounded';
  compositor: CompositorType;
}

interface RawGroupRef {
  name: string;
  minOccurs: number;
  maxOccurs: number | 'unbounded';
  compositor: CompositorType;
}

interface RawElement {
  name: string;
  documentation: string;
  typeName: string | null;
  localChildren: string[];
  localChildRefs: RawChildRef[];
  localAttributes: TeiAttribute[];
  groupRefs: RawGroupRef[];
  attrGroupRefs: string[];
  contentType: string;
}

interface RawGroup {
  name: string;
  memberElements: string[];
  subGroups: string[];
}

interface RawAttrGroup {
  name: string;
  attributes: TeiAttribute[];
  subGroups: string[];
}

// Pass 1: Extract raw data from XSD DOM
function extractRaw(doc: Document) {
  const elements = new Map<string, RawElement>();
  const complexTypes = new Map<string, Element>();
  const groups = new Map<string, RawGroup>();
  const attrGroups = new Map<string, RawAttrGroup>();

  // Collect all top-level complex types
  for (const ct of Array.from(
    doc.getElementsByTagNameNS(XS, 'complexType')
  )) {
    const name = ct.getAttribute('name');
    if (name && ct.parentElement === doc.documentElement) {
      complexTypes.set(name, ct);
    }
  }

  // Collect all top-level groups
  for (const g of Array.from(doc.getElementsByTagNameNS(XS, 'group'))) {
    const name = g.getAttribute('name');
    if (name && g.parentElement === doc.documentElement) {
      const memberElements: string[] = [];
      const subGroups: string[] = [];
      collectGroupMembers(g, memberElements, subGroups);
      groups.set(name, { name, memberElements, subGroups });
    }
  }

  // Collect all top-level attribute groups
  for (const ag of Array.from(
    doc.getElementsByTagNameNS(XS, 'attributeGroup')
  )) {
    const name = ag.getAttribute('name');
    if (name && ag.parentElement === doc.documentElement) {
      const attributes: TeiAttribute[] = [];
      const subGroups: string[] = [];
      collectAttrGroupMembers(ag, attributes, subGroups, name);
      attrGroups.set(name, { name, attributes, subGroups });
    }
  }

  // Collect all top-level elements
  for (const el of Array.from(doc.getElementsByTagNameNS(XS, 'element'))) {
    const name = el.getAttribute('name');
    if (!name || el.parentElement !== doc.documentElement) continue;

    const typeName = el.getAttribute('type');
    const documentation = getDocumentation(el);
    const localChildren: string[] = [];
    const localChildRefs: RawChildRef[] = [];
    const localAttributes: TeiAttribute[] = [];
    const groupRefs: RawGroupRef[] = [];
    const attrGroupRefs: string[] = [];
    let contentType = 'empty';

    // If element has inline complexType, extract from it
    const inlineCT = getDirectChild(el, 'complexType');
    const ctNode = inlineCT ?? (typeName ? complexTypes.get(typeName) : null);

    if (ctNode) {
      contentType = extractFromComplexType(
        ctNode,
        localChildren,
        localChildRefs,
        localAttributes,
        groupRefs,
        attrGroupRefs,
        name,
        complexTypes
      );
    }

    const doc2 =
      documentation || (ctNode ? getDocumentation(ctNode) : '');

    elements.set(name, {
      name,
      documentation: doc2,
      typeName,
      localChildren,
      localChildRefs,
      localAttributes,
      groupRefs,
      attrGroupRefs,
      contentType,
    });
  }

  return { elements, complexTypes, groups, attrGroups };
}

function getDirectChild(
  parent: Element,
  localName: string
): Element | null {
  for (const child of Array.from(parent.children)) {
    if (
      child.localName === localName ||
      child.localName === `xs:${localName}` ||
      (child.namespaceURI === XS && child.localName === localName)
    ) {
      return child;
    }
  }
  return null;
}

function parseOccurs(value: string | null, defaultVal: number): number | 'unbounded' {
  if (value === null) return defaultVal;
  if (value === 'unbounded') return 'unbounded';
  const n = parseInt(value, 10);
  return isNaN(n) ? defaultVal : n;
}

function extractFromComplexType(
  ct: Element,
  children: string[],
  childRefs: RawChildRef[],
  attributes: TeiAttribute[],
  groupRefs: RawGroupRef[],
  attrGroupRefs: string[],
  ownerName: string,
  complexTypes?: Map<string, Element>
): string {
  let contentType = 'empty';

  // Check for mixed content
  if (ct.getAttribute('mixed') === 'true') {
    contentType = 'mixed';
  }

  // Process content model (sequence, choice, all, group refs)
  const processCompositor = (node: Element, compositorType: CompositorType) => {
    for (const child of Array.from(node.children)) {
      const ln = child.localName;
      if (
        ln === 'element' ||
        (child.namespaceURI === XS && child.localName === 'element')
      ) {
        const ref = child.getAttribute('ref');
        const name = child.getAttribute('name') ?? ref;
        if (name) {
          const cleanName = name.includes(':') ? name.split(':')[1] : name;
          children.push(cleanName);
          childRefs.push({
            name: cleanName,
            minOccurs: parseOccurs(child.getAttribute('minOccurs'), 1) as number,
            maxOccurs: parseOccurs(child.getAttribute('maxOccurs'), 1),
            compositor: compositorType,
          });
        }
      } else if (
        ln === 'group' ||
        (child.namespaceURI === XS && child.localName === 'group')
      ) {
        const ref = child.getAttribute('ref');
        if (ref) {
          const cleanRef = ref.includes(':') ? ref.split(':')[1] : ref;
          groupRefs.push({
            name: cleanRef,
            minOccurs: parseOccurs(child.getAttribute('minOccurs'), 1) as number,
            maxOccurs: parseOccurs(child.getAttribute('maxOccurs'), 1),
            compositor: compositorType,
          });
        }
      } else if (
        ln === 'sequence' ||
        ln === 'choice' ||
        ln === 'all' ||
        (child.namespaceURI === XS &&
          ['sequence', 'choice', 'all'].includes(child.localName))
      ) {
        contentType = contentType === 'empty' ? 'element' : contentType;
        const nestedType = (child.localName === 'choice' ? 'choice'
          : child.localName === 'all' ? 'all' : 'sequence') as CompositorType;
        processCompositor(child, nestedType);
      }
    }
  };

  // Look for direct compositors and extensions
  for (const child of Array.from(ct.children)) {
    const ln = child.localName;
    if (['sequence', 'choice', 'all'].includes(ln)) {
      contentType = contentType === 'empty' ? 'element' : contentType;
      const compositorType = (ln === 'choice' ? 'choice'
        : ln === 'all' ? 'all' : 'sequence') as CompositorType;
      processCompositor(child, compositorType);
    } else if (ln === 'group' && child.getAttribute('ref')) {
      const ref = child.getAttribute('ref')!;
      const cleanRef = ref.includes(':') ? ref.split(':')[1] : ref;
      groupRefs.push({
        name: cleanRef,
        minOccurs: parseOccurs(child.getAttribute('minOccurs'), 1) as number,
        maxOccurs: parseOccurs(child.getAttribute('maxOccurs'), 1),
        compositor: 'sequence',
      });
    } else if (
      ln === 'simpleContent' ||
      ln === 'complexContent'
    ) {
      const ext =
        getDirectChild(child, 'extension') ??
        getDirectChild(child, 'restriction');
      if (ext) {
        if (ln === 'simpleContent') contentType = 'text';
        // Resolve base type to check mixed attribute and inherit content
        const baseName = ext.getAttribute('base');
        if (baseName && complexTypes) {
          const cleanBase = baseName.includes(':') ? baseName.split(':')[1] : baseName;
          const baseCt = complexTypes.get(cleanBase);
          if (baseCt) {
            if (baseCt.getAttribute('mixed') === 'true') {
              contentType = 'mixed';
            }
            extractFromComplexType(
              baseCt,
              children,
              childRefs,
              attributes,
              groupRefs,
              attrGroupRefs,
              ownerName,
              complexTypes
            );
          }
        }
        extractFromComplexType(
          ext,
          children,
          childRefs,
          attributes,
          groupRefs,
          attrGroupRefs,
          ownerName,
          complexTypes
        );
      }
    }
  }

  // Collect attributes
  for (const attr of Array.from(ct.children)) {
    if (
      attr.localName === 'attribute' ||
      (attr.namespaceURI === XS && attr.localName === 'attribute')
    ) {
      const attrName = attr.getAttribute('name') ?? attr.getAttribute('ref');
      if (attrName) {
        const cleanName = attrName.includes(':')
          ? attrName.split(':')[1]
          : attrName;
        attributes.push({
          name: cleanName,
          documentation: getDocumentation(attr),
          dataType: attr.getAttribute('type') ?? 'string',
          required: attr.getAttribute('use') === 'required',
          fromClass: undefined,
        });
      }
    } else if (
      attr.localName === 'attributeGroup' ||
      (attr.namespaceURI === XS && attr.localName === 'attributeGroup')
    ) {
      const ref = attr.getAttribute('ref');
      if (ref) {
        const cleanRef = ref.includes(':') ? ref.split(':')[1] : ref;
        attrGroupRefs.push(cleanRef);
      }
    }
  }

  if (children.length > 0 && contentType === 'empty') {
    contentType = 'element';
  }

  return contentType;
}

function collectGroupMembers(
  g: Element,
  members: string[],
  subGroups: string[]
) {
  for (const child of Array.from(g.querySelectorAll('*'))) {
    if (
      child.localName === 'element' ||
      (child.namespaceURI === XS && child.localName === 'element')
    ) {
      const ref = child.getAttribute('ref');
      const name = child.getAttribute('name') ?? ref;
      if (name) {
        const clean = name.includes(':') ? name.split(':')[1] : name;
        members.push(clean);
      }
    } else if (
      child.localName === 'group' ||
      (child.namespaceURI === XS && child.localName === 'group')
    ) {
      const ref = child.getAttribute('ref');
      if (ref) {
        const clean = ref.includes(':') ? ref.split(':')[1] : ref;
        subGroups.push(clean);
      }
    }
  }
}

function collectAttrGroupMembers(
  ag: Element,
  attributes: TeiAttribute[],
  subGroups: string[],
  groupName: string
) {
  for (const child of Array.from(ag.children)) {
    if (
      child.localName === 'attribute' ||
      (child.namespaceURI === XS && child.localName === 'attribute')
    ) {
      const name = child.getAttribute('name') ?? child.getAttribute('ref');
      if (name) {
        const cleanName = name.includes(':') ? name.split(':')[1] : name;
        attributes.push({
          name: cleanName,
          documentation: getDocumentation(child),
          dataType: child.getAttribute('type') ?? 'string',
          required: child.getAttribute('use') === 'required',
          fromClass: groupName,
        });
      }
    } else if (
      child.localName === 'attributeGroup' ||
      (child.namespaceURI === XS && child.localName === 'attributeGroup')
    ) {
      const ref = child.getAttribute('ref');
      if (ref) {
        const clean = ref.includes(':') ? ref.split(':')[1] : ref;
        subGroups.push(clean);
      }
    }
  }
}

// Pass 2: Resolve references (groups → elements, attrGroups → attributes)
function resolveReferences(raw: ReturnType<typeof extractRaw>) {
  const { elements, groups, attrGroups } = raw;

  // Resolve group references recursively
  function resolveGroup(
    groupName: string,
    visited: Set<string>
  ): string[] {
    if (visited.has(groupName)) return [];
    visited.add(groupName);
    const group = groups.get(groupName);
    if (!group) return [];
    const result = [...group.memberElements];
    for (const sub of group.subGroups) {
      result.push(...resolveGroup(sub, visited));
    }
    return result;
  }

  // Resolve attribute group references recursively
  function resolveAttrGroup(
    groupName: string,
    visited: Set<string>
  ): TeiAttribute[] {
    if (visited.has(groupName)) return [];
    visited.add(groupName);
    const group = attrGroups.get(groupName);
    if (!group) return [];
    const result = [...group.attributes];
    for (const sub of group.subGroups) {
      result.push(...resolveAttrGroup(sub, visited));
    }
    return result;
  }

  // Resolve each element
  for (const [_name, el] of elements) {
    // Resolve group refs to children (with cardinality)
    for (const gRef of el.groupRefs) {
      const resolved = resolveGroup(gRef.name, new Set());
      el.localChildren.push(...resolved);
      // Each resolved member inherits the group ref's cardinality
      for (const memberName of resolved) {
        el.localChildRefs.push({
          name: memberName,
          minOccurs: gRef.minOccurs as number,
          maxOccurs: gRef.maxOccurs,
          compositor: gRef.compositor,
        });
      }
    }

    // Resolve attribute group refs to attributes
    const resolvedAttrClasses: string[] = [];
    for (const agRef of el.attrGroupRefs) {
      const resolved = resolveAttrGroup(agRef, new Set());
      el.localAttributes.push(...resolved);
      resolvedAttrClasses.push(agRef);
    }

    // Deduplicate children and attributes
    el.localChildren = [...new Set(el.localChildren)];

    // Deduplicate childRefs: same name → min(minOccurs), max(maxOccurs), prefer 'choice'
    const childRefMap = new Map<string, RawChildRef>();
    for (const cr of el.localChildRefs) {
      const existing = childRefMap.get(cr.name);
      if (existing) {
        existing.minOccurs = Math.min(existing.minOccurs, cr.minOccurs as number);
        existing.maxOccurs =
          existing.maxOccurs === 'unbounded' || cr.maxOccurs === 'unbounded'
            ? 'unbounded'
            : Math.max(existing.maxOccurs as number, cr.maxOccurs as number);
        if (cr.compositor === 'choice') existing.compositor = 'choice';
      } else {
        childRefMap.set(cr.name, { ...cr });
      }
    }
    el.localChildRefs = [...childRefMap.values()];

    const seenAttrs = new Set<string>();
    el.localAttributes = el.localAttributes.filter((a) => {
      if (seenAttrs.has(a.name)) return false;
      seenAttrs.add(a.name);
      return true;
    });
  }

  return { elements, groups, attrGroups };
}

// Pass 3: Compute parent relationships
function computeParents(
  elements: Map<string, RawElement>
): Map<string, string[]> {
  const parents = new Map<string, string[]>();

  for (const [parentName, el] of elements) {
    for (const childName of el.localChildren) {
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

// Pass 4: Build final TeiSchema
function buildSchema(
  raw: ReturnType<typeof resolveReferences>,
  parents: Map<string, string[]>,
  schemaName: string
): TeiSchema {
  const { elements: rawElements, groups, attrGroups } = raw;
  const elements = new Map<string, TeiElement>();
  const modelClasses = new Map<string, string[]>();
  const attributeClasses = new Map<string, TeiAttribute[]>();

  // Build model classes from groups
  for (const [name] of groups) {
    const allMembers = resolveGroupFull(name, groups, new Set());
    modelClasses.set(name, allMembers);
  }

  // Build attribute classes from attribute groups
  for (const [name, group] of attrGroups) {
    attributeClasses.set(name, group.attributes);
  }

  // Build final elements
  for (const [name, raw] of rawElements) {
    const elementParents = parents.get(name) ?? [];

    // Determine memberOf (which groups this element belongs to)
    const memberOf: string[] = [];
    for (const [groupName, group] of groups) {
      if (
        group.memberElements.includes(name) ||
        group.subGroups.some((sg) =>
          resolveGroupFull(sg, groups, new Set()).includes(name)
        )
      ) {
        memberOf.push(groupName);
      }
    }

    // Determine attribute classes
    const elAttrClasses = [...raw.attrGroupRefs];

    // Build childRefs sorted by name, ensuring every child has a ref entry
    const childRefMap = new Map<string, ChildRef>();
    for (const cr of raw.localChildRefs) {
      childRefMap.set(cr.name, {
        name: cr.name,
        minOccurs: cr.minOccurs,
        maxOccurs: cr.maxOccurs,
        compositor: cr.compositor,
      });
    }
    // Ensure every child in localChildren has a childRef (default 1..1 sequence)
    for (const childName of raw.localChildren) {
      if (!childRefMap.has(childName)) {
        childRefMap.set(childName, {
          name: childName,
          minOccurs: 1,
          maxOccurs: 1,
          compositor: 'sequence',
        });
      }
    }
    const childRefs = [...childRefMap.values()].sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    elements.set(name, {
      name,
      documentation: raw.documentation,
      parents: elementParents.sort(),
      children: raw.localChildren.sort(),
      childRefs,
      attributes: raw.localAttributes.sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
      contentType: raw.contentType,
      memberOf: memberOf.sort(),
      attributeClasses: elAttrClasses.sort(),
    });
  }

  const elementNames = [...elements.keys()].sort();

  return { name: schemaName, format: 'xsd' as const, elements, modelClasses, attributeClasses, elementNames, schematronRules: [] };
}

function resolveGroupFull(
  groupName: string,
  groups: Map<string, RawGroup>,
  visited: Set<string>
): string[] {
  if (visited.has(groupName)) return [];
  visited.add(groupName);
  const group = groups.get(groupName);
  if (!group) return [];
  const result = [...group.memberElements];
  for (const sub of group.subGroups) {
    result.push(...resolveGroupFull(sub, groups, visited));
  }
  return [...new Set(result)];
}

// Main entry: parse XSD string into TeiSchema
export function parseXsd(
  xsdString: string,
  schemaName: string
): TeiSchema {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xsdString, 'application/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`XSD parse error: ${parseError.textContent}`);
  }

  // Pass 1: Extract
  const raw = extractRaw(doc);
  // Pass 2: Resolve
  const resolved = resolveReferences(raw);
  // Pass 3: Parents
  const parents = computeParents(resolved.elements);
  // Pass 4: Build
  return buildSchema(resolved, parents, schemaName);
}

// Serialize TeiSchema for postMessage (Maps → Objects)
export function serializeSchema(schema: TeiSchema): SerializedTeiSchema {
  return {
    name: schema.name,
    format: schema.format,
    elements: Object.fromEntries(schema.elements),
    modelClasses: Object.fromEntries(schema.modelClasses),
    attributeClasses: Object.fromEntries(schema.attributeClasses),
    elementNames: schema.elementNames,
    schematronRules: schema.schematronRules,
  };
}

// Deserialize back to TeiSchema
export function deserializeSchema(
  data: SerializedTeiSchema
): TeiSchema {
  return {
    name: data.name,
    format: data.format,
    elements: new Map(Object.entries(data.elements)),
    modelClasses: new Map(Object.entries(data.modelClasses)),
    attributeClasses: new Map(Object.entries(data.attributeClasses)),
    elementNames: data.elementNames,
    schematronRules: data.schematronRules,
  };
}
