import { useState, useEffect } from 'react'
import type { Store } from 'n3'
import { buildOntologySchema, type OntologySchema } from '../services/schemaDiscovery'

let _schema: OntologySchema | null = null
let _schemaPromise: Promise<OntologySchema> | null = null

function getOrBuildSchema(store: Store): Promise<OntologySchema> {
  if (_schema) return Promise.resolve(_schema)
  if (!_schemaPromise) {
    _schemaPromise = buildOntologySchema(store).then(s => {
      _schema = s
      return s
    })
  }
  return _schemaPromise
}

export interface UseOntologySchemaResult {
  schema: OntologySchema | null
  loading: boolean
  error: string | null
}

export function useOntologySchema(store: Store | null): UseOntologySchemaResult {
  const [schema, setSchema] = useState<OntologySchema | null>(_schema)
  const [loading, setLoading] = useState(_schema === null && store !== null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!store) return
    if (_schema) {
      setSchema(_schema)
      setLoading(false)
      return
    }
    setLoading(true)
    getOrBuildSchema(store)
      .then(s => {
        setSchema(s)
        setLoading(false)
      })
      .catch(e => {
        setError(e instanceof Error ? e.message : String(e))
        setLoading(false)
      })
  }, [store])

  return { schema, loading, error }
}
