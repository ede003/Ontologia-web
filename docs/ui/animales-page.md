# AnimalesPage

**Archivo:** `src/pages/AnimalesPage.tsx`

## Responsabilidades

1. Cargar los animales de la ontología local via SPARQL (Comunica) — base para el
   desplegable de especies y el drawer lateral.
2. Ejecutar el pipeline de búsqueda inteligente en cada cambio del input.
3. Renderizar dinámicamente según el tipo de resultado:
   - Consulta animal → tabla existente + drawer DBpedia.
   - Consulta relacional o no-animal → `ResultRenderer` dinámico.

## Estado del componente

| Estado | Tipo | Descripción |
|--------|------|-------------|
| `animales` | `Individual[]` | Todos los animales cargados al inicio (para el select de especie y el drawer) |
| `queryLoading` | `boolean` | `true` mientras Comunica carga la lista base |
| `search` | `string` | Texto del input de búsqueda |
| `especieFilter` | `string` | Valor del select de especie (filtra solo cuando el resultado es Animal) |
| `selected` | `Individual \| null` | Animal seleccionado (abre el drawer) |
| `sparqlResults` | `Record<string, string>[] \| null` | Resultados crudos de la última query inteligente |
| `queryMeta` | `QueryMeta \| null` | Metadatos del query (tipo primario, tipo secundario, isRelacional) |
| `intelligentLoading` | `boolean` | `true` mientras se ejecuta la query inteligente |

## Pipeline de búsqueda inteligente

Se dispara en cada cambio del input via `useEffect([search, store])`:

```typescript
const parsed       = parseQuery(search)          // extrae términos con compromise.js
const primaryType  = detectEntityType(parsed.primaryTerm)
const secondaryType = detectEntityType(parsed.secondaryTerm)
const sparql       = buildQuery({ ...parsed, primaryType, secondaryType })
const results      = await runQuery(store, sparql)
setSparqlResults(results)
setQueryMeta({ isRelational, primaryType, secondaryType, ... })
```

Ver [search-architecture.md](../search-architecture.md) para el detalle completo.

## Modo de renderizado

```typescript
const isAnimalTableMode = !queryMeta?.isRelational &&
  (!queryMeta?.primaryType || queryMeta.primaryType === 'Animal')
```

| Condición | Renderizado |
|-----------|------------|
| `search === ''` | Estado vacío (`vet-empty-state`) |
| `intelligentLoading` | Spinner SPARQL |
| `isAnimalTableMode === true` | Tabla de animales + drawer lateral |
| `isAnimalTableMode === false` | `<ResultRenderer>` dinámico |

Para el modo animal, los resultados SPARQL se cruzan con los `animales` cargados
al inicio para obtener objetos `Individual` completos (necesarios para el drawer):

```typescript
const uriSet = new Set(sparqlResults.map(r => r.instance))
const displayAnimals = animales
  .filter(a => uriSet.has(a.uri))
  .filter(a => !especieFilter || a.props.especie === especieFilter)
```

## Drawer lateral (`AnimalDrawer`)

Componente interno que se monta cuando `selected !== null`.

```
┌────────────────────────────────────┐
│ Nombre del animal              [×] │
├────────────────────────────────────│
│ DATOS DE LA ONTOLOGÍA              │
│ Nombre:  Thor    Especie: Canino   │
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

El drawer lee los datos de DBpedia directamente desde el primer binding row
devuelto por `useDbpediaEnrich`:

```typescript
const row = enriched[0]   // Record<string, string>
row.abstract   // texto descriptivo
row.thumbnail  // URL de imagen
row.page       // URL de Wikipedia
```

Si DBpedia no responde o no tiene entrada, se muestra "Sin información adicional."
sin ningún error visible al usuario.

## Layout

```
┌─────────────────────────────┬──────────────┐
│         Tabla               │    Drawer    │
│    (flex: 1, minWidth: 0)   │  (320px)     │
└─────────────────────────────┴──────────────┘
```

Cuando no hay animal seleccionado la tabla ocupa el 100% del ancho.
