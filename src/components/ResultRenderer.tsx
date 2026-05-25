// Renders SPARQL query results dynamically based on the query type.
// Relational queries show a three-column table (subject → relation → object).
// Single-class queries derive columns from the result row keys.

import type { OntologyClass } from '../utils/entityDetector'

export interface QueryMeta {
  isRelational: boolean
  primaryType: OntologyClass | null
  secondaryType: OntologyClass | null
  primaryTerm: string
  secondaryTerm: string | null
}

interface ResultRendererProps {
  results: Record<string, string>[]
  queryMeta: QueryMeta
}

function shortUri(uri: string): string {
  const h = uri.lastIndexOf('#')
  if (h !== -1) return uri.slice(h + 1)
  const s = uri.lastIndexOf('/')
  return s !== -1 ? uri.slice(s + 1) : uri
}

function cellValue(val: string | undefined): string {
  if (!val) return '—'
  return val.startsWith('http') ? shortUri(val) : val
}

// Columns to skip in generic rendering (URIs shown in other columns)
const SKIP_KEYS = new Set(['instance', 'subject', 'object'])

export default function ResultRenderer({ results, queryMeta }: ResultRendererProps) {
  if (!results || results.length === 0) {
    return <p className="vet-state">Sin resultados para esta búsqueda.</p>
  }

  if (queryMeta.isRelational && queryMeta.primaryType && queryMeta.secondaryType) {
    return (
      <div className="vet-table-wrap">
        <table className="vet-table">
          <thead>
            <tr>
              <th>{queryMeta.primaryType}</th>
              <th>Relación</th>
              <th>{queryMeta.secondaryType}</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={i}>
                <td>{r.subjectName ?? cellValue(r.subject)}</td>
                <td>
                  <span className="vet-pill">→</span>
                </td>
                <td>{r.objectName ?? cellValue(r.object)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="vet-table-footer">
          {results.length} resultado{results.length !== 1 ? 's' : ''}
        </div>
      </div>
    )
  }

  // Single-class or fallback: derive columns from the first result row
  const columns = Object.keys(results[0]).filter(k => !SKIP_KEYS.has(k))

  return (
    <div className="vet-table-wrap">
      <table className="vet-table">
        <thead>
          <tr>
            {columns.map(col => <th key={col}>{col}</th>)}
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => (
            <tr key={i}>
              {columns.map(col => (
                <td key={col}>{cellValue(r[col])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="vet-table-footer">
        {results.length} resultado{results.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
