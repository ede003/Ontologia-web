# Consultas SPARQL sobre la ontología local

**Archivos:** `src/services/schemaDiscovery.ts`, `src/repositories/ontologyRepository.ts`  
**Motor SPARQL:** `@comunica/query-sparql-rdfjs`

## Por qué Comunica

n3 provee el `Store` (índice RDF) pero no tiene motor SPARQL. Para consultas siempre con SPARQL se usa **Comunica**, que implementa SPARQL 1.1 completo y acepta cualquier store compatible con la interfaz RDF.js.

```typescript
import { QueryEngine } from '@comunica/query-sparql-rdfjs';
const engine = new QueryEngine(); // instancia única, stateless
```

## Tres capas de consulta SPARQL

### 1. Schema discovery (`schemaDiscovery.ts`)

Al arrancar, se interroga el store para descubrir toda la estructura de la ontología sin ningún hardcoding. Se ejecuta una sola vez (singleton vía `useOntologySchema`).

**Q1 — Clases que tienen instancias:**
```sparql
SELECT DISTINCT ?class WHERE {
  ?i rdf:type owl:NamedIndividual .
  ?i rdf:type ?class .
  FILTER(?class != owl:NamedIndividual && ?class != owl:Thing)
  FILTER(STRSTARTS(STR(?class), "http://...veterinaria#"))
}
```

**Q2 — Propiedades literales reales por clase** (inductivo — evita herencia de rdfs:domain):
```sparql
SELECT DISTINCT ?pred WHERE {
  ?i rdf:type vet:Animal .   -- se repite por cada clase
  ?i ?pred ?val .
  FILTER(isLiteral(?val))
  FILTER(STRSTARTS(STR(?pred), "http://...veterinaria#"))
}
```

**Q3 — Valores distintos por (clase, predicado):**
```sparql
SELECT DISTINCT ?val WHERE {
  ?i rdf:type vet:Animal .
  ?i vet:especie ?val .
  FILTER(isLiteral(?val))
} LIMIT 200
```

**Q4 — Object properties (relaciones) por clase:**
```sparql
SELECT DISTINCT ?pred ?targetClass WHERE {
  ?i rdf:type vet:Animal .
  ?i ?pred ?target .
  ?target rdf:type ?targetClass .
  FILTER(isIRI(?target))
  FILTER(STRSTARTS(STR(?pred), "http://...veterinaria#"))
  FILTER(STRSTARTS(STR(?targetClass), "http://...veterinaria#"))
  FILTER(?targetClass != owl:NamedIndividual)
}
```

Q2 y Q3 se lanzan en paralelo con `Promise.all` para todas las clases.

### 2. Carga base (`ontologyRepository.ts`)

Carga todos los animales al inicio para el desplegable de especie y el drawer lateral.

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

La relación es `vet:afectaA` (desde Enfermedad hacia Animal).

### 3. Búsqueda inteligente (`src/utils/`)

Cuando el usuario escribe en el buscador, el pipeline construye y ejecuta una query dinámica:

```
queryParser.ts     → ParsedQuery { searchMode, entityContexts[] }
sparqlBuilder.ts   → SPARQL string (despacha según searchMode)
sparqlExecutor.ts  → engine.queryBindings() → Record<string, string>[]
```

Ver [../search-architecture.md](../search-architecture.md) para el diagrama completo.

## `sparqlExecutor.ts`

Wrapper sobre Comunica que devuelve filas planas. Usa `row.forEach` en lugar de `for...of row.entries()`: en Comunica v5 el método `entries()` retorna un `Iterator` (no un `IterableIterator`), por lo que `for...of` falla en runtime.

```typescript
const stream = await engine.queryBindings(sparqlQuery, { sources: [store] })
const rows = await stream.toArray()
return rows.map(row => {
  const result: Record<string, string> = {}
  row.forEach((term, key) => { result[key.value] = term.value })
  return result
})
```

## Tipos de query generadas por `sparqlBuilder`

| searchMode | Cuándo | Ejemplo | Variables SPARQL |
|------------|--------|---------|-----------------|
| `entity` | 1 clase detectada (con o sin filtros) | `enfermedades`, `perros`, `otitis` | `?instance`, `?name`, `?propName` |
| `multi-entity` | 2+ clases con join path | `perro con otitis`, `golden retriever 4 años otitis` | `?var0`, `?var0Name`, `?var1`, `?var1Name` |
| `content` | Ninguna clase detectada | `inflamación del oído` | `?instance`, `?className`, `?labelVal`, `?matchProp`, `?matchVal` |
| `fallback` | Input vacío (no debería llegar) | — | igual que content |

### Ejemplo: búsqueda entity con filtros (modo actual para "perros")

```sparql
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX vet:  <http://www.semanticweb.org/grupo14/ontologias/veterinaria#>

SELECT * WHERE {
  ?instance rdf:type <vet:Animal> .
  OPTIONAL { ?instance <vet:nombreAnimal> ?name }
  OPTIONAL { ?instance <vet:raza> ?raza }
  OPTIONAL { ?instance <vet:sexo> ?sexo }
  OPTIONAL { ?instance <vet:edad> ?edad }
  -- ... todas las props datatype del schema, generadas dinámicamente
  FILTER(BOUND(?especie) && LCASE(?especie) = "perro")
}
```

### Ejemplo: búsqueda multi-entity (modo actual para "perro con otitis")

```sparql
SELECT * WHERE {
  ?var0 rdf:type <vet:Animal> .
  ?var1 rdf:type <vet:Enfermedad> .
  ?var1 <vet:afectaA> ?var0 .              -- edge descubierto por BFS
  OPTIONAL { ?var0 <vet:nombreAnimal> ?var0Name }
  OPTIONAL { ?var1 <vet:nombreEnfermedad> ?var1Name }
  OPTIONAL { ?var0 <vet:especie> ?var0_especie }
  OPTIONAL { ?var0 <vet:raza> ?var0_raza }
  -- ... resto de props
  FILTER(BOUND(?var0_especie) && LCASE(?var0_especie) = "perro")
  FILTER(BOUND(?var1_nombreEnfermedad) && LCASE(?var1_nombreEnfermedad) = "otitis")
}
```

## Prefijo de la ontología

```
vet: <http://www.semanticweb.org/grupo14/ontologias/veterinaria#>
```

Usado en todos los queries como `PREFIX vet: <...>`.
