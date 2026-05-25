# Parseo del archivo RDF/XML

**Archivo fuente:** `src/services/ontologyService.ts`  
**Función:** `loadOntology(): Promise<Store>`

> El parseo de RDF/XML vive en el servicio. Las consultas SPARQL sobre el Store resultante
> están en `src/repositories/ontologyRepository.ts`.

## Problema con n3 y RDF/XML

La librería **n3.js** (usada como store RDF) no incluye un parser de RDF/XML en su
distribución estándar. Intentar `new Parser({ format: 'application/rdf+xml' })` no
lanza error pero tampoco parsea correctamente el formato.

**Solución adoptada:** usar el `DOMParser` nativo del browser para leer el XML y
poblar manualmente el n3 `Store`. n3 se usa únicamente como índice de triples
(no como parser).

## Formato del archivo ontológico

El archivo `Ontologia_Veterinaria_DEPURADA.rdf` usa el patrón `rdf:Description` con
`rdf:type` como hijo, **no** `owl:NamedIndividual` como nombre de elemento XML:

```xml
<!-- Formato actual (correcto) -->
<rdf:Description rdf:about="http://...#Animal_01">
  <rdf:type rdf:resource="http://www.w3.org/2002/07/owl#NamedIndividual"/>
  <rdf:type rdf:resource="http://...#Animal"/>
  <vet:nombreAnimal>Thor</vet:nombreAnimal>
  <vet:especie>perro</vet:especie>
</rdf:Description>
```

Usar `getElementsByTagNameNS(OWL_NS, 'NamedIndividual')` retorna 0 elementos en este
formato — se necesita filtrar sobre `rdf:Description`.

## Proceso paso a paso

### 1. Fetch del archivo
```typescript
const res = await fetch('/ontologia/Ontologia_Veterinaria_DEPURADA.rdf');
const text = await res.text();
```

El archivo está en `public/ontologia/` y Vite lo sirve estáticamente.

### 2. Parseo XML con DOMParser
```typescript
const doc = new DOMParser().parseFromString(text, 'application/xml');
```

### 3. Extracción de individuos

Se seleccionan todos los `rdf:Description` (317 en total) y se filtran los que tienen
un hijo cuyo atributo `rdf:resource` sea la IRI completa de `owl:NamedIndividual`:

```typescript
const OWL_NAMED_INDIVIDUAL = 'http://www.w3.org/2002/07/owl#NamedIndividual';
const descriptions = doc.getElementsByTagNameNS(RDF_NS, 'Description');
const individuals = Array.from(descriptions).filter(desc =>
  Array.from(desc.children).some(
    child => child.getAttributeNS(RDF_NS, 'resource') === OWL_NAMED_INDIVIDUAL
  )
);
// → 254 individuos
```

### 4. Construcción de triples

El archivo usa IRIs absolutas en todos los namespaces (`vet:`, `rdf:`, etc.), por lo que
no se necesita normalización de namespace. El predicado se construye directamente de
`namespaceURI + localName`:

```typescript
for (const child of Array.from(ind.children)) {
  const pred = namedNode(child.namespaceURI + child.localName);
  const resourceRef = child.getAttributeNS(RDF_NS, 'resource');

  if (resourceRef !== null) {
    // rdf:resource="..." → NamedNode (normaliza CURIEs vet:X → IRI completa)
    store.addQuad(subj, pred, namedNode(normalizeIri(resourceRef)));
  } else {
    // contenido de texto → Literal
    store.addQuad(subj, pred, literal(child.textContent ?? ''));
  }
}
```

`normalizeIri` solo resuelve CURIEs en valores de atributos (e.g. `rdf:resource="vet:Animal"`),
donde el parser XML no expande prefijos:

```typescript
function normalizeIri(iri: string): string {
  return iri.startsWith('vet:') ? VET_NS + iri.slice(4) : iri;
}
```

## Resultado

El `Store` de n3 carga ~2 436 triples con IRIs absolutas. Ejemplo para `Animal_01`:

| Subject | Predicate | Object |
|---------|-----------|--------|
| `vet:#Animal_01` | `rdf:type` | `owl:NamedIndividual` |
| `vet:#Animal_01` | `rdf:type` | `vet:#Animal` |
| `vet:#Animal_01` | `vet:#nombreAnimal` | `"Thor"` |
| `vet:#Animal_01` | `vet:#especie` | `"perro"` |
| `vet:#Animal_01` | `vet:#raza` | `"Pug"` |

## Singleton

La función es llamada una sola vez gracias al patrón singleton en `useOntology.ts`.
