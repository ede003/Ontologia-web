# AnimalesPage

**Archivo:** `src/pages/AnimalesPage.tsx`

## Responsabilidades

1. Cargar la ontología y descubrir su schema via `useOntologySchema`.
2. Construir el `EntityMap` dinámico via `useEntityMap`.
3. Cargar los animales base via `getAnimales` (para el dropdown y el drawer).
4. Ejecutar el pipeline de búsqueda inteligente en cada cambio del input.
5. Renderizar según el tipo de resultado:
   - Animal entity/multi-entity → tabla `AnimalTable` + drawer `AnimalDrawer`.
   - Content search / clase no-animal → `<ResultRenderer>` dinámico.

## Estado del componente

| Estado | Tipo | Descripción |
|--------|------|-------------|
| `animales` | `Individual[]` | Todos los animales cargados al inicio (para el select y el drawer) |
| `queryLoading` | `boolean` | Mientras Comunica carga la lista base |
| `search` | `string` | Texto del input de búsqueda |
| `especieFilter` | `string` | Valor del select de especie |
| `selected` | `Individual \| null` | Animal seleccionado → abre el drawer |
| `sparqlResults` | `Record<string, string>[] \| null` | Resultados crudos de la última query |
| `queryMeta` | `QueryMeta \| null` | Metadatos: searchMode, entityContexts, tipos |
| `intelligentLoading` | `boolean` | Mientras se ejecuta la query dinámica |

## Hooks usados

```typescript
const { store, loading: ontologyLoading } = useOntology()
const { schema, loading: schemaLoading }  = useOntologySchema(store)
const entityMap = useEntityMap(store, schema)
```

El spinner inicial espera `ontologyLoading || schemaLoading`. El input de búsqueda solo es funcional cuando ambos están listos.

## Pipeline de búsqueda inteligente

Se dispara en cada cambio del input via `useEffect([search, store, schema, entityMap])`:

```typescript
const parsed = parseQuery(search, entityMap, schema)
// parsed.searchMode: 'entity' | 'multi-entity' | 'content' | 'fallback'
// parsed.entityContexts: [{ className, propertyFilters[] }]

const sparql = buildQuery(parsed, schema)
// despacha según searchMode; usa OntologySchema para labels, joins y campos

const results = await runQuery(store, sparql)
setSparqlResults(results)
setQueryMeta({
  searchMode: parsed.searchMode,
  entityContexts: parsed.entityContexts,
  primaryType: parsed.entityContexts[0]?.className ?? null,
  secondaryType: parsed.entityContexts[1]?.className ?? null,
  isRelational: parsed.searchMode === 'multi-entity',
})
```

Ver [../search-architecture.md](../search-architecture.md) para el detalle completo del pipeline.

## Modo de renderizado

```typescript
// Modo tabla Animal: entity o fallback apuntando a Animal
const isAnimalTableMode =
  (queryMeta?.searchMode === 'entity' || queryMeta?.searchMode === 'fallback') &&
  (!queryMeta?.primaryType || queryMeta.primaryType === 'Animal')

// Modo relacional Animal↔X: multi-entity con Animal como primer contexto
const isAnimalRelationalMode =
  queryMeta?.searchMode === 'multi-entity' &&
  queryMeta?.entityContexts[0]?.className === 'Animal'
```

| Condición | Renderizado |
|-----------|------------|
| `search === ''` | Estado vacío (`vet-empty-state`) |
| `intelligentLoading` | Spinner |
| `isAnimalRelationalMode` | `AnimalTable` (filtrada por var0 URIs) + drawer |
| `isAnimalTableMode` | `AnimalTable` (filtrada por instance URIs) + drawer |
| otros | `<ResultRenderer searchMode={...}>` |

## Cruce de resultados SPARQL con `Individual[]`

Para los modos de tabla Animal, los resultados SPARQL (URIs) se cruzan con los `animales` cargados al inicio (objetos `Individual` completos, necesarios para el drawer):

**Modo entity** — `?instance` es el URI del animal:
```typescript
const uriSet = new Set(sparqlResults.map(r => r.instance))
const displayAnimals = animales.filter(a => uriSet.has(a.uri))
```

**Modo multi-entity** — `?var0` es el URI del primer contexto (Animal), `?var1Name` es el nombre de la segunda entidad:
```typescript
const uriSet = new Set(sparqlResults.map(r => r.var0))
const relationalAnimals = animales.filter(a => uriSet.has(a.uri))

// Mapa URI animal → nombre de la segunda entidad (ej. nombre de la enfermedad)
const enfermedadOverride = new Map<string, string>()
for (const r of sparqlResults) {
  if (r.var0 && r.var1Name) enfermedadOverride.set(r.var0, r.var1Name)
}
```

## Drawer lateral (`AnimalDrawer`)

Componente interno que se monta cuando `selected !== null`. Lee datos del `Individual` (de la ontología) y enriquecimiento de DBpedia (via `useDbpediaEnrich`).

```
┌────────────────────────────────────┐
│ Nombre del animal              [×] │
├────────────────────────────────────│
│ DATOS DE LA ONTOLOGÍA              │
│ Nombre:  Thor    Especie: Perro    │
│ Raza:    Pug     Sexo: Macho       │
│ Edad:    3 años  Peso: 8.5 kg      │
│ Color:   Arena   Enfermedad: —     │
├────────────────────────────────────│
│ INFORMACIÓN ADICIONAL [DBpedia]    │
│ [thumbnail]                        │
│ El pug es una raza canina...       │
│ Ver en Wikipedia →                 │
└────────────────────────────────────┘
```

## Layout

```
┌─────────────────────────────┬──────────────┐
│         Tabla               │    Drawer    │
│    (flex: 1, minWidth: 0)   │  (320px)     │
└─────────────────────────────┴──────────────┘
```

Cuando no hay animal seleccionado, la tabla ocupa el 100% del ancho.
