import { useState, useEffect } from 'react';
import { type Individual } from '../services/ontologyService';
import { getAnimalInfo } from '../repositories/dbpediaRepository';

// Session cache: key = "especie|raza|lang" → raw SPARQL binding rows
const _cache = new Map<string, Record<string, string>[]>();

export interface UseDbpediaEnrichResult {
  enriched: Record<string, string>[] | null;
  loading: boolean;
}

export function useDbpediaEnrich(animal: Individual | null, lang = 'es'): UseDbpediaEnrichResult {
  const especie = animal?.props.especie ?? '';
  const raza    = animal?.props.raza    ?? '';
  const active  = animal !== null;

  const [enriched, setEnriched] = useState<Record<string, string>[] | null>(null);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (!active) {
      setEnriched(null);
      setLoading(false);
      return;
    }

    const key = `${especie}|${raza}|${lang}`;
    if (import.meta.env.DEV) console.log(`[useDbpediaEnrich] especie="${especie}" raza="${raza}" lang="${lang}" cacheKey="${key}"`)

    if (_cache.has(key)) {
      const cached = _cache.get(key)!;
      if (import.meta.env.DEV) console.log(`[useDbpediaEnrich] Cache HIT (${cached.length} filas)`)
      setEnriched(cached.length > 0 ? cached : null);
      setLoading(false);
      return;
    }

    if (import.meta.env.DEV) console.log('[useDbpediaEnrich] Cache MISS → llamando getAnimalInfo')
    let cancelled = false;
    setLoading(true);
    setEnriched(null);

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
            rows = await getAnimalInfo(especie, raza, l);
            _cache.set(k, rows);
          }
          if (rows.length > 0 || l === 'es') break;
        }
        // Ensure the original (lang) key is always cached
        _cache.set(key, rows);
        if (!cancelled) setEnriched(rows.length > 0 ? rows : null);
      } finally {
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [active, especie, raza, lang]);

  return { enriched, loading };
}
