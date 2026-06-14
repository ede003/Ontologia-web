import { useState, useEffect } from 'react';
import type { Store } from 'n3';
import { type Individual } from '../services/ontologyService';
import { getAnimalInfo } from '../repositories/dbpediaRepository';
import { DbpediaNetworkError } from '../services/dbpediaService';

const VET_NS = 'http://www.semanticweb.org/grupo14/ontologias/veterinaria#'

// Session cache: key = "especie|raza|lang" → raw SPARQL binding rows
const _cache = new Map<string, Record<string, string>[]>();

// ── Persistent cache (localStorage) ──────────────────────────────────────────
const STORAGE_PREFIX = 'dbpedia_v1:'
const CACHE_TTL_MS   = 30 * 24 * 60 * 60 * 1000 // 30 days

function loadPersisted(key: string): Record<string, string>[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw) as { data: Record<string, string>[]; ts: number }
    if (Date.now() - ts > CACHE_TTL_MS) {
      localStorage.removeItem(STORAGE_PREFIX + key)
      return null
    }
    return data
  } catch {
    return null
  }
}

function savePersisted(key: string, data: Record<string, string>[]): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify({ data, ts: Date.now() }))
  } catch {
    // Storage full or unavailable (private mode) — degrade gracefully
  }
}

export interface UseDbpediaEnrichResult {
  enriched: Record<string, string>[] | null;
  loading: boolean;
  networkError: boolean;
}

// Look up a single English literal for an animal URI and vet: property.
// The store always contains all language variants; English gives better DBpedia Lookup coverage.
function getEnLiteral(store: Store, uri: string, prop: string): string {
  return store.getQuads(uri, VET_NS + prop, null, null)
    .find(q => q.object.termType === 'Literal' && q.object.language === 'en')
    ?.object.value ?? ''
}

export function useDbpediaEnrich(animal: Individual | null, lang = 'es', store?: Store): UseDbpediaEnrichResult {
  // Always use English prop values for the DBpedia Lookup API (better coverage than Spanish terms).
  // Falls back to active-lang props if the English literal isn't present.
  const especie = (store && animal ? getEnLiteral(store, animal.uri, 'especie') : '') || (animal?.props.especie ?? '');
  const raza    = (store && animal ? getEnLiteral(store, animal.uri, 'raza')    : '') || (animal?.props.raza    ?? '');
  const active  = animal !== null;

  const [enriched, setEnriched]         = useState<Record<string, string>[] | null>(null);
  const [loading, setLoading]           = useState(false);
  const [networkError, setNetworkError] = useState(false);

  useEffect(() => {
    if (!active) {
      setEnriched(null);
      setLoading(false);
      setNetworkError(false);
      return;
    }

    const key = `${especie}|${raza}|${lang}`;
    if (import.meta.env.DEV) console.log(`[useDbpediaEnrich] especie="${especie}" raza="${raza}" lang="${lang}" cacheKey="${key}"`)

    if (_cache.has(key)) {
      const cached = _cache.get(key)!;
      if (import.meta.env.DEV) console.log(`[useDbpediaEnrich] Session cache HIT (${cached.length} filas)`)
      setEnriched(cached.length > 0 ? cached : null);
      setNetworkError(false);
      setLoading(false);
      return;
    }

    // Check persistent cache before going to the network
    const persisted = loadPersisted(key);
    if (persisted !== null) {
      if (import.meta.env.DEV) console.log(`[useDbpediaEnrich] localStorage HIT (${persisted.length} filas)`)
      _cache.set(key, persisted);
      setEnriched(persisted.length > 0 ? persisted : null);
      setNetworkError(false);
      setLoading(false);
      return;
    }

    if (import.meta.env.DEV) console.log('[useDbpediaEnrich] Cache MISS → llamando getAnimalInfo')
    let cancelled = false;
    setLoading(true);
    setEnriched(null);
    setNetworkError(false);

    // Try the requested lang, then fall back to 'es'. Iterate over deduped list.
    const langs = lang === 'es' ? ['es'] : [lang, 'es'];
    ;(async () => {
      try {
        let rows: Record<string, string>[] = [];
        for (const l of langs) {
          const k = `${especie}|${raza}|${l}`;
          if (_cache.has(k)) {
            rows = _cache.get(k)!;
          } else {
            const kPersisted = loadPersisted(k);
            if (kPersisted !== null) {
              rows = kPersisted;
              _cache.set(k, kPersisted);
            } else {
              rows = await getAnimalInfo(especie, raza, l);
              _cache.set(k, rows);
              savePersisted(k, rows);
            }
          }
          if (rows.length > 0 || l === 'es') break;
        }
        // Ensure the original (lang) key is always cached
        _cache.set(key, rows);
        savePersisted(key, rows);
        if (!cancelled) setEnriched(rows.length > 0 ? rows : null);
      } catch (err) {
        if (err instanceof DbpediaNetworkError && !cancelled) setNetworkError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [active, especie, raza, lang]);

  return { enriched, loading, networkError };
}
