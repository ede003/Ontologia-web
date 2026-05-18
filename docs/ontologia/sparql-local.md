# Consultas SPARQL sobre la ontología local

**Archivo fuente:** `src/repositories/ontologyRepository.ts`  
**Motor SPARQL:** `@comunica/query-sparql-rdfjs`

## Por qué Comunica

n3 provee el `Store` (índice RDF) pero no tiene motor SPARQL. Para cumplir el
requisito de "consultas siempre con SPARQL" se usa **Comunica**, que implementa
SPARQL 1.1 completo y acepta cualquier store compatible con la interfaz RDF.js
(como n3's `Store`).

```typescript
import { QueryEngine } from '@comunica/query-sparql-rdfjs';
const engine = new QueryEngine(); // instancia única, reutilizable
```

El engine es **stateless** — no guarda estado entre queries, solo ejecuta y
devuelve resultados.

## Función principal: `getIndividualsByClass`

```typescript
export async function getIndividualsByClass(
  store: Store,
  className: string,
): Promise<Individual[]>
```

### Query SPARQL generado

Obtiene en una sola pasada la pertenencia a clase y todas las propiedades:

```sparql
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX owl:  <http://www.w3.org/2002/07/owl#>
PREFIX vet:  <http://www.semanticweb.org/grupo14/ontologias/veterinaria#>

SELECT ?subject ?predicate ?object WHERE {
  ?subject rdf:type <http://...#Animal> .
  ?subject ?predicate ?object .
}
```

El join entre la restricción de tipo y todos los predicados evita hacer N+1
queries (una por cada individuo).

### Procesamiento de resultados

```typescript
const stream = await engine.queryBindings(sparql, { sources: [store] });
const rows = await stream.toArray();

const bySubject = new Map<string, Record<string, string>>();
for (const row of rows) {
  const s = row.get('subject')?.value;
  const p = row.get('predicate')?.value;
  const o = row.get('object')?.value;
  if (!bySubject.has(s)) bySubject.set(s, {});
  bySubject.get(s)![localName(p)] = o;   // localName: "vet:#color" → "color"
}
```

El resultado es un array de `Individual`:
```typescript
interface Individual {
  uri: string;                      // IRI completo del individuo
  props: Record<string, string>;    // { nombreAnimal: "Thor", especie: "Canino", ... }
}
```

## Funciones específicas por clase

Todas delegan a `getIndividualsByClass` con el nombre de clase correspondiente:

| Función | Clase URI |
|---------|-----------|
| `getAnimales(store)` | `vet:#Animal` |
| `getVeterinarios(store)` | `vet:#Veterinario` |
| `getEnfermedades(store)` | `vet:#Enfermedad` |
| `getMedicamentos(store)` | `vet:#Medicamento` |
| `getConsultas(store)` | `vet:#Consulta` |

Todas son `async` porque Comunica opera sobre streams.

## Uso desde la UI

```typescript
// En AnimalesPage.tsx
useEffect(() => {
  if (!store) return;
  getAnimales(store).then(result => setAnimales(result));
}, [store]);
```

El `store` solo está disponible después de que `useOntology` termine de cargar,
por eso se usa `useEffect` con `[store]` como dependencia.
