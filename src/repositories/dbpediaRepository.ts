import { queryDBpedia } from '../services/dbpediaService'

const LOOKUP_API = 'https://lookup.dbpedia.org/api/search'
const LOOKUP_TIMEOUT_MS = 5000
const LOOKUP_MAX_RESULTS = 5

// Semantic intent hints — not domain data, just "what kind of thing are we looking for"
const ANIMAL_TYPE_HINTS = [
  'Species', 'Animal', 'Mammal', 'Eukaryote', 'Breed',
  'Dog', 'Cat', 'Bird', 'Reptile', 'Fish', 'Amphibian',
]

const DISEASE_TYPE_HINTS = [
  'Disease', 'Disorder', 'Condition', 'Infection', 'Syndrome', 'MedicalCondition',
]

type LookupDoc = {
  resource?: string[]
  typeName?: string[]
  type?: string[]
  classes?: Array<{ '@id'?: string; label?: string }>
}

// Slug cache: term → resolved slug (null = definitively not found; absent = not yet queried)
const _slugCache = new Map<string, string | null>()

function docMatchesTypeHints(doc: LookupDoc, hints: string[]): boolean {
  const lowerHints = hints.map(h => h.toLowerCase())
  const types = [
    ...(doc.typeName ?? []),
    ...(doc.type ?? []),
    ...(doc.classes ?? []).map(c => c['@id'] ?? ''),
    ...(doc.classes ?? []).map(c => c.label ?? ''),
  ]
  return types.some(t => lowerHints.some(h => t.toLowerCase().includes(h)))
}

function slugFromDoc(doc: LookupDoc): string | null {
  const resource = doc.resource?.[0]
  if (!resource) return null
  return resource.split('/').pop() ?? null
}

async function resolveSlugViaLookup(term: string, typeHints: string[]): Promise<string | null> {
  if (!term.trim()) return null
  if (_slugCache.has(term)) return _slugCache.get(term)!

  const url = `${LOOKUP_API}?query=${encodeURIComponent(term)}&maxResults=${LOOKUP_MAX_RESULTS}&format=json`
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    clearTimeout(timer)
    if (!res.ok) return null  // transient HTTP error — don't cache, allow retry
    const data = await res.json() as { docs?: LookupDoc[] }
    const docs = data?.docs ?? []
    // Prefer a doc whose declared types match the query intent; fall back to rank-1
    const best = docs.find(d => docMatchesTypeHints(d, typeHints)) ?? docs[0] ?? null
    const slug = best ? slugFromDoc(best) : null
    _slugCache.set(term, slug)  // cache definitive result (including null = not found)
    return slug
  } catch {
    return null  // network failure / timeout — don't cache, allow retry
  }
}

function buildDbpediaQuery(slug: string, lang: string, withThumbnail = false): string {
  const uri = `http://dbpedia.org/resource/${slug}`
  const thumbSelect = withThumbnail ? ' ?thumbnail' : ''
  const thumbOptional = withThumbnail ? `\n  OPTIONAL { <${uri}> dbo:thumbnail ?thumbnail }` : ''
  return `PREFIX dbo:  <http://dbpedia.org/ontology/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?abstract${thumbSelect} ?page ?dbpediaUri WHERE {
  BIND(<${uri}> AS ?dbpediaUri)
  <${uri}> dbo:abstract ?abstract .${thumbOptional}
  OPTIONAL { <${uri}> foaf:isPrimaryTopicOf ?page }
  FILTER (lang(?abstract) = '${lang}' || lang(?abstract) = 'en' || lang(?abstract) = 'es')
} ORDER BY (lang(?abstract) != '${lang}') LIMIT 3`
}

export async function getAnimalInfo(
  especie: string,
  raza: string,
  lang = 'es',
): Promise<Record<string, string>[]> {
  const razaTrimmed = raza.trim()
  const especieTrimmed = especie.trim()
  // Combined term disambiguates: "Persa gato" → Persian cat, not Persia/Irán
  const combined = [razaTrimmed, especieTrimmed].filter(Boolean).join(' ')
  if (!combined) return []

  let slug = await resolveSlugViaLookup(combined, ANIMAL_TYPE_HINTS)
  // Fall back to bare raza, then bare especie
  if (!slug && razaTrimmed && razaTrimmed !== combined) {
    slug = await resolveSlugViaLookup(razaTrimmed, ANIMAL_TYPE_HINTS)
  }
  if (!slug && especieTrimmed && especieTrimmed !== combined) {
    slug = await resolveSlugViaLookup(especieTrimmed, ANIMAL_TYPE_HINTS)
  }

  if (import.meta.env.DEV) console.log(`[dbpediaRepository] getAnimalInfo(especie="${especie}", raza="${raza}", lang="${lang}") combined="${combined}" → slug="${slug ?? 'null'}"`)
  if (!slug) return []
  return queryDBpedia(buildDbpediaQuery(slug, lang, true))
}

export async function getEnfermedadInfo(
  nombreEnfermedad: string,
  lang = 'es',
): Promise<Record<string, string>[]> {
  if (!nombreEnfermedad.trim()) return []
  const slug = await resolveSlugViaLookup(nombreEnfermedad, DISEASE_TYPE_HINTS)
  if (!slug) return []
  return queryDBpedia(buildDbpediaQuery(slug, lang))
}
