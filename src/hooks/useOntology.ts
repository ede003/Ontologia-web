import { type Store } from 'n3'
import { loadOntology } from '../services/ontologyService'
import { createSingletonResource } from './createSingletonResource'
import type { Language } from '../i18n/translations'

export interface UseOntologyResult {
  store: Store | null
  loading: boolean
  error: string | null
}

const _useStore = createSingletonResource<Language, Store>(lang => loadOntology(lang))

export function useOntology(lang: Language): UseOntologyResult {
  const { value: store, loading, error } = _useStore(lang)
  return { store, loading, error }
}
