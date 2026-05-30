// Maps user search terms to ontology class names.
// The entity map is built dynamically from the ontology store at startup —
// no domain terms (disease names, vet names, species values, etc.) are hardcoded here.
// Only schema-level meta terms (class names, professional titles) remain static.
import { StemmerEs, StopwordsEs } from '@nlpjs/lang-es'
import type { Store } from 'n3'
import { runQuery } from './sparqlExecutor'

const _stemmer = new StemmerEs()
_stemmer.stopwords = new StopwordsEs()

export type OntologyClass =
  | 'Animal'
  | 'Enfermedad'
  | 'Medicamento'
  | 'Veterinario'
  | 'Consulta'
  | 'Vacunacion'
  | 'Tratamiento'
  | 'ExamenMedico'
  | 'Cirugia'
  | 'Dueno'

// Terms that name the class generically (no extra value filter needed in SPARQL)
export const GENERIC_CLASS_TERMS = new Set([
  'animal', 'animales', 'mascota', 'mascotas',
  'enfermedad', 'enfermedades',
  'medicamento', 'medicamentos', 'medicina', 'medicinas',
  'veterinario', 'veterinarios', 'veterinaria',
  'consulta', 'consultas',
  'vacuna', 'vacunas', 'vacunacion', 'vacunaciones',
  'tratamiento', 'tratamientos',
  'examen', 'examenes', 'exámenes',
  'cirugia', 'cirugias', 'cirugía', 'cirugías',
  'dueno', 'duenos', 'dueño', 'dueños', 'propietario', 'propietarios',
])

// Schema-level meta terms: describe ontology classes, not data instances.
const META_CLASS_MAP: Record<string, OntologyClass> = {
  animal: 'Animal', animales: 'Animal', mascota: 'Animal', mascotas: 'Animal',
  enfermedad: 'Enfermedad', enfermedades: 'Enfermedad',
  medicamento: 'Medicamento', medicamentos: 'Medicamento',
  medicina: 'Medicamento', medicinas: 'Medicamento',
  veterinario: 'Veterinario', veterinarios: 'Veterinario', veterinaria: 'Veterinario',
  vet: 'Veterinario', dr: 'Veterinario', dra: 'Veterinario',
  doctor: 'Veterinario', doctora: 'Veterinario',
  consulta: 'Consulta', consultas: 'Consulta',
  vacuna: 'Vacunacion', vacunas: 'Vacunacion',
  vacunacion: 'Vacunacion', vacunaciones: 'Vacunacion',
  tratamiento: 'Tratamiento', tratamientos: 'Tratamiento',
  examen: 'ExamenMedico', examenes: 'ExamenMedico', exámenes: 'ExamenMedico',
  analisis: 'ExamenMedico', análisis: 'ExamenMedico',
  cirugia: 'Cirugia', cirugias: 'Cirugia', cirugía: 'Cirugia', cirugías: 'Cirugia',
  operacion: 'Cirugia', operaciones: 'Cirugia',
  dueno: 'Dueno', duenos: 'Dueno', dueño: 'Dueno', dueños: 'Dueno',
  propietario: 'Dueno', propietarios: 'Dueno',
}

// All text properties to query per class when building the dynamic entity map.
export const CLASS_SEARCH_PROPS: Record<OntologyClass, string[]> = {
  Animal:       ['vet:nombreAnimal', 'vet:raza'],
  Enfermedad:   ['vet:nombreEnfermedad', 'vet:tipoEnfermedad', 'vet:nivelGravedad', 'vet:sintomas', 'vet:descripcionEnfermedad'],
  Medicamento:  ['vet:nombreMedicamento', 'vet:tipoMedicamento', 'vet:viaAdministracion'],
  Veterinario:  ['vet:nombre', 'vet:especialidad'],
  Consulta:     ['vet:descripcionServicio', 'vet:diagnosticoInicial', 'vet:sintomasReportados'],
  Vacunacion:   ['vet:tipoVacuna'],
  Tratamiento:  ['vet:tipoTratamiento'],
  ExamenMedico: ['vet:tipoExamen', 'vet:resultado'],
  Cirugia:      ['vet:tipoCirugia'],
  Dueno:        ['vet:nombre'],
}

export interface EntityMap {
  termToClass: Map<string, OntologyClass>
  speciesValues: Map<string, string>
  razaValues: Map<string, string>
}

const NS = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX vet: <http://www.semanticweb.org/grupo14/ontologias/veterinaria#>`


function registerValue(map: Map<string, OntologyClass>, raw: string, cls: OntologyClass) {
  const lower = raw.toLowerCase().trim()
  if (!lower) return

  // Solo registrar si no existe ya 
  if (!map.has(lower)) map.set(lower, cls)

  const fullStem = _stemmer.tokenizeAndStem(lower, false)[0]
  if (fullStem && !map.has(fullStem)) map.set(fullStem, cls)

  const words = lower.split(/[\s,;]+/).filter(w => w.length > 2)
  for (const word of words) {
    if (word === lower) continue
    if (!map.has(word)) map.set(word, cls)
    const stem = _stemmer.tokenizeAndStem(word, false)[0]
    if (stem && !map.has(stem)) map.set(stem, cls)
  }
}

export const META_ENTITY_MAP: EntityMap = (() => {
  const termToClass = new Map<string, OntologyClass>()
  for (const [term, cls] of Object.entries(META_CLASS_MAP)) {
    // Para el mapa meta sí usamos set directo (no hay riesgo de sobreescritura)
    termToClass.set(term, cls)
    const stem = _stemmer.tokenizeAndStem(term, false)[0]
    if (stem) termToClass.set(stem, cls)
  }
  return { termToClass, speciesValues: new Map(), razaValues: new Map() }
})()

export async function buildEntityMap(store: Store): Promise<EntityMap> {
  const termToClass   = new Map(META_ENTITY_MAP.termToClass)
  const speciesValues = new Map<string, string>()
  const razaValues    = new Map<string, string>()

  // Query all text property values for every class in parallel
  const allPropQueries = (Object.entries(CLASS_SEARCH_PROPS) as Array<[OntologyClass, string[]]>)
    .flatMap(([cls, props]) => props.map(prop => ({ cls, prop })))

  await Promise.all(
    allPropQueries.map(async ({ cls, prop }) => {
      const q = `${NS}
SELECT ?val WHERE { ?i rdf:type vet:${cls} . ?i ${prop} ?val . }`
      const rows = await runQuery(store, q, { silent: true })
      for (const row of rows) {
        if (row.val) registerValue(termToClass, row.val, cls)
      }
    })
  )

  // ── Especies: singular, plural 
  const speciesRows = await runQuery(
    store,
    `${NS}
SELECT DISTINCT ?especie WHERE { ?a rdf:type vet:Animal . ?a vet:especie ?especie . }`,
    { silent: true },
  )

  for (const row of speciesRows) {
    if (!row.especie) continue
    const lower = row.especie.toLowerCase()

    // Singular
    speciesValues.set(lower, row.especie)
    if (!termToClass.has(lower)) termToClass.set(lower, 'Animal')

    // Plural simple: gato → gatos, perro → perros
    const plural = lower.endsWith('s') ? lower : lower + 's'
    speciesValues.set(plural, row.especie)
    if (!termToClass.has(plural)) termToClass.set(plural, 'Animal')

    // Stem
    const stems = _stemmer.tokenizeAndStem(lower, false)
    if (stems[0]) {
      if (!termToClass.has(stems[0])) termToClass.set(stems[0], 'Animal')
      if (!speciesValues.has(stems[0])) speciesValues.set(stems[0], row.especie)
    }
  }

  // ── Razas
  const razaRows = await runQuery(
    store,
    `${NS}
SELECT DISTINCT ?raza WHERE { ?a rdf:type vet:Animal . ?a vet:raza ?raza . }`,
    { silent: true },
  )

  for (const row of razaRows) {
    if (!row.raza) continue
    const lower = row.raza.toLowerCase()

    // Frase completa: "golden retriever", "maine coon"
    razaValues.set(lower, row.raza)
    if (!termToClass.has(lower)) termToClass.set(lower, 'Animal')

    // Plural de la frase completa
    const plural = lower.endsWith('s') ? lower : lower + 's'
    razaValues.set(plural, row.raza)
    if (!termToClass.has(plural)) termToClass.set(plural, 'Animal')

    // Palabras individuales: "golden", "retriever", "maine", "coon"
    const words = lower.split(/\s+/).filter(w => w.length > 2)
    for (const word of words) {
      if (word === lower) continue
      razaValues.set(word, row.raza)
      if (!termToClass.has(word)) termToClass.set(word, 'Animal')
      const stem = _stemmer.tokenizeAndStem(word, false)[0]
      if (stem) {
        if (!termToClass.has(stem)) termToClass.set(stem, 'Animal')
        if (!razaValues.has(stem)) razaValues.set(stem, row.raza)
      }
    }

    // Stem de la frase completa
    const fullStem = _stemmer.tokenizeAndStem(lower, false)[0]
    if (fullStem) {
      if (!termToClass.has(fullStem)) termToClass.set(fullStem, 'Animal')
      if (!razaValues.has(fullStem)) razaValues.set(fullStem, row.raza)
    }
  }

  return { termToClass, speciesValues, razaValues }
}

export function detectEntityType(term: string, map: EntityMap): OntologyClass | null {
  const lower = term.toLowerCase().trim()
  const direct = map.termToClass.get(lower)
  if (direct) return direct
  const stems = _stemmer.tokenizeAndStem(lower, false)
  return (stems[0] ? map.termToClass.get(stems[0]) : undefined) ?? null
}

export function isGenericTerm(term: string): boolean {
  return GENERIC_CLASS_TERMS.has(term.toLowerCase().trim())
}

export function resolveSpeciesValue(term: string, map: EntityMap): string | null {
  const lower = term.toLowerCase().trim()
  return map.speciesValues.get(lower) ?? null
}

export function resolveRazaValue(term: string, map: EntityMap): string | null {
  const lower = term.toLowerCase().trim()
  return map.razaValues.get(lower) ?? null
}
