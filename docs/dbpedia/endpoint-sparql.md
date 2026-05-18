# Endpoint SPARQL de DBpedia

**Archivo fuente:** `src/services/dbpediaService.ts`  
**Función base:** `queryDBpedia(sparql: string): Promise<SparqlBinding[]>`

> Los query builders y las funciones `getAnimalInfo`/`getEnfermedadInfo` están en
> `src/repositories/dbpediaRepository.ts`. Los mapas de slugs están en `src/maps/dbpediaMaps.ts`.

## Diagnóstico: por qué `dbpedia.org/sparql` no funcionaba

Durante el desarrollo se detectó que el endpoint principal `https://dbpedia.org/sparql`
devolvía `bindings: []` incluso para recursos conocidos como `dbr:Pug`.

La causa: `dbpedia.org/sparql` **no expone `dbo:abstract`** en su grafo por defecto.
Solo tiene `dbo:description`, que es un texto de 3-5 palabras ("Chinese dog breed").

```bash
# Predicados disponibles para dbr:Pug en dbpedia.org:
rdf:type, owl:sameAs, rdfs:label, dct:subject,
dbo:wikiPageWikiLink, dbo:description,   ← corto
dbo:thumbnail, foaf:depiction, ...
# dbo:abstract → ausente
```

## Endpoint adoptado: `es.dbpedia.org/sparql`

El endpoint de la DBpedia en español sí sirve `dbo:abstract` completo.
Acepta los mismos URIs `http://dbpedia.org/resource/...` (linked via `owl:sameAs`).
Tiene CORS habilitado (`Access-Control-Allow-Origin: *`).

```
Endpoint: https://es.dbpedia.org/sparql
Método:   GET
Params:   query=<SPARQL url-encoded>, format=json
Headers:  Accept: application/sparql-results+json
```

## Función `queryDBpedia`

```typescript
export async function queryDBpedia(sparql: string): Promise<SparqlBinding[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000); // timeout 8s
  try {
    const url = `${ENDPOINT}?query=${encodeURIComponent(sparql)}&format=json`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/sparql-results+json' },
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const rawText = await res.text();
    const json = JSON.parse(rawText);
    return json?.results?.bindings ?? [];
  } catch {
    clearTimeout(timer);
    return []; // degradación elegante: nunca rompe la app
  }
}
```

**Decisiones de diseño:**
- `AbortController` con timeout de 8 s evita que la UI quede colgada si DBpedia
  no responde.
- El `catch` captura cualquier error (red, timeout, JSON malformado) y retorna `[]`.
  Esto garantiza que el enriquecimiento sea siempre opcional y nunca bloquee la UI.

## Formato de respuesta SPARQL JSON

DBpedia retorna el estándar W3C SPARQL 1.1 JSON:

```json
{
  "results": {
    "bindings": [
      {
        "abstract":  { "type": "literal", "xml:lang": "es", "value": "El pug es..." },
        "thumbnail": { "type": "uri",     "value": "http://commons.wikimedia.org/..." },
        "page":      { "type": "uri",     "value": "http://en.wikipedia.org/wiki/Pug" }
      }
    ]
  }
}
```

La propiedad de idioma es `"xml:lang"` (con dos puntos en la clave), accesible en
JavaScript como `binding.abstract?.['xml:lang']`.

## Query con URI directo (estrategia final)

Usar `FILTER + contains(lcase(?label), ...)` resultó ineficiente en DBpedia
(timeouts o resultados vacíos por falta de índices de texto).

La estrategia adoptada usa el **URI directo** del recurso, que es O(1):

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

El `ORDER BY (lang(?abstract) != 'es')` coloca el abstract en español primero
(la expresión booleana devuelve `false=0` para español y `true=1` para inglés).
