import { useState, useEffect } from 'react'

/**
 * Returns a React hook that loads a resource once per distinct dep value.
 * Pass `null` as the dep to defer loading (e.g. when a prerequisite isn't ready).
 * Pass any non-null dep to trigger loading; the dep is forwarded to the loader
 * and used as the cache key, so changing the dep (e.g. switching language or
 * swapping the ontology store) loads and caches a new value instead of
 * returning the stale first one.
 */
export function createSingletonResource<TDep, T>(loader: (dep: TDep) => Promise<T>) {
  const values = new Map<TDep, T>()
  const promises = new Map<TDep, Promise<T>>()

  return function useResource(dep: TDep | null): { value: T | null; loading: boolean; error: string | null } {
    const cached = dep !== null ? values.get(dep) ?? null : null
    const [value, setValue] = useState<T | null>(cached)
    const [loading, setLoading] = useState(dep !== null && cached === null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
      if (dep === null) return

      const existing = values.get(dep)
      if (existing !== undefined) {
        setValue(existing); setLoading(false); setError(null)
        return
      }

      setValue(null); setLoading(true); setError(null)
      let promise = promises.get(dep)
      if (!promise) {
        promise = loader(dep).then(v => { values.set(dep, v); return v })
        promises.set(dep, promise)
      }
      let active = true
      promise
        .then(v => { if (active) { setValue(v); setLoading(false) } })
        .catch((e: unknown) => { if (active) { setError(e instanceof Error ? e.message : String(e)); setLoading(false) } })

      return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dep])

    return { value, loading, error }
  }
}
