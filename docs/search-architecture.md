# Arquitectura de Búsqueda Semántica

## Visión general

El buscador transforma texto libre en consultas SPARQL relacionales contra la ontología veterinaria local (`Ontologia_Veterinaria_DEPURADA.rdf`). No hay base de datos intermedia ni API REST; Comunica ejecuta las consultas directamente sobre el store n3 en el navegador.

## Pipeline de búsqueda

```
Texto del usuario
       │
       ▼
┌──────────────┐
│ queryParser  │  @nlpjs/lang-es tokeniza y elimina stopwords en español.
└──────┬───────┘  Resultado: { primaryTerm, secondaryTerm, isRelational, stemmed }
       │
       ▼
┌──────────────┐
│entityDetector│  CLASS_MAP mapea términos (raw y stems) a clases de la ontología.
└──────┬───────┘  Ejemplo: "otitis"/"otit" → Enfermedad, "perros"/"perr" → Animal
       │
       ▼
┌──────────────┐
│ sparqlBuilder│  Construye la query SPARQL según el tipo detectado:
└──────┬───────┘    • Relacional: JOIN Animal ↔ Enfermedad via vet:afectaA
       │             • Una clase:  SELECT instancias con OPTIONAL fields
       │             • Fallback:   búsqueda UNION sobre labels de todas las clases
       ▼
┌──────────────┐
│sparqlExecutor│  engine.queryBindings() sobre el n3 Store (Comunica, en-browser).
└──────┬───────┘  Devuelve Record<string, string>[].
       │
       ▼
┌──────────────┐
│ResultRenderer│  Renderiza según queryMeta:
└──────────────┘    • isRelational → tabla Subject | → | Object
                    • clase Animal → tabla existente + drawer DBpedia
                    • otra clase  → tabla dinámica con columnas del resultado
```

## Librería NLP: @nlpjs/lang-es

**Paquete:** `@nlpjs/lang-es` (AXA Group, parte del ecosistema nlp.js, 29 idiomas)  
**Reemplaza:** `compromise.js` — descartado porque es English-only en su núcleo; el fork `es-compromise` fue traducido por AWS Translate en 2022 y no está mantenido activamente.

### Qué proporciona

| Clase | Uso |
|-------|-----|
| `TokenizerEs` | Tokeniza texto español, normaliza acentos |
| `StopwordsEs` | Lista nativa de stopwords en español (`de`, `con`, `para`, `los`, …) |
| `StemmerEs`   | Snowball Spanish — reduce palabras a su raíz (`gatos` → `gat`, `enfermedades` → `enfermedad`) |

### Flujo dentro de `queryParser`

```
"animales con otitis"
       │
       ├─ tokenize + removeStopwords → terms = ["animales", "otitis"]
       │                                primaryTerm = "animales" (raw, para filtros SPARQL)
       │                                secondaryTerm = "otitis"
       │                                isRelational = true
       └─ tokenizeAndStem            → stemmed = ["animal", "otit"]
                                       (usado por detectEntityType como fallback)
```

### Doble lookup en `detectEntityType`

1. Busca `CLASS_MAP[rawTerm]` (formas estándar ya están en el mapa)
2. Si no hay match, aplica stemming y busca `CLASS_MAP[stem]`

Esto cubre diminutivos, plurales irregulares y formas no listadas explícitamente.

## Clases de la ontología (`vet:`)

| Clase         | Propiedad label           | Relaciones clave                            |
|---------------|---------------------------|---------------------------------------------|
| Animal        | `vet:nombreAnimal`        | `←afectaA─ Enfermedad`, `→tieneDueno→ Dueno` |
| Enfermedad    | `vet:nombreEnfermedad`    | `→afectaA→ Animal`, `←trata─ Medicamento`  |
| Medicamento   | `vet:nombreMedicamento`   | `→trata→ Enfermedad`, `→administradoA→ Animal` |
| Veterinario   | `vet:nombre`              | `←esAtendidoPor─ Animal`                   |
| Consulta      | `vet:descripcionServicio` | `→realizadoA→ Animal`, `→correspondeA→ Enfermedad` |
| Vacunacion    | `vet:tipoVacuna`          | `→realizadoA→ Animal`                      |
| Tratamiento   | `vet:tipoTratamiento`     | `→realizadoA→ Animal`                      |
| ExamenMedico  | `vet:tipoExamen`          | `→realizadoA→ Animal`                      |
| Cirugia       | `vet:tipoCirugia`         | `→realizadoA→ Animal`                      |
| Dueno         | `vet:nombre`              | `←tieneDueno─ Animal`                      |

## Ejemplos de consultas

| Texto libre                     | Tipo detectado          | SPARQL generado                          |
|---------------------------------|-------------------------|------------------------------------------|
| `animales`                      | Animal (genérico)       | SELECT todos los animales                |
| `perros`                        | Animal + especie filter | SELECT animales WHERE especie = "perro"  |
| `enfermedades`                  | Enfermedad (genérico)   | SELECT todas las enfermedades            |
| `animales con otitis`           | Animal ↔ Enfermedad     | JOIN + FILTER nombreEnfermedad = "otitis"|
| `medicamentos para rabia`       | Medicamento ↔ Enfermedad| JOIN via vet:trata + FILTER "rabia"      |
| `consultas del Dr. Flores`      | Consulta ↔ Veterinario  | JOIN via vet:realizadoPor + FILTER "flores"|

## Archivos involucrados

```
src/
├── utils/
│   ├── queryParser.ts      — Extrae términos del texto libre
│   ├── entityDetector.ts   — Mapea términos a clases de la ontología
│   ├── sparqlBuilder.ts    — Construye las queries SPARQL
│   └── sparqlExecutor.ts   — Ejecuta las queries sobre el n3 Store
├── components/
│   └── ResultRenderer.tsx  — Renderiza resultados según tipo de query
└── pages/
    └── AnimalesPage.tsx    — Orquesta el pipeline en el onChange del input
```
