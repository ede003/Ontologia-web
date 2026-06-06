import { useEffect, useState } from 'react'
import type { Store } from 'n3'
import type { OntologySchema } from '../services/schemaDiscovery'
import { buildEntityMap, EMPTY_ENTITY_MAP, type EntityMap } from '../utils/entityDetector'

export function useEntityMap(store: Store | null, schema: OntologySchema | null): EntityMap {
  const [map, setMap] = useState<EntityMap>(EMPTY_ENTITY_MAP)

  useEffect(() => {
    if (!store || !schema) return
    buildEntityMap(store, schema).then(setMap)
  }, [store, schema])

  return map
}
