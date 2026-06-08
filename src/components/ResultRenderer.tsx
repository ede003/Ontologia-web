import { type Language, useTranslations } from '../i18n/translations'

export interface QueryMeta {
  searchMode: 'entity' | 'content' | 'multi-entity' | 'fallback'
  entityContexts: import('../utils/queryParser').EntityContext[]
  primaryType: string | null
  secondaryType: string | null
  isRelational: boolean
}

interface ResultRendererProps {
  results: Record<string, string>[]
  queryMeta: QueryMeta
  lang: Language
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

const SKIP_KEYS = new Set(['instance', 'subject', 'object', 'enf', 'servicio', 'labelPred'])

function colLabel(key: string): string {
  if (/^var\d+$/.test(key)) return key
  const stripped = key.replace(/^var\d+_/, '')
  return stripped
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

export default function ResultRenderer({ results, queryMeta, lang }: ResultRendererProps) {
  const t = useTranslations(lang)

  if (!results || results.length === 0) {
    return <p className="vet-state">{t.noResultsSearch}</p>
  }

  // ── Content search mode ───────────────────────────────────────────────────
  if (queryMeta.searchMode === 'content') {
    return (
      <div className="vet-table-wrap">
        <table className="vet-table">
          <thead>
            <tr>
              <th>{'Tipo'}</th>
              <th>{'Nombre'}</th>
              <th>{'Campo'}</th>
              <th>{'Valor encontrado'}</th>
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
          {results.length} {results.length !== 1 ? t.resultCountPlural : t.resultCount}
        </div>
      </div>
    )
  }

  // ── Multi-entity mode ─────────────────────────────────────────────────────
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
          {results.length} {results.length !== 1 ? t.resultCountPlural : t.resultCount}
        </div>
      </div>
    )
  }

  // ── Legacy relational ─────────────────────────────────────────────────────
  if (queryMeta.isRelational && queryMeta.primaryType && queryMeta.secondaryType) {
    return (
      <div className="vet-table-wrap">
        <table className="vet-table">
          <thead>
            <tr>
              <th>{queryMeta.primaryType}</th>
              <th>{t.colRelation ?? 'Relación'}</th>
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
          {results.length} {results.length !== 1 ? t.resultCountPlural : t.resultCount}
        </div>
      </div>
    )
  }

  // ── Single-class / fallback ───────────────────────────────────────────────
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
        {results.length} {results.length !== 1 ? t.resultCountPlural : t.resultCount}
      </div>
    </div>
  )
}
