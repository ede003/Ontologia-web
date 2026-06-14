const DATA_API = 'https://dbpedia.org/data';
const TIMEOUT_MS = 8000;

export class DbpediaNetworkError extends Error {
  constructor() { super('DBpedia unreachable') }
}

type JsonLdValue = { value: string; lang?: string; 'xml:lang'?: string; type?: string }
type JsonLdPredicates = Record<string, JsonLdValue[]>
type JsonLdDoc = Record<string, JsonLdPredicates>

const DBO_ABSTRACT  = 'http://dbpedia.org/ontology/description'
const DBO_THUMBNAIL = 'http://dbpedia.org/ontology/thumbnail'
const FOAF_PRIMARY  = 'http://xmlns.com/foaf/0.1/isPrimaryTopicOf'

function getLang(v: JsonLdValue): string {
  return v.lang ?? v['xml:lang'] ?? ''
}

function pickLang(values: JsonLdValue[], lang: string): string {
  return (
    values.find(v => getLang(v) === lang)?.value ??
    values.find(v => getLang(v) === 'en')?.value ??
    values.find(v => getLang(v) === 'es')?.value ??
    ''
  )
}

export async function queryDBpedia(slug: string, lang = 'en'): Promise<Record<string, string>[]> {
  const uri = `http://dbpedia.org/resource/${slug}`
  const url = `${DATA_API}/${slug}.json`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  if (import.meta.env.DEV) console.log('[dbpediaService] GET', url)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    clearTimeout(timer)

    if (res.status === 404) return []
    if (!res.ok) throw new DbpediaNetworkError()

    const doc = await res.json() as JsonLdDoc
    const predicates: JsonLdPredicates = doc[uri] ?? {}

    const abstract  = pickLang(predicates[DBO_ABSTRACT]  ?? [], lang)
    const thumbnail = predicates[DBO_THUMBNAIL]?.[0]?.value ?? ''
    const page      = predicates[FOAF_PRIMARY]?.[0]?.value  ?? ''

    if (!abstract && !thumbnail && !page) return []

    const row: Record<string, string> = { dbpediaUri: uri }
    if (abstract)  row.abstract  = abstract
    if (thumbnail) row.thumbnail = thumbnail
    if (page)      row.page      = page

    if (import.meta.env.DEV) console.log('[dbpediaService] Respuesta:', row)
    return [row]
  } catch (err) {
    clearTimeout(timer)
    if (err instanceof DbpediaNetworkError) throw err
    console.warn('[dbpediaService] Fetch falló o timeout:', err)
    throw new DbpediaNetworkError()
  }
}
