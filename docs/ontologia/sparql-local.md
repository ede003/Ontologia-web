# Consultas SPARQL sobre la ontología local

**Archivo fuente:** `src/repositories/ontologyRepository.ts`  
**Motor SPARQL:** `@comunica/query-sparql-rdfjs`

## Por qué Comunica

n3 provee el `Store` (índice RDF) pero no tiene motor SPARQL. Para cumplir el
requisito de "consultas siempre con SPARQL" se usa **Comunica**, que implementa
SPARQL 1.1 completo y acepta cualquier store compatible con la interfaz RDF.js.

```typescript
import { QueryEngine } from '@comunica/query-sparql-rdfjs';
const engine = new QueryEngine(); // instancia única, stateless
```

## Dos capas de consulta SPARQL

### 1. Carga base (`ontologyRepository.ts`)

Carga todos los animales al inicio para poblar el select de especie y el drawer.
La query de `getAnimales` obtiene en una sola pasada propiedades y enfermedades:

```sparql
SELECT ?animal ?predicate ?object ?nombreEnfermedad WHERE {
  ?animal rdf:type vet:Animal .
  ?animal ?predicate ?object .
  OPTIONAL {
    ?enfermedad vet:afectaA ?animal .
    ?enfermedad vet:nombreEnfermedad ?nombreEnfermedad .
  }
}
```

La relación correcta es `vet:afectaA` (desde Enfermedad hacia Animal).

### 2. Búsqueda inteligente (`src/utils/`)

Cuando el usuario escribe en el buscador, el pipeline construye y ejecuta una
query dinámica contra el mismo `Store`:

```
src/utils/queryParser.ts   → extrae términos del texto libre
src/utils/entityDetector.ts → mapea términos a clases de la ontología
src/utils/sparqlBuilder.ts  → construye la query SPARQL (relacional, una clase, o fallback)
src/utils/sparqlExecutor.ts → engine.queryBindings() → Record<string, string>[]
```

Ver [../search-architecture.md](../search-architecture.md) para el diagrama completo.

## `sparqlExecutor.ts`

Wrapper sobre Comunica que devuelve filas planas. Usa `row.forEach` en lugar de
`for...of row.entries()`: en Comunica v5 el método `entries()` retorna un `Iterator`
(no un `IterableIterator`), por lo que `for...of` falla en runtime.

```typescript
export async function runQuery(store: Store, sparqlQuery: string): Promise<Record<string, string>[]> {
  const stream = await engine.queryBindings(sparqlQuery, { sources: [store] })
  const rows   = await stream.toArray()
  return rows.map(row => {
    const result: Record<string, string> = {}
    row.forEach((term, key) => { result[key.value] = term.value })
    return result
  })
}
```

## Tipos de query generadas por `sparqlBuilder`

| Tipo | Cuándo | Ejemplo |
|------|--------|---------|
| Relacional | 2 clases detectadas + join conocido | `animales con otitis` |
| Una clase | 1 clase detectada | `enfermedades`, `perros` |
| Fallback | Ninguna clase detectada | texto libre → UNION en labels |

### Filtro de especie en queries relacionales

Cuando el término primario (o secundario) es una palabra de especie animal
(`perro`, `gato`, `loro`, …), la query relacional filtra sobre `vet:especie` en lugar
de hacer `CONTAINS` sobre `vet:nombreAnimal`. Sin este ajuste, "perro con otitis"
buscaría "perro" en el nombre del animal ("Buddy", "Canela") y devolvería 0 resultados.

```sparql
-- "perro con otitis" genera:
SELECT ?subject ?subjectName ?object ?objectName WHERE {
  ?subject rdf:type vet:Animal .
  ?object  rdf:type vet:Enfermedad .
  ?object vet:afectaA ?subject .
  OPTIONAL { ?subject vet:nombreAnimal ?subjectName }
  OPTIONAL { ?object  vet:nombreEnfermedad ?objectName }
  OPTIONAL { ?subject vet:especie ?subjectEspecie }   -- añadido para especies
  FILTER(LCASE(?subjectEspecie) = "perro")            -- filtra especie, no nombre
  FILTER(CONTAINS(LCASE(?objectName), "otitis"))
}
```

La lógica está en `resolveSpeciesValue()` de `entityDetector.ts`, que devuelve el
valor exacto de `vet:especie` para términos de especie, o `null` para el resto.

## Prefijo de la ontología

```
vet: <http://www.semanticweb.org/grupo14/ontologias/veterinaria#>
```

Usado en todos los queries como `PREFIX vet: <...>`.
