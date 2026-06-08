# Arquitectura de Búsqueda Semántica

## Visión general

El buscador transforma texto libre en consultas SPARQL contra la ontología veterinaria local. No hay base de datos intermedia ni API REST; Comunica ejecuta las consultas directamente sobre el n3 Store en el navegador.

**Principio fundamental:** ninguna clase, propiedad, relación ni valor de la ontología está hardcodeado en el código. Todo se descubre dinámicamente de la ontología al iniciar la aplicación (`schemaDiscovery.ts`).

## Pipeline completo

```
Texto del usuario
       │
       ▼
┌──────────────────┐
│  schemaDiscovery │  SPARQL introspection al arranque:
└────────┬─────────┘  descubre clases, propiedades literales,
         │            valores distintos y relaciones (object props).
         │            Resultado: OntologySchema
         ▼
┌──────────────────┐
│  buildEntityMap  │  Para cada clase → auto-genera términos (split camelCase,
└────────┬─────────┘  plural, stems). Para cada valor de cada prop → indexa en
         │            termToPropertyValue con el canon del valor ontológico.
         │            Resultado: EntityMap
         ▼
┌──────────────────┐
│   queryParser    │  @nlpjs/lang-es tokeniza, elimina stopwords y aplica stemming.
└────────┬─────────┘  Algoritmo greedy longest-match sobre los tokens:
         │              - frase en termToPropertyValue → PropertyValueMatch (clase + prop + valor)
         │              - frase en termToClass → EntityContext genérico
         │            Extrae "N años" con regex (conocimiento de lenguaje, no datos).
         │            Resultado: ParsedQuery { searchMode, entityContexts[] }
         ▼
┌──────────────────┐
│  sparqlBuilder   │  Despacha según searchMode:
└────────┬─────────┘    entity      → SELECT * + OPTIONAL fields + FILTER por props
         │              multi-entity → BFS en adjacency graph para encontrar join path;
         │                            genera ?var0, ?var1, ... con N JOINs y N filtros
         │              content     → CONTAINS() sobre todos los literales de todas las clases
         ▼
┌──────────────────┐
│ sparqlExecutor   │  engine.queryBindings() sobre el n3 Store (Comunica, en-browser).
└────────┬─────────┘  Devuelve Record<string, string>[].
         ▼
┌──────────────────┐
│ ResultRenderer / │  Renderiza según searchMode del QueryMeta:
│  AnimalTable     │    entity (Animal)   → tabla de animales + drawer DBpedia
└──────────────────┘    multi-entity      → tabla N columnas (una por entidad)
                        content           → tabla Tipo | Nombre | Campo | Valor encontrado
                        otra clase        → tabla dinámica con columnas del resultado
```

## Tipos de datos clave

### OntologySchema

```typescript
interface OntologySchema {
  classes: Map<string, ClassSchema>     // localName → schema de esa clase
  relations: RelationEdge[]             // todas las relaciones descubiertas
  adjacency: Map<string, RelationEdge[]>// fromClass → edges para BFS
}

interface ClassSchema {
  localName: string        // "Animal", "Enfermedad", ...
  fullIri: string
  labelProperty: string    // IRI de la prop de etiqueta (descubierta con heurística)
  datatypeProps: PropertySchema[]   // todas las props literales
  objectProps: RelationEdge[]       // todas las relaciones salientes
}
```

### EntityMap

```typescript
interface EntityMap {
  termToClass: Map<string, string>                       // "enfermedad" → "Enfermedad"
  termToPropertyValue: Map<string, PropertyValueMatch[]> // "otitis" → [{Enfermedad, nombreEnfermedad, "Otitis"}]
  classNames: Set<string>
}
```

### ParsedQuery

```typescript
interface ParsedQuery {
  rawInput: string
  searchMode: 'entity' | 'multi-entity' | 'content' | 'fallback'
  entityContexts: EntityContext[]  // uno por clase detectada
  terms: string[]
  stemmed: string[]
}

interface EntityContext {
  className: string
  propertyFilters: PropertyFilter[]
}

interface PropertyFilter {
  propertyLocalName: string
  value: string
  matchType: 'exact' | 'contains' | 'numeric'
}
```

## Librería NLP: @nlpjs/lang-es

| Clase | Uso |
|-------|-----|
| `TokenizerEs` | Tokeniza texto español, normaliza acentos |
| `StopwordsEs` | Lista nativa de stopwords (`de`, `con`, `para`, `los`, …) |
| `StemmerEs` | Snowball Spanish — reduce a raíz (`gatos` → `gat`, `enfermedades` → `enfermedad`) |

### Algoritmo greedy longest-match en queryParser

```
"perro golden retriever de 4 años con otitis"
       │
       ├─ extractAge(regex) → age = "4", tokens = ["perro", "golden", "retriever", "otitis"]
       │
       └─ longestMatch loop:
           pos 0: "perro golden retriever" → no match
                  "perro golden" → no match
                  "perro" → termToPropertyValue → {Animal, especie, "Perro"}  ✓
           pos 1: "golden retriever otitis" → no match
                  "golden retriever" → termToPropertyValue → {Animal, raza, "Golden Retriever"} ✓
           pos 3: "otitis" → termToPropertyValue → {Enfermedad, nombreEnfermedad, "Otitis"} ✓
           age → Animal context tiene prop "edad" → añade {edad, "4", numeric}

Resultado:
  entityContexts: [
    { className: "Animal",    propertyFilters: [especie=Perro, raza=Golden Retriever, edad=4] },
    { className: "Enfermedad", propertyFilters: [nombreEnfermedad=Otitis] }
  ]
  searchMode: "multi-entity"
```

## BFS para N-joins en multi-entity

El `sparqlBuilder` usa el `adjacency` graph del schema para encontrar el camino de join entre N entidades:

```
Para [Animal, Enfermedad]:
  adjacency["Animal"].find(toClass="Enfermedad") → NO encontrado
  adjacency["Enfermedad"].find(toClass="Animal") → ENCONTRADO: afectaA (reverse)
  SPARQL: ?var1 <vet:afectaA> ?var0 .

Para [Animal, Enfermedad, Medicamento]:
  paso 1: Animal ↔ Enfermedad → ?var1 <vet:afectaA> ?var0 .
  paso 2: Enfermedad ↔ Medicamento:
    adjacency["Enfermedad"].find(toClass="Medicamento") → NO
    adjacency["Medicamento"].find(toClass="Enfermedad") → ENCONTRADO: trata (reverse)
    SPARQL: ?var2 <vet:trata> ?var1 .
```

Si no existe ningún edge entre un par de clases, se cae a `content search`.

## Búsqueda de contenido (searchMode: 'content')

Se activa cuando el parser no detecta ninguna clase ni valor de propiedad conocido. Hace un `CONTAINS()` sobre **todos los literales de todas las clases**.

El `DISTINCT` se aplica en un subquery interior antes del `OPTIONAL` para evitar que Comunica materialice el producto cartesiano `matches × label-triples` antes de deduplicar (causaba timeouts de 3+ minutos):

```sparql
SELECT ?instance ?className ?labelVal ?matchProp ?matchVal WHERE {
  {
    SELECT DISTINCT ?instance ?className ?matchProp ?matchVal WHERE {
      ?instance rdf:type ?class .
      FILTER(STRSTARTS(STR(?class), "http://...veterinaria#"))
      BIND(STRAFTER(STR(?class), "#") AS ?className)
      ?instance ?matchProp ?matchVal .
      FILTER(isLiteral(?matchVal) && CONTAINS(LCASE(str(?matchVal)), "término"))
      FILTER(STRSTARTS(STR(?matchProp), "http://...veterinaria#"))
    }
  }
  OPTIONAL {
    ?instance ?labelPred ?labelVal .
    FILTER(?labelPred IN (<labelProp_0>, <labelProp_1>, ...))  -- generado del schema
  }
}
LIMIT 200
```

## Ejemplos de comportamiento

| Texto libre | searchMode | Resultado |
|-------------|-----------|-----------|
| `animales` | entity | SELECT todos los animales (clase genérica) |
| `perros` | entity | Animal con FILTER especie = "Perro" |
| `otitis` | entity | Enfermedad con FILTER nombreEnfermedad = "Otitis" |
| `perro con otitis` | multi-entity | JOIN Animal ↔ Enfermedad, especie=Perro + nombre=Otitis |
| `perro golden retriever 4 años otitis` | multi-entity | 3 filtros Animal + 1 filtro Enfermedad |
| `macho` | entity | Animal con FILTER sexo = "Macho" (valor de vet:sexo en ontología) |
| `Leptospirosis Hamster` | entity | Vacunacion con FILTER tipoVacuna = "Leptospirosis Hamster" |
| `inflamación del oído` | content | CONTAINS() sobre todos los literales de todas las clases |

## Resolución de conflictos en EntityMap (entityDetector.ts)

### Guard de stem para valores multi-palabra (`registerPropertyValue`)

`stem(value)` devuelve solo el stem de la **primera palabra**. Para valores multi-palabra (ej. `"Otitis Media Canina"`) registrar el stem causaría que una búsqueda de `"otitis"` (stem `"otit"`) matcheara toda la descripción. Solo se registra el stem para valores de **una sola palabra**:

```typescript
addToValueMap(map, lower, match, incomingCount)
if (!lower.includes(' ')) {
  const s = stem(lower)
  if (s && s !== lower) addToValueMap(map, s, match, incomingCount)
}
```

El mismo guard existe en `queryParser.ts` al hacer stem-fallback en `lookupPhrase` y `lookupClass`.

### Post-procesado: prioridad de label-prop vs conflictos misma-clase

Cuando la misma clave aparece en `termToPropertyValue` con múltiples matches, se aplica una regla según el origen:

| Escenario | Regla | Ejemplo |
|-----------|-------|---------|
| **Cross-class** (matches de clases distintas) | Conservar solo los que vienen del **label property** de su clase | `"Moquillo Canino"` en `Enfermedad.nombreEnfermedad` (label) + `Consulta.diagnosticoInicial` (no-label) → queda solo Enfermedad |
| **Misma clase** (múltiples props de la misma clase) | Conservar solo los que **NO** son label property | `"loro"` en `Animal.especie` (no-label) + `Animal.nombreAnimal` (label) → queda solo especie |

La regla cross-class evita JOINs espurios. La regla misma-clase evita que una especie/raza se filtre por nombre de instancia en vez de por el atributo categórico.

### Alias `?name` para el label property en sparqlBuilder

En `buildSingleEntityQuery`, el label property se bindea como `OPTIONAL { ?instance <labelProp> ?name }`. Los `FILTER` que apunten a ese prop usan `?name` como variable (no `?{labelLocalName}`), para que `BOUND(?name)` funcione. Lo mismo aplica en `buildMultiEntityQuery` donde el alias es `?var${i}Name`.

## sparqlExecutor — timeout de 7 segundos

Todas las queries pasan por `Promise.race([queryPromise, timeoutPromise])`. Si Comunica no resuelve en 7 s (ej. content search sobre ontología grande), la query aborta, retorna `[]` y el spinner se apaga. Sin este mecanismo el UI quedaba colgado indefinidamente.

## Archivos involucrados

```
src/
├── services/
│   └── schemaDiscovery.ts   — Introspección SPARQL del store
├── hooks/
│   ├── useOntologySchema.ts — Singleton del schema
│   └── useEntityMap.ts      — Construye EntityMap desde schema
├── utils/
│   ├── queryParser.ts       — Longest-match → ParsedQuery con entityContexts
│   ├── entityDetector.ts    — EntityMap dinámico; post-procesado de conflictos
│   ├── sparqlBuilder.ts     — buildQuery(parsed, schema) → SPARQL string
│   └── sparqlExecutor.ts    — Comunica sobre n3 Store; timeout 7 s
├── components/
│   └── ResultRenderer.tsx   — Renderiza según searchMode; colLabel auto-derivado
└── pages/
    └── AnimalesPage.tsx     — Orquesta el pipeline completo
```
