// Sends SPARQL to es.dbpedia.org and returns raw binding rows.
// Each row is a plain Record<variable, value> — no intermediate typed objects.
const ENDPOINT = 'https://es.dbpedia.org/sparql';
const TIMEOUT_MS = 8000;

export async function queryDBpedia(sparql: string): Promise<Record<string, string>[]> {
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
    const data = await res.json() as {
      results?: { bindings?: Record<string, { value: string }>[] };
    };
    const bindings = data?.results?.bindings ?? [];
    const rows = bindings.map(row =>
      Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v.value]))
    );
    console.log(`[dbpediaService] Respuesta: ${rows.length} filas`, rows.length > 0 ? rows[0] : '(vacío)');
    return rows;
  } catch (err) {
    console.warn('[dbpediaService] Fetch falló o timeout:', err);
    clearTimeout(timer);
    return [];
  }
}
