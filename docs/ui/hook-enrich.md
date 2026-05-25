# Hooks: useOntology y useDbpediaEnrich

## `useOntology`

**Archivo:** `src/hooks/useOntology.ts`

### Propósito

Expone el `Store` de n3 a los componentes React. Garantiza que el parseo del
RDF/XML ocurra una única vez por sesión, aunque múltiples componentes usen el hook.

### Singleton a nivel de módulo

```typescript
let _store: Store | null = null;
let _loadPromise: Promise<Store> | null = null;

function getOrLoadStore(): Promise<Store> {
  if (_store) return Promise.resolve(_store);     // ya cargado
  if (!_loadPromise) {
    _loadPromise = loadOntology().then(s => { _store = s; return s; });
  }
  return _loadPromise;  // en curso: reutiliza la misma promesa
}
```

El patrón de `_loadPromise` evita lanzar múltiples fetch simultáneos si varios
componentes montan al mismo tiempo (incluido React StrictMode que monta dos veces).

### Interfaz

```typescript
const { store, loading, error } = useOntology();
// store: Store | null  — null mientras carga
// loading: boolean
// error: string | null — mensaje si el fetch o parseo fallan
```

---

## `useDbpediaEnrich`

**Archivo:** `src/hooks/useDbpediaEnrich.ts`

### Propósito

Dado un `Individual` de la ontología local, obtiene de DBpedia los datos de
enriquecimiento vía SPARQL y los expone como filas de binding crudas.
La consulta es **lazy** (solo cuando el drawer se abre) y **cacheada** en sesión.

### Interfaz

```typescript
const { enriched, loading } = useDbpediaEnrich(animal)
// enriched: Record<string, string>[] | null
//   Filas de binding SPARQL directas — sin objeto intermedio tipado.
//   Los nombres de variable coinciden con el SELECT del query DBpedia:
//     enriched[0].abstract   → descripción en español
//     enriched[0].thumbnail  → URL de imagen (opcional)
//     enriched[0].page       → URL de Wikipedia (opcional)
// loading: boolean
```

`enriched` es `null` si DBpedia no devuelve resultados, el fetch falla,
o la raza/especie no tiene slug en `dbpediaMaps.ts`.

### Caché a nivel de módulo

```typescript
const _cache = new Map<string, Record<string, string>[]>()
// clave: "especie|raza" — e.g. "Canino|Pug"
```

La caché persiste durante toda la sesión. Si el mismo par ya fue consultado,
el resultado se devuelve inmediatamente sin hacer fetch.

### Flujo de datos

```
Individual (especie, raza)
     │
     ▼
resolveAnimalSlug()  →  slug DBpedia (e.g. "Pug")
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

No hay objetos intermedios como `DbpediaAnimalInfo`; el componente que consume
el hook lee directamente los valores de binding por nombre de variable.

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
