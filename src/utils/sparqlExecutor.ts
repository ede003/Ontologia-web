// Executes SPARQL queries against the in-memory n3 Store using Comunica.
// Returns one plain object per result row; all values are strings.

import { QueryEngine } from '@comunica/query-sparql-rdfjs'
import type { Store } from 'n3'

const engine = new QueryEngine()
const QUERY_TIMEOUT_MS = 7000

export async function runQuery(
  store: Store,
  sparqlQuery: string,
  options?: { silent?: boolean },
): Promise<Record<string, string>[]> {
  const silent = options?.silent ?? false
  if (!silent) {
    console.group('[sparqlExecutor] runQuery')
    console.log('Query:\n' + sparqlQuery)
  }
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  try {
    const queryPromise = engine
      .queryBindings(sparqlQuery, { sources: [store] })
      .then(stream => stream.toArray())

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error(`Query abortada: timeout ${QUERY_TIMEOUT_MS}ms`)),
        QUERY_TIMEOUT_MS,
      )
    })

    const rows = await Promise.race([queryPromise, timeoutPromise])
    clearTimeout(timeoutId!)

    const results = rows.map(row => {
      const result: Record<string, string> = {}
      row.forEach((term, key) => { result[key.value] = term.value })
      return result
    })
    if (!silent) {
      console.log(`Resultados: ${results.length} filas`)
      if (results.length > 0) console.log('Primera fila:', results[0])
      console.groupEnd()
    }
    return results
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId)
    if (!silent) {
      console.error('[sparqlExecutor] Query falló:', err)
      console.groupEnd()
    }
    return []
  }
}
