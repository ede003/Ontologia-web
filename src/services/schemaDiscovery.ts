import type { Store } from 'n3'
import { runQuery } from '../utils/sparqlExecutor'

const VET_NS = 'http://www.semanticweb.org/grupo14/ontologias/veterinaria#'

const PREFIXES = `
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX owl:  <http://www.w3.org/2002/07/owl#>
PREFIX vet:  <${VET_NS}>
`

export interface PropertySchema {
  localName: string
  fullIri: string
  distinctValues: string[]
}

export interface RelationEdge {
  predicateLocalName: string
  predicateIri: string
  fromClass: string
  toClass: string
}

export interface ClassSchema {
  localName: string
  fullIri: string
  labelProperty: string
  datatypeProps: PropertySchema[]
  objectProps: RelationEdge[]
}

export interface OntologySchema {
  classes: Map<string, ClassSchema>
  relations: RelationEdge[]
  adjacency: Map<string, RelationEdge[]>
}

function localName(iri: string): string {
  const hash = iri.lastIndexOf('#')
  const slash = iri.lastIndexOf('/')
  return iri.slice(Math.max(hash, slash) + 1)
}

function isVetIri(iri: string): boolean {
  return iri.startsWith(VET_NS)
}

// Heuristic: find the most descriptive label property for a class
function detectLabelProperty(className: string, props: PropertySchema[]): string {
  const irisLower = props.map(p => ({ p, low: p.localName.toLowerCase() }))

  // 1. vet:nombre{ClassName} e.g. nombreAnimal
  const exact = irisLower.find(({ low }) => low === `nombre${className.toLowerCase()}`)
  if (exact) return exact.p.fullIri

  // 2. vet:nombre (generic)
  const generic = irisLower.find(({ low }) => low === 'nombre')
  if (generic) return generic.p.fullIri

  // 3. prop whose name contains "descripcion"
  const desc = irisLower.find(({ low }) => low.includes('descripcion'))
  if (desc) return desc.p.fullIri

  // 4. prop that starts with "tipo"
  const tipo = irisLower.find(({ low }) => low.startsWith('tipo'))
  if (tipo) return tipo.p.fullIri

  // 5. first available datatype prop
  return props[0]?.fullIri ?? `${VET_NS}nombre`
}

// Discover all vet: classes that have NamedIndividual instances
async function discoverClasses(store: Store): Promise<string[]> {
  const rows = await runQuery(store, `${PREFIXES}
SELECT DISTINCT ?class WHERE {
  ?i rdf:type owl:NamedIndividual .
  ?i rdf:type ?class .
  FILTER(?class != owl:NamedIndividual)
  FILTER(?class != owl:Thing)
  FILTER(STRSTARTS(STR(?class), "${VET_NS}"))
}`, { silent: true })
  return rows.map(r => r.class).filter(Boolean)
}

// Discover actual literal predicates used by instances of a class
async function discoverDatatypePredicates(store: Store, classIri: string): Promise<string[]> {
  const rows = await runQuery(store, `${PREFIXES}
SELECT DISTINCT ?pred WHERE {
  ?i rdf:type <${classIri}> .
  ?i ?pred ?val .
  FILTER(isLiteral(?val))
  FILTER(STRSTARTS(STR(?pred), "${VET_NS}"))
}`, { silent: true })
  return rows.map(r => r.pred).filter(Boolean)
}

// Discover distinct literal values for a (class, predicate) pair
async function discoverDistinctValues(
  store: Store,
  classIri: string,
  predIri: string
): Promise<string[]> {
  const rows = await runQuery(store, `${PREFIXES}
SELECT DISTINCT ?val WHERE {
  ?i rdf:type <${classIri}> .
  ?i <${predIri}> ?val .
  FILTER(isLiteral(?val))
} LIMIT 200`, { silent: true })
  return rows.map(r => r.val).filter(v => v !== undefined && v !== '')
}

// Discover object properties per class (relations to other vet: classes)
async function discoverObjectPredicates(
  store: Store,
  classIri: string
): Promise<Array<{ predIri: string; targetClassIri: string }>> {
  const rows = await runQuery(store, `${PREFIXES}
SELECT DISTINCT ?pred ?targetClass WHERE {
  ?i rdf:type <${classIri}> .
  ?i ?pred ?target .
  ?target rdf:type ?targetClass .
  FILTER(isIRI(?target))
  FILTER(STRSTARTS(STR(?pred), "${VET_NS}"))
  FILTER(STRSTARTS(STR(?targetClass), "${VET_NS}"))
  FILTER(?targetClass != owl:NamedIndividual)
}`, { silent: true })
  return rows
    .filter(r => r.pred && r.targetClass)
    .map(r => ({ predIri: r.pred, targetClassIri: r.targetClass }))
}

export async function buildOntologySchema(store: Store): Promise<OntologySchema> {
  console.group('[schemaDiscovery] Construyendo schema de la ontología')

  // Step 1: discover all classes
  const classIris = await discoverClasses(store)
  console.log(`Clases encontradas: ${classIris.length}`, classIris.map(localName))

  // Step 2: for each class, discover datatype props and object props in parallel
  const classEntries = await Promise.all(
    classIris.map(async (classIri): Promise<[string, ClassSchema]> => {
      const clsName = localName(classIri)

      const [dtPreds, objPreds] = await Promise.all([
        discoverDatatypePredicates(store, classIri),
        discoverObjectPredicates(store, classIri),
      ])

      // Step 3: for each datatype predicate, collect distinct values
      const datatypeProps: PropertySchema[] = await Promise.all(
        dtPreds.map(async (predIri): Promise<PropertySchema> => {
          const values = await discoverDistinctValues(store, classIri, predIri)
          return { localName: localName(predIri), fullIri: predIri, distinctValues: values }
        })
      )

      const objectProps: RelationEdge[] = objPreds
        .filter(({ targetClassIri }) => isVetIri(targetClassIri))
        .map(({ predIri, targetClassIri }) => ({
          predicateLocalName: localName(predIri),
          predicateIri: predIri,
          fromClass: clsName,
          toClass: localName(targetClassIri),
        }))

      const labelProperty = detectLabelProperty(clsName, datatypeProps)

      return [clsName, {
        localName: clsName,
        fullIri: classIri,
        labelProperty,
        datatypeProps,
        objectProps,
      }]
    })
  )

  const classes = new Map<string, ClassSchema>(classEntries)

  // Step 4: collect all relation edges and build adjacency map
  const relations: RelationEdge[] = []
  const adjacency = new Map<string, RelationEdge[]>()

  for (const [, cls] of classes) {
    for (const edge of cls.objectProps) {
      // Deduplicate: skip if same predIri+fromClass+toClass already present
      if (!relations.some(r => r.predicateIri === edge.predicateIri && r.fromClass === edge.fromClass && r.toClass === edge.toClass)) {
        relations.push(edge)
      }
      const existing = adjacency.get(edge.fromClass) ?? []
      if (!existing.some(e => e.predicateIri === edge.predicateIri && e.toClass === edge.toClass)) {
        adjacency.set(edge.fromClass, [...existing, edge])
      }
    }
  }

  // Remove OWL_NS class (owl:NamedIndividual) if accidentally captured
  classes.delete('NamedIndividual')
  classes.delete('Thing')

  console.log(`Schema listo: ${classes.size} clases, ${relations.length} relaciones`)
  console.log('Relaciones:', relations.map(r => `${r.fromClass} --[${r.predicateLocalName}]--> ${r.toClass}`))
  console.groupEnd()

  return { classes, relations, adjacency }
}
