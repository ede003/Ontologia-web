import type { OntologySchema, ClassSchema, RelationEdge } from '../services/schemaDiscovery'
import type { ParsedQuery, EntityContext, PropertyFilter } from './queryParser'

const VET_NS = 'http://www.semanticweb.org/grupo14/ontologias/veterinaria#'

export const PREFIXES = `PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX owl:  <http://www.w3.org/2002/07/owl#>
PREFIX vet:  <${VET_NS}>`

// ─── Filter clause generation ────────────────────────────────────────────────

function filterClause(varName: string, filter: PropertyFilter): string {
  const v = `?${varName}`
  switch (filter.matchType) {
    case 'numeric':
      return `FILTER(BOUND(${v}) && str(${v}) = "${filter.value}")`
    case 'exact':
      return `FILTER(BOUND(${v}) && LCASE(${v}) = "${filter.value.toLowerCase()}")`
    case 'contains':
      return `FILTER(BOUND(${v}) && CONTAINS(LCASE(str(${v})), "${filter.value.toLowerCase()}"))`
  }
}

// ─── Optional blocks for all datatype props of a class ───────────────────────

function optionalsForClass(
  cls: ClassSchema,
  instanceVar: string,
  propVarPrefix: string,
  skipProp?: string,
): string {
  return cls.datatypeProps
    .filter(p => p.fullIri !== skipProp)
    .map(p => `  OPTIONAL { ?${instanceVar} <${p.fullIri}> ?${propVarPrefix}${p.localName} }`)
    .join('\n')
}

// ─── Single-entity query ──────────────────────────────────────────────────────

function buildSingleEntityQuery(context: EntityContext, schema: OntologySchema): string {
  const cls = schema.classes.get(context.className)
  if (!cls) return buildContentSearchQuery(context.className, schema)

  const optionalBlocks = optionalsForClass(cls, 'instance', '', cls.labelProperty)
  const labelLocalName = cls.labelProperty.split('#').pop() ?? ''

  const filterClauses = context.propertyFilters.map(f => {
    // Label property is aliased as ?name in the query; other props use their own local name
    const varName = f.propertyLocalName === labelLocalName ? 'name' : f.propertyLocalName
    return filterClause(varName, f)
  }).join('\n  ')

  return `${PREFIXES}
SELECT * WHERE {
  ?instance rdf:type <${cls.fullIri}> .
  OPTIONAL { ?instance <${cls.labelProperty}> ?name }
${optionalBlocks}
  ${filterClauses}
}`
}

// ─── BFS join path finding ────────────────────────────────────────────────────

interface JoinStep {
  fromIdx: number
  toIdx: number
  edge: RelationEdge
  forward: boolean
}

function findDirectEdge(
  fromClass: string,
  toClass: string,
  schema: OntologySchema,
): JoinStep | null {
  // Forward: fromClass has predicate pointing to toClass
  const fwdEdges = schema.adjacency.get(fromClass) ?? []
  const fwd = fwdEdges.find(e => e.toClass === toClass)
  if (fwd) return { fromIdx: -1, toIdx: -1, edge: fwd, forward: true }

  // Reverse: toClass has predicate pointing to fromClass
  const revEdges = schema.adjacency.get(toClass) ?? []
  const rev = revEdges.find(e => e.toClass === fromClass)
  if (rev) return { fromIdx: -1, toIdx: -1, edge: rev, forward: false }

  return null
}

function findJoinPath(
  classNames: string[],
  schema: OntologySchema,
): JoinStep[] | null {
  if (classNames.length < 2) return []
  const steps: JoinStep[] = []

  for (let i = 0; i < classNames.length - 1; i++) {
    const step = findDirectEdge(classNames[i], classNames[i + 1], schema)
    if (!step) return null
    steps.push({ ...step, fromIdx: i, toIdx: i + 1 })
  }
  return steps
}

function joinStepToSparql(step: JoinStep): string {
  const fromVar = `var${step.fromIdx}`
  const toVar = `var${step.toIdx}`
  if (step.forward) {
    return `  ?${fromVar} <${step.edge.predicateIri}> ?${toVar} .`
  } else {
    // Edge runs from contexts[toIdx] to contexts[fromIdx] in the ontology
    return `  ?${toVar} <${step.edge.predicateIri}> ?${fromVar} .`
  }
}

// ─── Multi-entity query ───────────────────────────────────────────────────────

function buildMultiEntityQuery(
  contexts: EntityContext[],
  rawInput: string,
  schema: OntologySchema,
): { query: string; resolvedMode: 'multi-entity' | 'content' } {
  const classNames = contexts.map(c => c.className)
  const joinSteps = findJoinPath(classNames, schema)

  if (!joinSteps) {
    return { query: buildContentSearchQuery(rawInput, schema), resolvedMode: 'content' }
  }

  const typePatterns = contexts.map((c, i) => {
    const cls = schema.classes.get(c.className)
    if (!cls) return `  # Unknown class: ${c.className}`
    return `  ?var${i} rdf:type <${cls.fullIri}> .`
  }).join('\n')

  const joinPatterns = joinSteps.map(joinStepToSparql).join('\n')

  const labelPatterns = contexts.map((c, i) => {
    const cls = schema.classes.get(c.className)
    if (!cls) return ''
    return `  OPTIONAL { ?var${i} <${cls.labelProperty}> ?var${i}Name }`
  }).join('\n')

  const optionalAndFilterBlocks = contexts.map((c, i) => {
    const cls = schema.classes.get(c.className)
    if (!cls) return ''

    const filteredPropNames = new Set(c.propertyFilters.map(f => f.propertyLocalName))

    const optionals = cls.datatypeProps
      .filter(p => p.fullIri !== cls.labelProperty)
      .map(p => `  OPTIONAL { ?var${i} <${p.fullIri}> ?var${i}_${p.localName} }`)
      .join('\n')

    const clsLabelLocalName = cls.labelProperty.split('#').pop() ?? ''
    const filters = c.propertyFilters
      .map(f => {
        // Label prop is aliased as ?var${i}Name; other props use var${i}_${localName}
        const varName = f.propertyLocalName === clsLabelLocalName
          ? `var${i}Name`
          : `var${i}_${f.propertyLocalName}`
        return filterClause(varName, f)
      })
      .map(f => `  ${f}`)
      .join('\n')

    // Suppress unused variable warning — filteredPropNames is used indirectly via filters
    void filteredPropNames

    return `${optionals}\n${filters}`
  }).join('\n')

  return {
    resolvedMode: 'multi-entity',
    query: `${PREFIXES}
SELECT * WHERE {
${typePatterns}
${joinPatterns}
${labelPatterns}
${optionalAndFilterBlocks}
}`,
  }
}

// ─── Content search query (full-text across all classes and properties) ───────

function buildContentSearchQuery(term: string, schema: OntologySchema): string {
  const t = term.toLowerCase().trim()
  if (t.length < 3) {
    return `${PREFIXES}\nSELECT DISTINCT ?instance ?className ?labelVal ?matchProp ?matchVal WHERE { FILTER(false) }`
  }
  const labelProps = [...new Set(Array.from(schema.classes.values()).map(c => c.labelProperty))]
    .map(iri => `<${iri}>`)
    .join(', ')

  // Inner subquery runs DISTINCT before the OPTIONAL to avoid Comunica materializing
  // the full cartesian product of (matches × label triples) before deduplication.
  return `${PREFIXES}
SELECT ?instance ?className ?labelVal ?matchProp ?matchVal WHERE {
  {
    SELECT DISTINCT ?instance ?className ?matchProp ?matchVal WHERE {
      ?instance rdf:type ?class .
      FILTER(STRSTARTS(STR(?class), "${VET_NS}"))
      BIND(STRAFTER(STR(?class), "#") AS ?className)
      ?instance ?matchProp ?matchVal .
      FILTER(isLiteral(?matchVal) && CONTAINS(LCASE(str(?matchVal)), "${t}"))
      FILTER(STRSTARTS(STR(?matchProp), "${VET_NS}"))
    }
  }
  OPTIONAL {
    ?instance ?labelPred ?labelVal .
    FILTER(?labelPred IN (${labelProps}))
  }
}
LIMIT 200`
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export interface BuildQueryResult {
  query: string
  resolvedMode: ParsedQuery['searchMode']
}

export function buildQuery(parsed: ParsedQuery, schema: OntologySchema): BuildQueryResult {
  console.group('[sparqlBuilder] buildQuery')
  console.log('searchMode:', parsed.searchMode, '| contexts:', parsed.entityContexts.map(c => c.className))

  let result: BuildQueryResult

  switch (parsed.searchMode) {
    case 'entity':
      result = {
        resolvedMode: 'entity',
        query: parsed.entityContexts.length > 0
          ? buildSingleEntityQuery(parsed.entityContexts[0], schema)
          : buildContentSearchQuery(parsed.rawInput, schema),
      }
      break

    case 'multi-entity': {
      const r = buildMultiEntityQuery(parsed.entityContexts, parsed.rawInput, schema)
      result = { query: r.query, resolvedMode: r.resolvedMode }
      break
    }

    case 'content':
    case 'fallback':
    default:
      result = {
        resolvedMode: parsed.searchMode === 'fallback' ? 'fallback' : 'content',
        query: buildContentSearchQuery(parsed.rawInput, schema),
      }
      break
  }

  console.groupEnd()
  return result
}

// ─── Legacy export for backward compat with AnimalesPage ─────────────────────
// AnimalesPage will be fully updated in the final step; this lets it compile meanwhile.

export interface QueryParams {
  isRelational: boolean
  primaryTerm: string
  secondaryTerm: string | null
  primaryType: string | null
  secondaryType: string | null
  rawInput: string
  entityMap: unknown
  filters?: Record<string, string>
}
