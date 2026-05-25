// Builds SPARQL queries dynamically from parsed query intent.
// Handles single-class lookup, relational joins, and broad text fallback.

import type { EntityMap, OntologyClass } from './entityDetector'
import { CLASS_SEARCH_PROPS, isGenericTerm, resolveSpeciesValue } from './entityDetector'

const VET_NS = 'http://www.semanticweb.org/grupo14/ontologias/veterinaria#'
export const PREFIXES = `PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX owl:  <http://www.w3.org/2002/07/owl#>
PREFIX vet:  <${VET_NS}>`

// Primary label property for each class
const CLASS_LABEL: Record<OntologyClass, string> = {
  Animal:       'vet:nombreAnimal',
  Enfermedad:   'vet:nombreEnfermedad',
  Medicamento:  'vet:nombreMedicamento',
  Veterinario:  'vet:nombre',
  Consulta:     'vet:descripcionServicio',
  Vacunacion:   'vet:tipoVacuna',
  Tratamiento:  'vet:tipoTratamiento',
  ExamenMedico: 'vet:tipoExamen',
  Cirugia:      'vet:tipoCirugia',
  Dueno:        'vet:nombre',
}

// SPARQL join fragment for ?subject (primary) → ?object (secondary).
const JOIN_PATTERN: Partial<Record<OntologyClass, Partial<Record<OntologyClass, string>>>> = {
  Animal: {
    Enfermedad:   '?object vet:afectaA ?subject .',
    Dueno:        '?subject vet:tieneDueno ?object .',
    Veterinario:  '?subject vet:esAtendidoPor ?object .',
    Consulta:     '?object vet:realizadoA ?subject .',
    Vacunacion:   '?object vet:realizadoA ?subject .',
    Tratamiento:  '?object vet:realizadoA ?subject .',
    Medicamento:  '?object vet:administradoA ?subject .',
  },
  Enfermedad: {
    Animal:       '?subject vet:afectaA ?object .',
    Medicamento:  '?object vet:trata ?subject .',
    Veterinario:  '?subject vet:diagnosticadaPor ?object .',
  },
  Medicamento: {
    Enfermedad:   '?subject vet:trata ?object .',
    Animal:       '?subject vet:administradoA ?object .',
    Veterinario:  '?subject vet:prescritoPor ?object .',
  },
  Consulta: {
    Animal:       '?subject vet:realizadoA ?object .',
    Veterinario:  '?subject vet:realizadoPor ?object .',
    Enfermedad:   '?subject vet:correspondeA ?object .',
    Medicamento:  '?subject vet:usa ?object .',
  },
  Vacunacion: {
    Animal:       '?subject vet:realizadoA ?object .',
    Veterinario:  '?subject vet:realizadoPor ?object .',
  },
  Tratamiento: {
    Animal:       '?subject vet:realizadoA ?object .',
    Veterinario:  '?subject vet:realizadoPor ?object .',
  },
}

// Additional OPTIONAL fields per class for single-class queries (beyond the label)
const CLASS_EXTRA: Record<OntologyClass, string> = {
  Animal: `
  OPTIONAL { ?instance vet:especie ?especie }
  OPTIONAL { ?instance vet:raza ?raza }
  OPTIONAL { ?instance vet:sexo ?sexo }
  OPTIONAL { ?instance vet:edad ?edad }`,
  Enfermedad: `
  OPTIONAL { ?instance vet:tipoEnfermedad ?tipoEnfermedad }
  OPTIONAL { ?instance vet:nivelGravedad ?nivelGravedad }
  OPTIONAL { ?instance vet:sintomas ?sintomas }`,
  Medicamento: `
  OPTIONAL { ?instance vet:tipoMedicamento ?tipoMedicamento }
  OPTIONAL { ?instance vet:dosisMedicamento ?dosisMedicamento }
  OPTIONAL { ?instance vet:viaAdministracion ?viaAdministracion }`,
  Veterinario: `
  OPTIONAL { ?instance vet:telefono ?telefono }
  OPTIONAL { ?instance vet:especialidad ?especialidad }`,
  Consulta: `
  OPTIONAL { ?instance vet:fecha ?fecha }
  OPTIONAL { ?instance vet:diagnosticoInicial ?diagnosticoInicial }
  OPTIONAL { ?instance vet:sintomasReportados ?sintomasReportados }`,
  Vacunacion: `
  OPTIONAL { ?instance vet:fecha ?fecha }
  OPTIONAL { ?instance vet:dosisVacunacion ?dosisVacunacion }`,
  Tratamiento: `
  OPTIONAL { ?instance vet:fecha ?fecha }
  OPTIONAL { ?instance vet:duracion ?duracion }`,
  ExamenMedico: `
  OPTIONAL { ?instance vet:fecha ?fecha }
  OPTIONAL { ?instance vet:resultado ?resultado }`,
  Cirugia: `
  OPTIONAL { ?instance vet:fecha ?fecha }`,
  Dueno: `
  OPTIONAL { ?instance vet:telefono ?telefono }`,
}

export interface QueryParams {
  isRelational: boolean
  primaryTerm: string
  secondaryTerm: string | null
  primaryType: OntologyClass | null
  secondaryType: OntologyClass | null
  rawInput: string
  entityMap: EntityMap
}

// Returns non-label property local names (variable names) that are searchable for a class.
// Example: Enfermedad → ['tipoEnfermedad', 'nivelGravedad', 'sintomas']
function getNonLabelVars(cls: OntologyClass): string[] {
  const labelProp = CLASS_LABEL[cls]
  return CLASS_SEARCH_PROPS[cls]
    .filter(p => p !== labelProp)
    .map(p => p.split(':')[1])
}

// Builds a multi-property FILTER clause (label + all extra searchable fields).
// Uses BOUND checks to handle unbound OPTIONAL variables safely.
function buildTextFilter(term: string, labelVar: string, extraVars: string[]): string {
  const t = term.toLowerCase()
  const conditions = [
    `(BOUND(?${labelVar}) && CONTAINS(LCASE(?${labelVar}), "${t}"))`,
    ...extraVars.map(v => `(BOUND(?${v}) && CONTAINS(LCASE(?${v}), "${t}"))`),
  ]
  return `FILTER(\n  ${conditions.join('\n  || ')}\n)`
}

// For relational queries: builds extra OPTIONALs and a FILTER for one side (subject/object).
// prefixedVarSuffix distinguishes vars between subject and object sides.
function buildRelationalSideFilter(
  side: 'subject' | 'object',
  cls: OntologyClass,
  term: string,
  entityMap: EntityMap,
): { optionals: string; filter: string } {
  if (!term || isGenericTerm(term)) return { optionals: '', filter: '' }

  const speciesVal = cls === 'Animal' ? resolveSpeciesValue(term, entityMap) : null
  if (speciesVal) {
    return {
      optionals: `OPTIONAL { ?${side} vet:especie ?${side}Especie }`,
      filter: `FILTER(LCASE(?${side}Especie) = "${speciesVal.toLowerCase()}")`,
    }
  }

  const extraVars = getNonLabelVars(cls)
  const labelVar = `${side}Name`

  if (extraVars.length === 0) {
    return {
      optionals: '',
      filter: `FILTER(CONTAINS(LCASE(?${labelVar}), "${term.toLowerCase()}"))`,
    }
  }

  // Add OPTIONALs with side-prefixed variable names to avoid conflicts in the same query
  const sideOptionals = extraVars
    .map(v => `OPTIONAL { ?${side} vet:${v} ?${side}_${v} }`)
    .join('\n  ')

  const conditions = [
    `(BOUND(?${labelVar}) && CONTAINS(LCASE(?${labelVar}), "${term.toLowerCase()}"))`,
    ...extraVars.map(v => `(BOUND(?${side}_${v}) && CONTAINS(LCASE(?${side}_${v}), "${term.toLowerCase()}"))`),
  ]
  return {
    optionals: sideOptionals,
    filter: `FILTER(\n  ${conditions.join('\n  || ')}\n)`,
  }
}

export function buildQuery(params: QueryParams): string {
  const { isRelational, primaryType, secondaryType, primaryTerm, secondaryTerm, rawInput, entityMap } = params

  if (isRelational && primaryType && secondaryType) {
    const joinPattern = JOIN_PATTERN[primaryType]?.[secondaryType]
    if (joinPattern) {
      return buildRelationalQuery(primaryType, secondaryType, joinPattern, primaryTerm, secondaryTerm ?? '', entityMap)
    }
  }

  if (primaryType) {
    return buildSingleClassQuery(primaryType, primaryTerm, entityMap)
  }

  return buildFallbackQuery(rawInput)
}

function buildRelationalQuery(
  primaryType: OntologyClass,
  secondaryType: OntologyClass,
  joinPattern: string,
  primaryTerm: string,
  secondaryTerm: string,
  entityMap: EntityMap,
): string {
  const subjectLabel = CLASS_LABEL[primaryType]
  const objectLabel  = CLASS_LABEL[secondaryType]

  const { optionals: primaryOptionals, filter: primaryFilter } =
    buildRelationalSideFilter('subject', primaryType, primaryTerm, entityMap)
  const { optionals: secondaryOptionals, filter: secondaryFilter } =
    buildRelationalSideFilter('object', secondaryType, secondaryTerm, entityMap)

  return `${PREFIXES}
SELECT ?subject ?subjectName ?object ?objectName WHERE {
  ?subject rdf:type vet:${primaryType} .
  ?object  rdf:type vet:${secondaryType} .
  ${joinPattern}
  OPTIONAL { ?subject ${subjectLabel} ?subjectName }
  OPTIONAL { ?object  ${objectLabel}  ?objectName }
  ${primaryOptionals}
  ${secondaryOptionals}
  ${primaryFilter}
  ${secondaryFilter}
}`
}

function buildSingleClassQuery(classType: OntologyClass, term: string, entityMap: EntityMap): string {
  const labelProp   = CLASS_LABEL[classType]
  const extraFields = CLASS_EXTRA[classType] ?? ''
  const extraVars   = getNonLabelVars(classType)

  const speciesValue = classType === 'Animal' ? resolveSpeciesValue(term, entityMap) : null

  let filter = ''
  if (speciesValue) {
    filter = `FILTER(LCASE(?especie) = "${speciesValue.toLowerCase()}")`
  } else if (!isGenericTerm(term)) {
    filter = buildTextFilter(term, 'name', extraVars)
  }

  return `${PREFIXES}
SELECT * WHERE {
  ?instance rdf:type vet:${classType} .
  OPTIONAL { ?instance ${labelProp} ?name }
  ${extraFields}
  ${filter}
}`
}

function buildFallbackQuery(rawInput: string): string {
  const term = rawInput.toLowerCase().trim()
  return `${PREFIXES}
SELECT ?instance ?name ?type WHERE {
  {
    ?instance vet:nombreAnimal ?name .
    ?instance rdf:type vet:Animal .
    BIND("Animal" AS ?type)
    FILTER(CONTAINS(LCASE(?name), "${term}"))
  } UNION {
    ?instance vet:nombreEnfermedad ?name .
    ?instance rdf:type vet:Enfermedad .
    BIND("Enfermedad" AS ?type)
    FILTER(CONTAINS(LCASE(?name), "${term}"))
  } UNION {
    ?instance vet:nombreMedicamento ?name .
    ?instance rdf:type vet:Medicamento .
    BIND("Medicamento" AS ?type)
    FILTER(CONTAINS(LCASE(?name), "${term}"))
  } UNION {
    ?instance vet:nombre ?name .
    ?instance rdf:type vet:Veterinario .
    BIND("Veterinario" AS ?type)
    FILTER(CONTAINS(LCASE(?name), "${term}"))
  }
}`
}
