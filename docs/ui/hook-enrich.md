# Hooks: useOntology, useOntologySchema, useEntityMap, useDbpediaEnrich

## `useOntology`

**Archivo:** `src/hooks/useOntology.ts`

### Propósito

Expone el `Store` de n3 a los componentes React. Garantiza que el parseo del RDF/XML ocurra una única vez por sesión, aunque múltiples componentes usen el hook.

### Singleton a nivel de módulo

```typescript
let _store: Store | null = null;
let _loadPromise: Promise<Store> | null = null;

function getOrLoadStore(): Promise<Store> {
  if (_store) return Promise.resolve(_store);
  if (!_loadPromise) {
    _loadPromise = loadOntology().then(s => { _store = s; return s; });
  }
  return _loadPromise;  // reutiliza la misma promesa si ya está en curso
}
```

El patrón de `_loadPromise` evita lanzar múltiples fetch simultáneos (incluido React StrictMode que monta dos veces).

### Interfaz

```typescript
const { store, loading, error } = useOntology();
// store: Store | null  — null mientras carga
// loading: boolean
// error: string | null — mensaje si el fetch o parseo fallan
```

---

## `useOntologySchema`

**Archivo:** `src/hooks/useOntologySchema.ts`

### Propósito

Dado el `Store`, descubre dinámicamente toda la estructura de la ontología: clases, propiedades datatype (con valores distintos), object properties (relaciones) y propiedad de etiqueta por clase. Este schema es la base de todo el sistema de búsqueda.

### Singleton a nivel de módulo

Igual patrón que `useOntology`: la promesa de `buildOntologySchema` se crea solo una vez.

### Interfaz

```typescript
const { schema, loading, error } = useOntologySchema(store);
// schema: OntologySchema | null
//   schema.classes  → Map<localName, ClassSchema>
//   schema.relations → RelationEdge[]
//   schema.adjacency → Map<fromClass, RelationEdge[]>  — para BFS de joins
// loading: boolean
// error: string | null
```

### Qué descubre

| Elemento | Cómo se descubre |
|----------|----------------|
| Clases | `?i rdf:type owl:NamedIndividual . ?i rdf:type ?class` |
| Props literales | Predicados con objetos literales en instancias de cada clase |
| Valores distintos | `SELECT DISTINCT ?val` por cada (clase, predicado) |
| Relations | Predicados con objetos IRI cuyo tipo es otra clase vet: |
| Label property | Heurística: `vet:nombre{Clase}` → `vet:nombre` → `descripcion` → `tipo` → primera prop |

---

## `useEntityMap`

**Archivo:** `src/hooks/useEntityMap.ts`

### Propósito

Construye el `EntityMap` a partir del schema descubierto. Indexa términos de búsqueda tanto a nombres de clases como a valores concretos de propiedades, con stemming español.

### Interfaz

```typescript
const entityMap = useEntityMap(store, schema);
// entityMap.termToClass          → "enfermedad" → "Enfermedad"
// entityMap.termToPropertyValue  → "otitis" → [{className:"Enfermedad", prop:"nombreEnfermedad", value:"Otitis"}]
// entityMap.classNames           → Set<string> con todas las clases descubiertas
```

### Construcción

Para cada `ClassSchema`:
1. **Términos de clase** (sin hardcoding): split camelCase del localName + lowercase + plural + stems.
   - "ExamenMedico" → ["examen", "medico", "examen medico", stems de cada uno]
2. **Valores de propiedades**: todos los `distinctValues` de todas las props datatype → `termToPropertyValue`.
   - "Otitis" → registra "otitis", stem("otitis"), en `termToPropertyValue` → `{Enfermedad, nombreEnfermedad, "Otitis"}`
   - "Macho" → registra "macho", "mach", en `termToPropertyValue` → `{Animal, sexo, "Macho"}`

Retorna `EMPTY_ENTITY_MAP` hasta que `store` y `schema` estén disponibles.

---

## `useDbpediaEnrich`

**Archivo:** `src/hooks/useDbpediaEnrich.ts`

### Propósito

Dado un `Individual` de la ontología local, obtiene de DBpedia los datos de enriquecimiento vía SPARQL y los expone como filas de binding crudas. La consulta es **lazy** (solo cuando el drawer se abre) y **cacheada** en sesión.

### Interfaz

```typescript
const { enriched, loading } = useDbpediaEnrich(animal)
// enriched: Record<string, string>[] | null
//   enriched[0].abstract   → descripción en español (o inglés como fallback)
//   enriched[0].thumbnail  → URL de imagen (opcional)
//   enriched[0].page       → URL de Wikipedia (opcional)
// loading: boolean
```

### Caché a nivel de módulo

```typescript
const _cache = new Map<string, Record<string, string>[]>()
// clave: "especie|raza" — e.g. "Perro|Pug"
```

La caché persiste durante toda la sesión.

### Flujo de datos

```
Individual (especie, raza)
     │
     ▼
resolveSlugViaLookup(raza || especie)  → slug DBpedia vía Lookup API
     │
     ▼
buildAnimalQuery(slug)  →  SPARQL SELECT ?abstract ?thumbnail ?page
     │
     ▼
queryDBpedia()  →  Record<string, string>[]
     │
     ▼
useDbpediaEnrich  →  enriched[0].abstract / .thumbnail / .page
```

Ya no se usan mapas estáticos (`dbpediaMaps.ts` fue eliminado). La resolución de slug es completamente dinámica. Ver [../dbpedia/mapas-uri.md](../dbpedia/mapas-uri.md).

### Flag de cancelación

```typescript
let cancelled = false;
getAnimalInfo(especie, raza).then(rows => {
  if (cancelled) return;   // el usuario cambió de animal mientras cargaba
  _cache.set(key, rows);
  setEnriched(rows.length > 0 ? rows : null);
});
return () => { cancelled = true; };
```

Previene actualizaciones de estado en componentes desmontados.
