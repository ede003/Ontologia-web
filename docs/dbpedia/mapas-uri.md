# Resolución de URIs DBpedia

**Archivo fuente:** `src/repositories/dbpediaRepository.ts`

## Enfoque actual: Lookup API dinámica

A partir del refactoring de junio 2026, los mapas estáticos `RAZA_MAP`, `ESPECIE_MAP` y `ENFERMEDAD_MAP` (que existían en `src/maps/dbpediaMaps.ts`) han sido eliminados. En su lugar, los slugs de DBpedia se resuelven dinámicamente en tiempo de ejecución usando la **DBpedia Lookup API**.

## DBpedia Lookup API

```
Endpoint:  https://lookup.dbpedia.org/api/search
Método:    GET
Params:    query=<término url-encoded>&lang=es&maxResults=1&format=json
Timeout:   5 segundos (AbortController)
```

La API devuelve el recurso DBpedia más relevante para el término de búsqueda:

```json
{
  "docs": [{
    "resource": ["http://dbpedia.org/resource/Golden_Retriever"],
    ...
  }]
}
```

El slug se extrae del último segmento de la URI:
```typescript
resource.split('/').pop()  // "Golden_Retriever"
```

## Función `resolveSlugViaLookup`

```typescript
async function resolveSlugViaLookup(term: string): Promise<string | null> {
  const url = `${LOOKUP_API}?query=${encodeURIComponent(term)}&lang=es&maxResults=1&format=json`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000), ... })
    const data = await res.json()
    const resource = data?.docs?.[0]?.resource?.[0]
    return resource ? resource.split('/').pop() : capitalizeSlug(term)
  } catch {
    return capitalizeSlug(term)  // fallback en caso de error de red
  }
}
```

## Fallback: `capitalizeSlug`

Si la Lookup API no devuelve resultados o la red falla, se genera un slug directamente del término:

```typescript
function capitalizeSlug(term: string): string {
  return term.trim().split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('_')
}
// "golden retriever" → "Golden_Retriever"
// "otitis"           → "Otitis"
```

Este fallback garantiza que siempre se intenta la consulta SPARQL a DBpedia, aunque el slug pueda no existir.

## Flujo de resolución

```
getAnimalInfo(especie, raza)
       │
       ├─ term = raza || especie
       ▼
resolveSlugViaLookup(term)
       ├─ éxito → slug desde Lookup API (ej. "Pug")
       └─ fallo/vacío → capitalizeSlug(term) (ej. "Pug")
       │
       ▼
buildAnimalQuery(slug) → SPARQL SELECT
       │
       ▼
queryDBpedia() → enriched[]
```

## Por qué se eliminaron los mapas estáticos

Los mapas anteriores (`RAZA_MAP`, `ESPECIE_MAP`, `ENFERMEDAD_MAP`) eran listas de razas, especies y enfermedades específicas de la ontología con sus slugs verificados manualmente en DBpedia. El problema:

1. **Acoplamiento de datos**: cualquier nuevo animal o enfermedad en la ontología requería actualizar el mapa de código.
2. **Inconsistencia**: el mapa solo cubría razas y enfermedades conocidas al momento de escribirlo.
3. **Violación del principio de zero-hardcoding**: el código sabía de antemano qué entidades existían.

La Lookup API resuelve estos problemas: funciona con cualquier término que la ontología tenga, sin necesidad de mantenimiento manual.
