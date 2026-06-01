import { useState, useEffect } from 'react';
import { type Individual } from '../services/ontologyService';
import { getAnimalInfo } from '../repositories/dbpediaRepository';

// Session cache: key = "especie|raza" → raw SPARQL binding rows
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
    console.log(`[useDbpediaEnrich] animal activo — especie="${especie}" raza="${raza}" lang="${lang}" cacheKey="${key}"`)

    if (_cache.has(key)) {
      const cached = _cache.get(key)!;
      console.log(`[useDbpediaEnrich] Cache HIT (${cached.length} filas)`)
      setEnriched(cached.length > 0 ? cached : null);
      setLoading(false);
      return;
    }

    console.log('[useDbpediaEnrich] Cache MISS → llamando getAnimalInfo')
    let cancelled = false;
    setLoading(true);
    setEnriched(null);

    getAnimalInfo(especie, raza, lang).then(rows => {
      if (cancelled) return;
      console.log(`[useDbpediaEnrich] getAnimalInfo resolvió: ${rows.length} filas`)

      // Si no hay resultado en el idioma pedido, intenta con español como respaldo
      if (rows.length === 0 && lang !== 'es') {
        const fallbackKey = `${especie}|${raza}|es`;
        if (_cache.has(fallbackKey)) {
          const fallback = _cache.get(fallbackKey)!;
          _cache.set(key, fallback);
          setEnriched(fallback.length > 0 ? fallback : null);
          setLoading(false);
          return;
        }
        return getAnimalInfo(especie, raza, 'es').then(fallbackRows => {
          if (cancelled) return;
          _cache.set(key, fallbackRows);
          _cache.set(fallbackKey, fallbackRows);
          setEnriched(fallbackRows.length > 0 ? fallbackRows : null);
          setLoading(false);
        });
      }

      _cache.set(key, rows);
      setEnriched(rows.length > 0 ? rows : null);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [active, especie, raza, lang]);

  return { enriched, loading };
}
