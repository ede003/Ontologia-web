// Renders SPARQL query results dynamically based on the query type.
// Relational queries show a three-column table (subject → relation → object).
// Single-class queries derive columns from the result row keys, with Spanish labels.

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
const SKIP_KEYS = new Set(['instance', 'subject', 'object', 'enf', 'servicio'])

// Human-readable Spanish labels for RDF property keys
const COLUMN_LABELS: Record<string, string> = {
  name:                 'Nombre',
  nombreAnimal:         'Nombre',
  nombreEnfermedad:     'Enfermedad',
  nombreMedicamento:    'Medicamento',
  tipoMedicamento:      'Tipo',
  dosisMedicamento:     'Dosis',
  viaAdministracion:    'Vía de administración',
  descripcionServicio:  'Servicio clínico',
  tipoEnfermedad:       'Tipo enfermedad',
  nivelGravedad:        'Gravedad',
  sintomas:             'Síntomas',
  descripcionEnfermedad:'Descripción',
  especie:              'Especie',
  raza:                 'Raza',
  sexo:                 'Sexo',
  edad:                 'Edad',
  peso:                 'Peso',
  color:                'Color',
  telefono:             'Teléfono',
  especialidad:         'Especialidad',
  fecha:                'Fecha',
  diagnosticoInicial:   'Diagnóstico inicial',
  sintomasReportados:   'Síntomas reportados',
  tipoVacuna:           'Tipo vacuna',
  dosisVacunacion:      'Dosis',
  tipoTratamiento:      'Tipo tratamiento',
  duracion:             'Duración',
  tipoExamen:           'Tipo examen',
  resultado:            'Resultado',
  tipoCirugia:          'Tipo cirugía',
  nombre:               'Nombre',
}

function colLabel(key: string): string {
  return COLUMN_LABELS[key] ?? key
}

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
