# Endpoint SPARQL de DBpedia

**Archivos:** `src/services/dbpediaService.ts`, `src/repositories/dbpediaRepository.ts`

## Endpoint adoptado: `es.dbpedia.org/sparql`

El endpoint principal `dbpedia.org/sparql` no expone `dbo:abstract` en su grafo
por defecto (solo `dbo:description`, que son 3-5 palabras). La versión española
sí sirve el abstract completo y tiene CORS habilitado.

```
Endpoint: https://es.dbpedia.org/sparql
Método:   GET
Params:   query=<SPARQL url-encoded>&format=json
Headers:  Accept: application/sparql-results+json
Timeout:  8 segundos (AbortController)
```

## Función `queryDBpedia`

Envía SPARQL y devuelve filas de binding como `Record<string, string>[]`.
No hay objeto intermedio — cada fila es directamente el resultado de la variable
SPARQL con su valor en cadena:

```typescript
export async function queryDBpedia(sparql: string): Promise<Record<string, string>[]> {
  // ... fetch con timeout y AbortController ...
  const bindings = data?.results?.bindings ?? []
  return bindings.map(row =>
    Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v.value]))
  )
}
```

El `catch` captura cualquier error (red, timeout) y retorna `[]`.
Esto garantiza que el enriquecimiento sea siempre opcional y nunca bloquee la UI.

## Queries SPARQL

### Para animales (`buildAnimalQuery`)

```sparql
PREFIX dbo:  <http://dbpedia.org/ontology/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?abstract ?thumbnail ?page WHERE {
  <http://dbpedia.org/resource/Pug> dbo:abstract ?abstract .
  OPTIONAL { <http://dbpedia.org/resource/Pug> dbo:thumbnail ?thumbnail }
  OPTIONAL { <http://dbpedia.org/resource/Pug> foaf:isPrimaryTopicOf ?page }
  FILTER (lang(?abstract) = 'es' || lang(?abstract) = 'en')
} ORDER BY (lang(?abstract) != 'es') LIMIT 2
```

Variables devueltas: `abstract`, `thumbnail` (opcional), `page` (opcional).

`ORDER BY (lang(?abstract) != 'es')` coloca el español primero (`false=0 < true=1`).

### Para enfermedades (`buildEnfermedadQuery`)

Igual que el de animales pero sin `?thumbnail`.
Variables devueltas: `abstract`, `page` (opcional).

## Flujo completo con resolución dinámica de slug

```
getAnimalInfo(especie, raza)
     │
     ▼ resolveSlugViaLookup(raza || especie)
lookup.dbpedia.org/api/search?query=...
     │  → "http://dbpedia.org/resource/Pug"
     ▼  → slug = "Pug"
buildAnimalQuery(slug) → SPARQL SELECT
     │  fetch GET es.dbpedia.org/sparql
     ▼
{ results: { bindings: [ { abstract: { value: "..." }, ... } ] } }
     │  Object.fromEntries(...)
     ▼
Record<string, string>[]
     │
     ▼
useDbpediaEnrich → enriched[0].abstract / .thumbnail / .page
     │
     ▼
AnimalDrawer (muestra valores directamente desde el binding row)
```

No hay objetos intermedios (`DbpediaAnimalInfo`, `SparqlBinding`).

## Resolución de slug

Los slugs DBpedia se obtienen dinámicamente mediante la **DBpedia Lookup API** (`lookup.dbpedia.org`), no de mapas estáticos. Ver [mapas-uri.md](./mapas-uri.md) para detalles.
