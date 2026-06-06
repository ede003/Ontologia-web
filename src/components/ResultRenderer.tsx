import type { EntityContext } from '../utils/queryParser'

export interface QueryMeta {
  searchMode: 'entity' | 'content' | 'multi-entity' | 'fallback'
  entityContexts: EntityContext[]
  primaryType: string | null
  secondaryType: string | null
  isRelational: boolean
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

// Internal SPARQL variable names — never shown as columns
const SKIP_KEYS = new Set(['instance', 'subject', 'object', 'enf', 'servicio', 'labelPred'])

// Auto-derive a readable label from a camelCase property key
function colLabel(key: string): string {
  // Handle "varINa me" patterns from multi-entity queries
  if (/^var\d+$/.test(key)) return key
  // Strip "varI_" prefix for multi-entity prop vars
  const stripped = key.replace(/^var\d+_/, '')
  // Split camelCase into words, title-case each
  return stripped
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

export default function ResultRenderer({ results, queryMeta }: ResultRendererProps) {
  if (!results || results.length === 0) {
    return <p className="vet-state">Sin resultados para esta búsqueda.</p>
  }

  // ── Content search mode ────────────────────────────────────────────────────
  if (queryMeta.searchMode === 'content') {
    return (
      <div className="vet-table-wrap">
        <table className="vet-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Nombre / Identificador</th>
              <th>Campo</th>
              <th>Valor encontrado</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={i}>
                <td>{r.className ?? '—'}</td>
                <td>{r.labelVal ?? shortUri(r.instance ?? '')}</td>
                <td>{r.matchProp ? colLabel(shortUri(r.matchProp)) : '—'}</td>
                <td>{r.matchVal ?? '—'}</td>
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

  // ── Multi-entity mode ──────────────────────────────────────────────────────
  if (queryMeta.searchMode === 'multi-entity' && queryMeta.entityContexts.length >= 2) {
    const contexts = queryMeta.entityContexts
    return (
      <div className="vet-table-wrap">
        <table className="vet-table">
          <thead>
            <tr>
              {contexts.map((ctx, i) => (
                <th key={i}>{ctx.className}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={i}>
                {contexts.map((_, idx) => (
                  <td key={idx}>
                    {r[`var${idx}Name`] ?? cellValue(r[`var${idx}`])}
                  </td>
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

  // ── Legacy relational (binary join, backward compat) ──────────────────────
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
                <td><span className="vet-pill">→</span></td>
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

  // ── Single-class / fallback: derive columns from result rows ───────────────
  const columns = Object.keys(results[0]).filter(k => !SKIP_KEYS.has(k) && !/^var\d+$/.test(k))

  return (
    <div className="vet-table-wrap">
      <table className="vet-table">
        <thead>
          <tr>
            {columns.map(col => <th key={col}>{colLabel(col)}</th>)}
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
