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

Dado un `Individual` de la ontología local, obtiene de DBpedia su `abstract`,
`thumbnail` y `wikiPage`. La consulta es **lazy** (solo cuando el drawer se abre)
y **cacheada** (no repite requests para la misma raza+especie).

### Caché a nivel de módulo

```typescript
const _cache = new Map<string, DbpediaAnimalInfo>();
// clave: "especie|raza" — e.g. "Canino|Pug"
```

La caché persiste durante toda la sesión del browser. Si el mismo par
especie+raza ya fue consultado, se devuelve el resultado inmediatamente
sin hacer fetch.

### Dependencias estables

```typescript
const especie = animal?.props.especie ?? '';
const raza    = animal?.props.raza    ?? '';
const active  = animal !== null;

useEffect(() => { ... }, [active, especie, raza]);
```

Se extraen los valores primitivos del objeto `Individual` para usarlos como
dependencias del efecto. Esto evita re-disparar el efecto por cambios en la
referencia del objeto (que ocurren en cada render).

### Flag de cancelación

```typescript
let cancelled = false;

getAnimalInfo(especie, raza).then(info => {
  if (cancelled) return;   // el usuario cambió de animal mientras cargaba
  _cache.set(key, info);
  setEnriched(info.abstract ? info : null);
  setLoading(false);
});

return () => { cancelled = true; };  // cleanup del useEffect
```

Previene actualizaciones de estado en componentes desmontados (React StrictMode
desmonta y remonta componentes en desarrollo).

### Interfaz

```typescript
const { enriched, loading } = useDbpediaEnrich(animal);
// enriched: DbpediaAnimalInfo | null
//   { abstract?: string, thumbnail?: string, wikiPage?: string }
// loading: boolean — true durante el fetch a DBpedia
```

`enriched` es `null` si:
- DBpedia no encontró resultados para ese animal.
- El fetch falló o superó el timeout.
- La raza/especie no tiene entrada en el mapa de URIs.

En todos esos casos el componente muestra un mensaje discreto sin errores.
