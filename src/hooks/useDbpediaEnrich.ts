import { useState, useEffect } from 'react';
import { type Individual } from '../services/ontologyService';
import { type DbpediaAnimalInfo } from '../services/dbpediaService';
import { getAnimalInfo } from '../repositories/dbpediaRepository';

// Module-level cache: key = "especie|raza" → result (including empty results so we
// don't repeat failed lookups on the same combination within a session)
const _cache = new Map<string, DbpediaAnimalInfo>();

export interface UseDbpediaEnrichResult {
  enriched: DbpediaAnimalInfo | null;
  loading: boolean;
}

export function useDbpediaEnrich(animal: Individual | null): UseDbpediaEnrichResult {
  // Derive stable primitive keys so the effect doesn't re-fire on reference changes
  const especie = animal?.props.especie ?? '';
  const raza = animal?.props.raza ?? '';
  const active = animal !== null;

  const [enriched, setEnriched] = useState<DbpediaAnimalInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!active) {
      setEnriched(null);
      setLoading(false);
      return;
    }

    const key = `${especie}|${raza}`;

    if (_cache.has(key)) {
      const cached = _cache.get(key)!;
      setEnriched(cached.abstract ? cached : null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setEnriched(null);

    getAnimalInfo(especie, raza).then(info => {
      if (cancelled) return;
      _cache.set(key, info);
      setEnriched(info.abstract ? info : null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [active, especie, raza]);

  return { enriched, loading };
}
