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
  OPTIONAL { ?instance vet:sintomas ?sintomas }
  OPTIONAL { ?instance vet:descripcionEnfermedad ?descripcionEnfermedad }`,
  Medicamento: `
  OPTIONAL { ?instance vet:tipoMedicamento ?tipoMedicamento }
  OPTIONAL { ?instance vet:dosisMedicamento ?dosisMedicamento }
  OPTIONAL { ?instance vet:viaAdministracion ?viaAdministracion }
  OPTIONAL {
    ?instance vet:trata ?enf .
    ?enf vet:nombreEnfermedad ?nombreEnfermedad .
  }
  OPTIONAL {
    ?servicio vet:usa ?instance .
    ?servicio vet:descripcionServicio ?descripcionServicio .
  }`,
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
  filters?: Record<string, string>
}

// Returns non-label property local names (variable names) that are searchable for a class.
function getNonLabelVars(cls: OntologyClass): string[] {
  const labelProp = CLASS_LABEL[cls]
  return CLASS_SEARCH_PROPS[cls]
    .filter(p => p !== labelProp)
    .map(p => p.split(':')[1])
}

// Builds a multi-property FILTER clause (label + all extra searchable fields).
function buildTextFilter(term: string, labelVar: string, extraVars: string[]): string {
  const t = term.toLowerCase()
  const conditions = [
    `(BOUND(?${labelVar}) && CONTAINS(LCASE(?${labelVar}), "${t}"))`,
    ...extraVars.map(v => `(BOUND(?${v}) && CONTAINS(LCASE(?${v}), "${t}"))`),
  ]
  return `FILTER(\n  ${conditions.join('\n  || ')}\n)`
}

// Builds FILTER clauses for attribute filters (edad, sexo, raza, especie)
function buildAttrFilters(filters: Record<string, string>): string {
  return Object.entries(filters)
    .map(([key, val]) => {
      if (key === 'edad')    return `FILTER(str(?edad) = "${val}")`
      if (key === 'sexo')    return `FILTER(LCASE(?sexo) = "${val.toLowerCase()}")`
      if (key === 'raza')    return `FILTER(CONTAINS(LCASE(?raza), "${val.toLowerCase()}"))`
      if (key === 'especie') return `FILTER(LCASE(?especie) = "${val.toLowerCase()}")`
      return ''
    })
    .filter(Boolean)
    .join('\n  ')
}

// Para el lado Animal en queries relacionales cuando los filtros vienen de filters{}
function buildAnimalAttrSideFilter(
  filters: Record<string, string>,
): { optionals: string; filter: string } {
  const optionals: string[] = []
  const conditions: string[] = []

  if (filters.especie) {
    optionals.push('OPTIONAL { ?subject vet:especie ?subjectEspecie }')
    conditions.push(`LCASE(?subjectEspecie) = "${filters.especie.toLowerCase()}"`)
  }
  if (filters.raza) {
    optionals.push('OPTIONAL { ?subject vet:raza ?subjectRaza }')
    conditions.push(`CONTAINS(LCASE(?subjectRaza), "${filters.raza.toLowerCase()}")`)
  }
  if (filters.sexo) {
    optionals.push('OPTIONAL { ?subject vet:sexo ?subjectSexo }')
    conditions.push(`LCASE(?subjectSexo) = "${filters.sexo.toLowerCase()}"`)
  }
  if (filters.edad) {
    optionals.push('OPTIONAL { ?subject vet:edad ?subjectEdad }')
    conditions.push(`str(?subjectEdad) = "${filters.edad}"`)
  }

  return {
    optionals: optionals.join('\n  '),
    filter: conditions.length > 0 ? `FILTER(${conditions.join(' && ')})` : '',
  }
}

// For relational queries: builds extra OPTIONALs and a FILTER for one side.
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
  const {
    isRelational,
    primaryType,
    secondaryType,
    primaryTerm,
    secondaryTerm,
    rawInput,
    entityMap,
    filters = {},
  } = params

  // FIX: el modo relacional tiene prioridad sobre todo, incluso si hay filtros de especie/raza
  // Ej: "perro con otitis" → isRelational=true, primaryType=Animal, secondaryType=Enfermedad
  if (isRelational && primaryType && secondaryType) {
    const joinPattern = JOIN_PATTERN[primaryType]?.[secondaryType]
    if (joinPattern) {
      return buildRelationalQuery(
        primaryType, secondaryType, joinPattern,
        primaryTerm, secondaryTerm ?? '', entityMap, filters,
      )
    }
  }

  // Solo llega aquí si NO es relacional
  if (filters.especie || filters.raza) {
    return buildSingleClassQuery('Animal', primaryTerm, entityMap, filters)
  }

  if (primaryType) {
    return buildSingleClassQuery(primaryType, primaryTerm, entityMap, filters)
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
  filters: Record<string, string> = {},
): string {
  const subjectLabel = CLASS_LABEL[primaryType]
  const objectLabel  = CLASS_LABEL[secondaryType]

  // FIX: si el lado primary es Animal y hay filtros de atributo (especie, raza, sexo, edad),
  // usar buildAnimalAttrSideFilter en vez de buildRelationalSideFilter (que buscaría por texto)
  const { optionals: primaryOptionals, filter: primaryFilter } =
    primaryType === 'Animal' && (filters.especie || filters.raza || filters.sexo || filters.edad)
      ? buildAnimalAttrSideFilter(filters)
      : buildRelationalSideFilter('subject', primaryType, primaryTerm, entityMap)

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

function buildSingleClassQuery(
  classType: OntologyClass,
  term: string,
  entityMap: EntityMap,
  filters: Record<string, string> = {},
): string {
  const labelProp   = CLASS_LABEL[classType]
  const extraFields = CLASS_EXTRA[classType] ?? ''
  const extraVars   = getNonLabelVars(classType)

  // Si ya hay filtro de especie en filters, no duplicar con speciesValue
  const speciesValue = (!filters.especie && classType === 'Animal')
    ? resolveSpeciesValue(term, entityMap)
    : null

  let filter = ''
  if (speciesValue) {
    filter = `FILTER(LCASE(?especie) = "${speciesValue.toLowerCase()}")`
  } else if (!isGenericTerm(term) && !filters.especie && !filters.raza) {
    filter = buildTextFilter(term, 'name', extraVars)
  }

  const attrFilters = buildAttrFilters(filters)

  return `${PREFIXES}
SELECT * WHERE {
  ?instance rdf:type vet:${classType} .
  OPTIONAL { ?instance ${labelProp} ?name }
  ${extraFields}
  ${filter}
  ${attrFilters}
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
