import type { Store } from 'n3'
import { buildOntologySchema, type OntologySchema } from '../services/schemaDiscovery'
import { createSingletonResource } from './createSingletonResource'

export interface UseOntologySchemaResult {
  schema: OntologySchema | null
  loading: boolean
  error: string | null
}

const _useSchema = createSingletonResource<Store, OntologySchema>(store => buildOntologySchema(store))

export function useOntologySchema(store: Store | null): UseOntologySchemaResult {
  const { value: schema, loading, error } = _useSchema(store)
  return { schema, loading, error }
}
