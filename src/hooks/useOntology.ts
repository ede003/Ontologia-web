import { type Store } from 'n3'
import { loadOntology } from '../services/ontologyService'
import { createSingletonResource } from './createSingletonResource'
import type { Language } from '../i18n/translations'

export interface UseOntologyResult {
  store: Store | null
  loading: boolean
  error: string | null
}

// The store holds all three languages — language filtering happens at query time.
// Use a constant key so switching language never re-parses the RDF file or
// re-runs the 20-query schema discovery.
const _useStore = createSingletonResource<true, Store>(() => loadOntology('es'))

export function useOntology(_lang: Language): UseOntologyResult {
  const { value: store, loading, error } = _useStore(true)
  return { store, loading, error }
}
