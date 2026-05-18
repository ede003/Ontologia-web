# Documentación técnica — Ontología Veterinaria Web

Aplicación React + TypeScript que carga una ontología OWL local y la enriquece
con información semántica de DBpedia. Todo el procesamiento ocurre en el cliente
(sin backend).

## Estructura

```
docs/
  ontologia/
    parseo-rdf.md          Carga y parseo del archivo RDF/XML con DOMParser + n3
    sparql-local.md        Consultas SPARQL sobre el store local con Comunica
  dbpedia/
    endpoint-sparql.md     Estrategia de consulta al endpoint SPARQL de DBpedia
    mapas-uri.md           Mapeo raza/especie/enfermedad → slug de DBpedia
  ui/
    animales-page.md       AnimalesPage: tabla, filtros, drawer lateral
    hook-enrich.md         useDbpediaEnrich: carga lazy y caché de enriquecimiento
```

## Stack

| Capa | Tecnología |
|------|-----------|
| UI | React 19 + TypeScript |
| Bundler | Vite 8 |
| Store RDF | n3 (NamedNode, Literal, Store) |
| Motor SPARQL local | `@comunica/query-sparql-rdfjs` |
| Parseo RDF/XML | `DOMParser` nativo del browser |
| Enriquecimiento | DBpedia SPARQL (`es.dbpedia.org/sparql`) |

## Flujo general

```
Archivo RDF/XML (public/)
       │
       ▼ fetch + DOMParser
   n3 Store (in-memory)
       │
       ▼ Comunica SPARQL
  Individual[]  ──────────────────────► AnimalesPage (tabla)
                                               │
                                        click en fila
                                               │
                                               ▼
                                     useDbpediaEnrich (hook)
                                               │
                                               ▼ SPARQL HTTP GET
                                     es.dbpedia.org/sparql
                                               │
                                               ▼
                                       Panel lateral (drawer)
                                   abstract + thumbnail + wikiPage
```
