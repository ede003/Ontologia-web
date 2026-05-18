import { useState, useEffect } from 'react';
import { type Store } from 'n3';
import { loadOntology } from '../services/ontologyService';

// Module-level singleton so the ontology is fetched and parsed only once
// across all components, even with React StrictMode double-invocations.
let _store: Store | null = null;
let _loadPromise: Promise<Store> | null = null;

function getOrLoadStore(): Promise<Store> {
  if (_store) return Promise.resolve(_store);
  if (!_loadPromise) {
    _loadPromise = loadOntology().then(s => {
      _store = s;
      return s;
    });
  }
  return _loadPromise;
}

export interface UseOntologyResult {
  store: Store | null;
  loading: boolean;
  error: string | null;
}

export function useOntology(): UseOntologyResult {
  const [store, setStore] = useState<Store | null>(_store);
  const [loading, setLoading] = useState<boolean>(_store === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (_store) return;
    getOrLoadStore()
      .then(s => {
        setStore(s);
        setLoading(false);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
  }, []);

  return { store, loading, error };
}
