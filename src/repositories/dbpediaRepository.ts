import { queryDBpedia } from '../services/dbpediaService'

const LOOKUP_API = 'https://lookup.dbpedia.org/api/search'
const LOOKUP_TIMEOUT_MS = 5000

// Convert a free-form term to a DBpedia-style slug (e.g. "golden retriever" → "Golden_Retriever")
function capitalizeSlug(term: string): string {
  return term.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('_')
}

// Dynamically resolve a term to a DBpedia resource slug via the Lookup API.
// Falls back to capitalizeSlug on network failure or no results.
async function resolveSlugViaLookup(term: string): Promise<string | null> {
  if (!term.trim()) return null
  const url = `${LOOKUP_API}?query=${encodeURIComponent(term)}&lang=es&maxResults=1&format=json`
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    clearTimeout(timer)
    if (!res.ok) return capitalizeSlug(term)
    const data = await res.json() as { docs?: Array<{ resource?: string[] }> }
    const resource = data?.docs?.[0]?.resource?.[0]
    if (!resource) return capitalizeSlug(term)
    return resource.split('/').pop() ?? capitalizeSlug(term)
  } catch {
    return capitalizeSlug(term)
  }
}

function buildAnimalQuery(slug: string): string {
  const uri = `http://dbpedia.org/resource/${slug}`
  return `PREFIX dbo:  <http://dbpedia.org/ontology/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?abstract ?thumbnail ?page ?dbpediaUri WHERE {
  BIND(<${uri}> AS ?dbpediaUri)
  <${uri}> dbo:abstract ?abstract .
  OPTIONAL { <${uri}> dbo:thumbnail ?thumbnail }
  OPTIONAL { <${uri}> foaf:isPrimaryTopicOf ?page }
  FILTER (lang(?abstract) = 'es' || lang(?abstract) = 'en')
} ORDER BY (lang(?abstract) != 'es') LIMIT 2`
}

function buildEnfermedadQuery(slug: string): string {
  const uri = `http://dbpedia.org/resource/${slug}`
  return `PREFIX dbo:  <http://dbpedia.org/ontology/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?abstract ?page ?dbpediaUri WHERE {
  BIND(<${uri}> AS ?dbpediaUri)
  <${uri}> dbo:abstract ?abstract .
  OPTIONAL { <${uri}> foaf:isPrimaryTopicOf ?page }
  FILTER (lang(?abstract) = 'es' || lang(?abstract) = 'en')
} ORDER BY (lang(?abstract) != 'es') LIMIT 2`
}

export async function getAnimalInfo(
  especie: string,
  raza: string,
): Promise<Record<string, string>[]> {
  // Try raza first (more specific), fall back to especie
  const term = raza.trim() || especie.trim()
  if (!term) return []
  const slug = await resolveSlugViaLookup(term)
  console.log(`[dbpediaRepository] getAnimalInfo(especie="${especie}", raza="${raza}") → slug="${slug ?? 'null'}"`)
  if (!slug) return []
  return queryDBpedia(buildAnimalQuery(slug))
}

export async function getEnfermedadInfo(
  nombreEnfermedad: string,
): Promise<Record<string, string>[]> {
  if (!nombreEnfermedad.trim()) return []
  const slug = await resolveSlugViaLookup(nombreEnfermedad)
  if (!slug) return []
  return queryDBpedia(buildEnfermedadQuery(slug))
}
