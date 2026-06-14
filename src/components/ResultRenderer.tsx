import { type Language, type Translations, useTranslations } from '../i18n/translations'
import type { OntologySchema } from '../services/schemaDiscovery'

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
  schema?: OntologySchema
}

function shortUri(uri: string): string {
  const h = uri.lastIndexOf('#')
  if (h !== -1) return uri.slice(h + 1)
  const s = uri.lastIndexOf('/')
  return s !== -1 ? uri.slice(s + 1) : uri
}
const SKIP_KEYS = new Set(['instance', 'subject', 'object', 'enf', 'servicio', 'labelPred'])

function colLabel(key: string, propLabels?: Record<string, string>): string {
  if (/^var\d+$/.test(key)) return key
  const stripped = key.replace(/^var\d+_/, '')
  if (propLabels?.[stripped]) return propLabels[stripped]
  return stripped
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

function ResultTable({
  head,
  children,
  count,
  t,
}: {
  head: React.ReactNode
  children: React.ReactNode
  count: number
  t: Translations
}) {
  return (
    <div className="vet-table-wrap">
      <table className="vet-table">
        <thead><tr>{head}</tr></thead>
        <tbody>{children}</tbody>
      </table>
      <div className="vet-table-footer">
        {count} {count !== 1 ? t.resultCountPlural : t.resultCount}
      </div>
    </div>
  )
}

export default function ResultRenderer({ results, queryMeta, lang, schema }: ResultRendererProps) {
  const t = useTranslations(lang)

  // Derive per-language label lookups from the ontology schema (no hardcoding).
  // Falls back to empty objects if schema isn't available yet.
  const propLabels: Record<string, string> = schema
    ? Object.fromEntries([...schema.propLabelMap.entries()].map(([k, v]) => [k, v[lang] ?? k]))
    : {}
  const classLabels: Record<string, string> = schema
    ? Object.fromEntries([...schema.classLabelMap.entries()].map(([k, v]) => [k, v[lang] ?? k]))
    : {}

  const columns = results && results.length > 0
    ? Object.keys(results[0]).filter(k => !SKIP_KEYS.has(k) && !/^var\d+$/.test(k))
    : []

  // Los valores ya vienen en el idioma de la ontología cargada; no se traducen.
  const translateValue = (val: string | undefined): string => {
    if (!val) return '—'
    if (val.startsWith('http')) return shortUri(val)
    return val
  }

  if (!results || results.length === 0) {
    return <p className="vet-state">{t.noResultsSearch}</p>
  }

  // ── Content search mode ───────────────────────────────────────────────────
  if (queryMeta.searchMode === 'content') {
    return (
      <ResultTable count={results.length} t={t} head={<>
        <th>{t.colType}</th>
        <th>{t.colName}</th>
        <th>{t.colField}</th>
        <th>{t.colFoundValue}</th>
      </>}>
        {results.map((r, i) => (
          <tr key={i}>
            <td>{r.className ? (classLabels[r.className] ?? translateValue(r.className)) : '—'}</td>
            <td>{r.labelVal ? translateValue(r.labelVal) : shortUri(r.instance ?? '')}</td>
            <td>{r.matchProp ? colLabel(shortUri(r.matchProp), propLabels) : '—'}</td>
            <td>{translateValue(r.matchVal)}</td>
          </tr>
        ))}
      </ResultTable>
    )
  }

  // ── Multi-entity mode ─────────────────────────────────────────────────────
  if (queryMeta.searchMode === 'multi-entity' && queryMeta.entityContexts.length >= 2) {
    const contexts = queryMeta.entityContexts
    return (
      <ResultTable count={results.length} t={t} head={<>
        {contexts.map((ctx, i) => <th key={i}>{classLabels[ctx.className] ?? translateValue(ctx.className)}</th>)}
      </>}>
        {results.map((r, i) => (
          <tr key={i}>
            {contexts.map((_, idx) => (
              <td key={idx}>
                {r[`var${idx}Name`] ? translateValue(r[`var${idx}Name`]) : translateValue(r[`var${idx}`])}
              </td>
            ))}
          </tr>
        ))}
      </ResultTable>
    )
  }

  // ── Single-class / fallback ───────────────────────────────────────────────
  return (
    <ResultTable count={results.length} t={t} head={<>
      {columns.map(col => <th key={col}>{colLabel(col, propLabels)}</th>)}
    </>}>
      {results.map((r, i) => (
        <tr key={i}>
          {columns.map(col => (
            <td key={col}>{translateValue(r[col])}</td>
          ))}
        </tr>
      ))}
    </ResultTable>
  )
}
