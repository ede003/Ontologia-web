import { StemmerEs, StopwordsEs } from '@nlpjs/lang-es'
import type { Store } from 'n3'
import type { OntologySchema } from '../services/schemaDiscovery'

export const _stemmer = new StemmerEs()
_stemmer.stopwords = new StopwordsEs()

// Dynamic string — class names are discovered from the ontology at runtime
export type OntologyClass = string

export interface PropertyValueMatch {
  className: string
  propertyLocalName: string
  canonicalValue: string
}

export interface EntityMap {
  termToClass: Map<string, string>
  termToPropertyValue: Map<string, PropertyValueMatch[]>
  classNames: Set<string>
}

export const EMPTY_ENTITY_MAP: EntityMap = {
  termToClass: new Map(),
  termToPropertyValue: new Map(),
  classNames: new Set(),
}

// ─── Internal helpers ───────────────────────────────────────────────────────

function stem(word: string): string | undefined {
  return _stemmer.tokenizeAndStem(word, false)[0]
}

// Split "ExamenMedico" → ["examen", "medico"], "Animal" → ["animal"]
function splitCamelCase(name: string): string[] {
  return name
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 0)
}

function addToClassMap(map: Map<string, string>, key: string, cls: string) {
  if (!map.has(key)) map.set(key, cls)
}

function registerClassTerms(map: Map<string, string>, className: string) {
  const words = splitCamelCase(className)
  const fullLower = className.toLowerCase()

  // Full name lowercase
  addToClassMap(map, fullLower, className)
  // Plural
  const plural = fullLower.endsWith('s') ? fullLower : fullLower + 's'
  addToClassMap(map, plural, className)
  // Stem of full name
  const s = stem(fullLower)
  if (s) addToClassMap(map, s, className)

  // Each camelCase word
  for (const word of words) {
    if (word === fullLower) continue
    addToClassMap(map, word, className)
    addToClassMap(map, word + 's', className)
    const ws = stem(word)
    if (ws) addToClassMap(map, ws, className)
  }
}

// When the same (propLocalName, canonicalValue) appears in multiple classes (denormalized data),
// keep only the class with the most incoming relations — the most "central" entity.
function addToValueMap(
  map: Map<string, PropertyValueMatch[]>,
  key: string,
  match: PropertyValueMatch,
  incomingCount: Map<string, number>
) {
  const existing = map.get(key) ?? []

  // Find a conflict: same prop+value but different class
  const conflictIdx = existing.findIndex(
    e => e.propertyLocalName === match.propertyLocalName &&
         e.canonicalValue === match.canonicalValue &&
         e.className !== match.className
  )

  if (conflictIdx >= 0) {
    const prevScore = incomingCount.get(existing[conflictIdx].className) ?? 0
    const newScore  = incomingCount.get(match.className) ?? 0
    if (newScore > prevScore) {
      const updated = [...existing]
      updated[conflictIdx] = match
      map.set(key, updated)
    }
    return
  }

  const dup = existing.some(
    e => e.className === match.className &&
         e.propertyLocalName === match.propertyLocalName &&
         e.canonicalValue === match.canonicalValue
  )
  if (!dup) map.set(key, [...existing, match])
}

function registerPropertyValue(
  map: Map<string, PropertyValueMatch[]>,
  raw: string,
  className: string,
  propLocalName: string,
  incomingCount: Map<string, number>
) {
  if (!raw.trim()) return
  const match: PropertyValueMatch = { className, propertyLocalName: propLocalName, canonicalValue: raw }
  const lower = raw.toLowerCase().trim()

  // Register the full value (exact) always. Stem fallback only for single-word values:
  // multi-word values must NOT register their stem because stem() returns the stem of the
  // FIRST word only — "Otitis Media Canina" → stem("otitis") = "otit", which then collides
  // with a single-word query "otitis", creating false property-value matches.
  addToValueMap(map, lower, match, incomingCount)
  if (!lower.includes(' ')) {
    const s = stem(lower)
    if (s && s !== lower) addToValueMap(map, s, match, incomingCount)
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function buildEntityMap(_store: Store, schema: OntologySchema): Promise<EntityMap> {
  const termToClass = new Map<string, string>()
  const termToPropertyValue = new Map<string, PropertyValueMatch[]>()
  const classNames = new Set<string>()

  // Count incoming relations per class: classes with more incoming edges are more "central"
  // (e.g. Animal is target of 6 relations, Vacunacion of 0). Used to resolve conflicts when
  // the same property+value appears denormalized in multiple classes.
  const incomingCount = new Map<string, number>()
  for (const rel of schema.relations) {
    incomingCount.set(rel.toClass, (incomingCount.get(rel.toClass) ?? 0) + 1)
  }

  for (const [, cls] of schema.classes) {
    classNames.add(cls.localName)
    registerClassTerms(termToClass, cls.localName)

    for (const prop of cls.datatypeProps) {
      for (const val of prop.distinctValues) {
        registerPropertyValue(termToPropertyValue, val, cls.localName, prop.localName, incomingCount)
      }
    }
  }

  // Post-process: when a key has matches from both a label property and a non-label property,
  // keep only the label-property matches. This prevents a value like "Moquillo Canino" that
  // exists in Enfermedad.nombreEnfermedad (label prop) AND in Consulta.diagnosticoInicial
  // (non-label) from creating a spurious multi-entity context with a JOIN.
  const labelPropLocalName = new Map<string, string>()
  for (const [, cls] of schema.classes) {
    const localName = cls.labelProperty.split('#').pop()
    if (localName) labelPropLocalName.set(cls.localName, localName)
  }
  for (const [key, matches] of termToPropertyValue) {
    if (matches.length <= 1) continue

    const classSet = new Set(matches.map(m => m.className))
    if (classSet.size > 1) {
      // Cross-class conflict: keep only label-property matches to prevent spurious JOINs.
      // "Moquillo Canino" in Enfermedad.nombreEnfermedad AND Consulta.diagnosticoInicial
      // → keep only the label-prop match (Enfermedad.nombreEnfermedad).
      const labelMatches = matches.filter(
        m => labelPropLocalName.get(m.className) === m.propertyLocalName
      )
      if (labelMatches.length > 0 && labelMatches.length < matches.length) {
        termToPropertyValue.set(key, labelMatches)
      }
    } else {
      // Same-class conflict: keep only non-label-property matches.
      // "loro" in Animal.especie="loro" AND Animal.nombreAnimal="Loro"
      // → keep Animal.especie (categorical filter), drop the name match.
      const nonLabelMatches = matches.filter(
        m => labelPropLocalName.get(m.className) !== m.propertyLocalName
      )
      if (nonLabelMatches.length > 0 && nonLabelMatches.length < matches.length) {
        termToPropertyValue.set(key, nonLabelMatches)
      }
    }
  }

  return { termToClass, termToPropertyValue, classNames }
}

export function detectEntityType(term: string, map: EntityMap): OntologyClass | null {
  const lower = term.toLowerCase().trim()
  const direct = map.termToClass.get(lower)
  if (direct) return direct
  const s = stem(lower)
  return (s ? map.termToClass.get(s) : undefined) ?? null
}

// A term is "generic" if it maps to a class but has no specific property value match
export function isGenericTerm(term: string, map: EntityMap): boolean {
  const lower = term.toLowerCase().trim()
  const hasClass = map.termToClass.has(lower) || !!(stem(lower) && map.termToClass.has(stem(lower)!))
  const hasValue = map.termToPropertyValue.has(lower) || !!(stem(lower) && map.termToPropertyValue.has(stem(lower)!))
  return hasClass && !hasValue
}

export function resolvePropertyValue(
  term: string,
  className: string,
  propLocalName: string,
  map: EntityMap
): string | null {
  const lower = term.toLowerCase().trim()
  const candidates =
    map.termToPropertyValue.get(lower) ??
    map.termToPropertyValue.get(stem(lower) ?? '') ??
    []
  const found = candidates.find(
    m => m.className === className && m.propertyLocalName === propLocalName
  )
  return found?.canonicalValue ?? null
}

// Legacy wrappers for backward compatibility
export function resolveSpeciesValue(term: string, map: EntityMap): string | null {
  return resolvePropertyValue(term, 'Animal', 'especie', map)
}

export function resolveRazaValue(term: string, map: EntityMap): string | null {
  return resolvePropertyValue(term, 'Animal', 'raza', map)
}
