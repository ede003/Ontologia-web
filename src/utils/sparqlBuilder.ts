import type { OntologySchema, ClassSchema, RelationEdge } from '../services/schemaDiscovery'
import type { ParsedQuery, EntityContext, PropertyFilter } from './queryParser'
import type { Language } from '../i18n/translations'

const VET_NS = 'http://www.semanticweb.org/grupo14/ontologias/veterinaria#'

// Properties stored as plain literals (no xml:lang tag) — excluded from lang filter
const UNTAGGED_PROPS = new Set(['telefono'])

// Returns true when all distinct values of a property are numeric (e.g. edad, peso).
// Numeric properties may be stored without a language tag, so the OPTIONAL must
// accept both tagged ("3"@es) and untagged ("3" / "3"^^xsd:integer) literals.
function isNumericProp(p: { distinctValues: string[] }): boolean {
  return (
    p.distinctValues.length > 0 &&
    p.distinctValues.every(v => !isNaN(Number(v)) && v.trim() !== '')
  )
}

export const PREFIXES = `PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX owl:  <http://www.w3.org/2002/07/owl#>
PREFIX vet:  <${VET_NS}>`

function filterClause(varName: string, filter: PropertyFilter): string {
  const v = `?${varName}`
  switch (filter.matchType) {
    case 'numeric':
      return `FILTER(BOUND(${v}) && str(${v}) = "${filter.value}")`
    case 'exact':
      return `FILTER(BOUND(${v}) && LCASE(str(${v})) = "${filter.value.toLowerCase()}")`
    case 'contains':
      return `FILTER(BOUND(${v}) && CONTAINS(LCASE(str(${v})), "${filter.value.toLowerCase()}"))`
  }
}

function optionalsForClass(
  cls: ClassSchema,
  instanceVar: string,
  propVarPrefix: string,
  skipProp: string | undefined,
  lang: Language,
): string {
  return cls.datatypeProps
    .filter(p => p.fullIri !== skipProp)
    .map(p => {
      const varName = `?${propVarPrefix}${p.localName}`
      // Numeric props may be stored without a language tag — accept both tagged and untagged
      const langFilter = UNTAGGED_PROPS.has(p.localName)
        ? `FILTER(lang(${varName}) = "")`
        : isNumericProp(p)
          ? `FILTER(lang(${varName}) = "${lang}" || lang(${varName}) = "")`
          : `FILTER(lang(${varName}) = "${lang}")`
      return `  OPTIONAL { ?${instanceVar} <${p.fullIri}> ${varName} . ${langFilter} }`
    })
    .join('\n')
}

function buildSingleEntityQuery(context: EntityContext, schema: OntologySchema, lang: Language): string {
  const cls = schema.classes.get(context.className)
  if (!cls) return buildContentSearchQuery(context.className, schema, lang)

  const optionalBlocks = optionalsForClass(cls, 'instance', '', cls.labelProperty, lang)
  const labelLocalName = cls.labelProperty.split('#').pop() ?? ''

  const filterClauses = context.propertyFilters.map(f => {
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

interface JoinStep {
  fromIdx: number
  toIdx: number
  edge: RelationEdge
  forward: boolean
}

function findDirectEdge(fromClass: string, toClass: string, schema: OntologySchema): JoinStep | null {
  const fwdEdges = schema.adjacency.get(fromClass) ?? []
  const fwd = fwdEdges.find(e => e.toClass === toClass)
  if (fwd) return { fromIdx: -1, toIdx: -1, edge: fwd, forward: true }

  const revEdges = schema.adjacency.get(toClass) ?? []
  const rev = revEdges.find(e => e.toClass === fromClass)
  if (rev) return { fromIdx: -1, toIdx: -1, edge: rev, forward: false }

  return null
}

function findJoinPath(classNames: string[], schema: OntologySchema): JoinStep[] | null {
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
  if (step.forward) return `  ?${fromVar} <${step.edge.predicateIri}> ?${toVar} .`
  return `  ?${toVar} <${step.edge.predicateIri}> ?${fromVar} .`
}

function buildMultiEntityQuery(
  contexts: EntityContext[],
  rawInput: string,
  schema: OntologySchema,
  lang: Language,
): { query: string; resolvedMode: 'multi-entity' | 'content' } {
  const classNames = contexts.map(c => c.className)
  const joinSteps = findJoinPath(classNames, schema)

  if (!joinSteps) {
    return { query: buildContentSearchQuery(rawInput, schema, lang), resolvedMode: 'content' }
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
    // Lang filter prevents one row per language variant when labels are multilingual
    return `  OPTIONAL { ?var${i} <${cls.labelProperty}> ?var${i}Name . FILTER(lang(?var${i}Name) = "${lang}" || lang(?var${i}Name) = "") }`
  }).join('\n')

  const optionalAndFilterBlocks = contexts.map((c, i) => {
    const cls = schema.classes.get(c.className)
    if (!cls) return ''

    const optionals = cls.datatypeProps
      .filter(p => p.fullIri !== cls.labelProperty)
      .map(p => {
        const varName = `?var${i}_${p.localName}`
        const langFilter = UNTAGGED_PROPS.has(p.localName)
          ? `FILTER(lang(${varName}) = "")`
          : isNumericProp(p)
            ? `FILTER(lang(${varName}) = "${lang}" || lang(${varName}) = "")`
            : `FILTER(lang(${varName}) = "${lang}")`
        return `  OPTIONAL { ?var${i} <${p.fullIri}> ${varName} . ${langFilter} }`
      })
      .join('\n')

    const clsLabelLocalName = cls.labelProperty.split('#').pop() ?? ''
    const filters = c.propertyFilters
      .map(f => {
        const varName = f.propertyLocalName === clsLabelLocalName
          ? `var${i}Name`
          : `var${i}_${f.propertyLocalName}`
        return `  ${filterClause(varName, f)}`
      })
      .join('\n')

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

function buildContentSearchQuery(term: string, schema: OntologySchema, lang: Language): string {
  const t = term.toLowerCase().trim()
  if (t.length < 3) {
    return `${PREFIXES}\nSELECT DISTINCT ?instance ?className ?labelVal ?matchProp ?matchVal WHERE { FILTER(false) }`
  }
  const labelProps = [...new Set(Array.from(schema.classes.values()).map(c => c.labelProperty))]
    .map(iri => `<${iri}>`)
    .join(', ')

  // Match against vet: datatype properties OR against rdfs:label filtered by
  // the active language. This makes multilingual labels (e.g. "Vaccination N"
  // in English) discoverable even though data values are stored in Spanish.
  return `${PREFIXES}
SELECT ?instance ?className ?labelVal ?matchProp ?matchVal WHERE {
  {
    SELECT DISTINCT ?instance ?className ?matchProp ?matchVal WHERE {
      ?instance rdf:type ?class .
      FILTER(STRSTARTS(STR(?class), "${VET_NS}"))
      BIND(STRAFTER(STR(?class), "#") AS ?className)
      ?instance ?matchProp ?matchVal .
      FILTER(
        isLiteral(?matchVal) && CONTAINS(LCASE(str(?matchVal)), "${t}")
        && (
          (?matchProp = rdfs:label && lang(?matchVal) = "${lang}")
          || (STRSTARTS(STR(?matchProp), "${VET_NS}") && (lang(?matchVal) = "" || lang(?matchVal) = "${lang}"))
        )
      )
    }
  }
  OPTIONAL {
    ?instance ?labelPred ?labelVal .
    FILTER(?labelPred IN (${labelProps}))
    FILTER(lang(?labelVal) = "${lang}" || lang(?labelVal) = "")
  }
}
LIMIT 200`
}

export interface BuildQueryResult {
  query: string
  resolvedMode: ParsedQuery['searchMode']
}

export function buildQuery(parsed: ParsedQuery, schema: OntologySchema, lang: Language = 'es'): BuildQueryResult {
  console.group('[sparqlBuilder] buildQuery')
  console.log('searchMode:', parsed.searchMode, '| contexts:', parsed.entityContexts.map(c => c.className))

  let result: BuildQueryResult

  switch (parsed.searchMode) {
    case 'entity':
      result = {
        resolvedMode: 'entity',
        query: parsed.entityContexts.length > 0
          ? buildSingleEntityQuery(parsed.entityContexts[0], schema, lang)
          : buildContentSearchQuery(parsed.rawInput, schema, lang),
      }
      break

    case 'multi-entity': {
      const r = buildMultiEntityQuery(parsed.entityContexts, parsed.rawInput, schema, lang)
      result = { query: r.query, resolvedMode: r.resolvedMode }
      break
    }

    case 'content':
    case 'fallback':
    default:
      result = {
        resolvedMode: parsed.searchMode === 'fallback' ? 'fallback' : 'content',
        query: buildContentSearchQuery(parsed.rawInput, schema, lang),
      }
      break
  }

  console.groupEnd()
  return result
}

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
