# Documentación técnica — Ontología Veterinaria Web

Aplicación React + TypeScript que carga una ontología OWL local, descubre su
schema dinámicamente y expone un buscador semántico sin backend. Todo el
procesamiento ocurre en el cliente.

## Estructura

```
docs/
  ontologia/
    parseo-rdf.md          Carga y parseo del archivo RDF/XML con DOMParser + n3
    sparql-local.md        Schema discovery + consultas SPARQL sobre el store local
  dbpedia/
    endpoint-sparql.md     Estrategia de consulta al endpoint SPARQL de DBpedia
    mapas-uri.md           Resolución dinámica de URIs DBpedia (Lookup API)
  ui/
    animales-page.md       AnimalesPage: tabla, filtros, drawer lateral
    hook-enrich.md         useOntologySchema, useEntityMap, useDbpediaEnrich
  search-architecture.md   Pipeline completo: parseQuery → sparqlBuilder → ResultRenderer
```

## Stack

| Capa | Tecnología |
|------|-----------|
| UI | React 19 + TypeScript |
| Bundler | Vite 8 |
| Store RDF | n3 (NamedNode, Literal, Store) |
| Motor SPARQL local | `@comunica/query-sparql-rdfjs` |
| Parseo RDF/XML | `DOMParser` nativo del browser |
| NLP español | `@nlpjs/lang-es` (tokenizer, stemmer, stopwords) |
| Enriquecimiento | DBpedia SPARQL (`es.dbpedia.org/sparql`) + Lookup API |

## Flujo general

```
Archivo RDF/XML (public/)
       │
       ▼ fetch + DOMParser
   n3 Store (in-memory, ~2 436 triples)
       │
       ├──────────────────────────────────────────────────────────────┐
       ▼ schemaDiscovery.ts (SPARQL introspección)                    │
   OntologySchema                                                     │
   (clases, props, relaciones)                                        │
       │                                                              │
       ▼ buildEntityMap()                                             │
   EntityMap                                                          │
   (termToClass + termToPropertyValue)                                │
       │                                                              │
       ▼ parseQuery(input, entityMap, schema)                         │
   ParsedQuery                                                        │
   (searchMode, entityContexts[])                                     │
       │                                                              │
       ▼ buildQuery(parsed, schema)                                   │
   SPARQL string                                                      │
       │                                                              │
       ▼ runQuery(store, sparql)                                      │
   Record<string, string>[]                                           │
       │                                                              │
       ▼                                                              │
   ResultRenderer / AnimalTable  ◄─── animales base cargados ────────┘
       │
       ▼ click en fila Animal
   useDbpediaEnrich → es.dbpedia.org/sparql (Lookup API + SPARQL)
       │
       ▼
   AnimalDrawer (abstract + thumbnail + wikiPage)
```

## Principio de diseño: zero hardcoding de dominio

Toda la información sobre la ontología (clases, propiedades, relaciones, valores)
se descubre en tiempo de ejecución interrogando el n3 Store. No existen mapas,
constantes ni enumeraciones de dominio en el código fuente. Si la ontología cambia,
la aplicación se adapta sola.

Ver [`search-architecture.md`](./search-architecture.md) para el detalle completo.
