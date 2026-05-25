// Executes SPARQL queries against the in-memory n3 Store using Comunica.
// Returns one plain object per result row; all values are strings.

import { QueryEngine } from '@comunica/query-sparql-rdfjs'
import type { Store } from 'n3'

const engine = new QueryEngine()

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
  try {
    const stream = await engine.queryBindings(sparqlQuery, { sources: [store] })
    const rows = await stream.toArray()
    const results = rows.map(row => {
      const result: Record<string, string> = {}
      row.forEach((term, key) => {
        result[key.value] = term.value
      })
      return result
    })
    if (!silent) {
      console.log(`Resultados: ${results.length} filas`)
      if (results.length > 0) console.log('Primera fila:', results[0])
      console.groupEnd()
    }
    return results
  } catch (err) {
    if (!silent) {
      console.error('[sparqlExecutor] Query falló:', err)
      console.groupEnd()
    }
    return []
  }
}
