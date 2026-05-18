// es.dbpedia.org/sparql serves full dbo:abstract in Spanish (CORS enabled).
// dbpedia.org/sparql only exposes dbo:description (≤ 5 words) — not useful.
const ENDPOINT = 'https://es.dbpedia.org/sparql';
const TIMEOUT_MS = 8000;

export interface DbpediaAnimalInfo {
  abstract?: string;
  thumbnail?: string;
  wikiPage?: string;
}

export interface DbpediaEnfermedadInfo {
  abstract?: string;
  wikiPage?: string;
}

export interface SparqlBinding {
  [varName: string]: { type: string; value: string; 'xml:lang'?: string } | undefined;
}

export async function queryDBpedia(sparql: string): Promise<SparqlBinding[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = `${ENDPOINT}?query=${encodeURIComponent(sparql)}&format=json`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/sparql-results+json' },
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const rawText = await res.text();
    const json = JSON.parse(rawText) as { results?: { bindings?: SparqlBinding[] } };
    return json?.results?.bindings ?? [];
  } catch {
    clearTimeout(timer);
    return [];
  }
}
