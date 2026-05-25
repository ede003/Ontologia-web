import { useEffect, useState } from 'react'
import type { Store } from 'n3'
import { buildEntityMap, META_ENTITY_MAP, type EntityMap } from '../utils/entityDetector'

// Builds the dynamic entity map from the ontology store once it's available.
// Returns META_ENTITY_MAP (schema-level terms only) until the store loads,
// then upgrades to the full map populated from ontology data.
export function useEntityMap(store: Store | null): EntityMap {
  const [map, setMap] = useState<EntityMap>(META_ENTITY_MAP)

  useEffect(() => {
    if (!store) return
    buildEntityMap(store).then(setMap)
  }, [store])

  return map
}
