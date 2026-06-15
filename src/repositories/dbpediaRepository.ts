import { queryDBpedia, DbpediaNetworkError } from '../services/dbpediaService'

const LOOKUP_API = 'https://lookup.dbpedia.org/api/search'
const LOOKUP_TIMEOUT_MS = 5000
const LOOKUP_MAX_RESULTS = 5

// Semantic intent hints — not domain data, just "what kind of thing are we looking for"
const ANIMAL_TYPE_HINTS = [
  'Species', 'Animal', 'Mammal', 'Eukaryote', 'Breed',
  'Dog', 'Cat', 'Bird', 'Reptile', 'Fish', 'Amphibian',
]

type LookupDoc = {
  resource?: string[]
  typeName?: string[]
  type?: string[]
  classes?: Array<{ '@id'?: string; label?: string }>
  comment?: string | string[]
}

// Slug cache: term → resolved slug (null = definitively not found; absent = not yet queried)
const _slugCache = new Map<string, string | null>()
// Comment cache: slug → Lookup API snippet (used as abstract when data endpoint has none)
const _commentCache = new Map<string, string>()

function stripHtml(html: unknown): string {
  const text = Array.isArray(html) ? html[0] : html
  if (typeof text !== 'string') return ''
  return text.replace(/<[^>]+>/g, '').trim()
}

function docMatchesTypeHints(doc: LookupDoc, hints: string[]): boolean {
  const types = [
    ...(doc.typeName ?? []),
    ...(doc.type ?? []),
    ...(doc.classes ?? []).map(c => c['@id'] ?? ''),
    ...(doc.classes ?? []).map(c => c.label ?? ''),
  ]
  return types.some(t => hints.some(h => new RegExp(`\\b${h}\\b`, 'i').test(t)))
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
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS)
  if (import.meta.env.DEV) console.log(`[lookup] GET ${url}`)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    clearTimeout(timer)
    if (import.meta.env.DEV) console.log(`[lookup] status=${res.status} ok=${res.ok}`)
    if (!res.ok) return null  // transient HTTP error — don't cache, allow retry
    const data = await res.json() as { docs?: LookupDoc[] }
    const docs = data?.docs ?? []
    if (import.meta.env.DEV) {
      console.log(`[lookup] "${term}" → ${docs.length} docs`)
      docs.forEach((d, i) => console.log(`  [${i}] resource=${d.resource?.[0]} typeName=${JSON.stringify(d.typeName)}`))
    }
    const best = docs.find(d => docMatchesTypeHints(d, typeHints)) ?? docs[0] ?? null
    const slug = best ? slugFromDoc(best) : null
    if (import.meta.env.DEV) console.log(`[lookup] best → slug="${slug ?? 'null'}"`)

    // Cache the Lookup snippet as a description fallback
    if (slug && best?.comment) {
      const comment = stripHtml(best.comment)
      if (comment) _commentCache.set(slug, comment)
    }

    _slugCache.set(term, slug)
    return slug
  } catch (err) {
    clearTimeout(timer)
    if (import.meta.env.DEV) console.warn(`[lookup] CATCH "${term}":`, err)
    throw new DbpediaNetworkError()
  }
}

export async function getAnimalInfo(
  especie: string,
  raza: string,
  lang = 'es',
): Promise<Record<string, string>[]> {
  const razaTrimmed = raza.trim()
  const especieTrimmed = especie.trim()
  // Combined term disambiguates: "Persian Cat" → Persian cat breed, not Persia/Irán
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

  const rows = await queryDBpedia(slug, lang)
  const lookupComment = _commentCache.get(slug) ?? ''

  // The Lookup snippet is always English, so only use it as the abstract in
  // English mode. In other languages we keep the localized description (or no
  // abstract at all) rather than surfacing English text in a non-English UI.
  const canUseComment = lang === 'en' && !!lookupComment

  if (rows.length > 0) {
    const row = rows[0]
    if (canUseComment && !row.abstract) {
      return [{ ...row, abstract: lookupComment }, ...rows.slice(1)]
    }
    return rows
  }

  // Data endpoint returned nothing — fall back to the Lookup snippet (English only)
  if (canUseComment) {
    return [{ dbpediaUri: `http://dbpedia.org/resource/${slug}`, abstract: lookupComment }]
  }

  return []
}
