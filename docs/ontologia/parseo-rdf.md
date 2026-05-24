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

## Proceso paso a paso

### 1. Fetch del archivo
```typescript
const res = await fetch('/ontologia/Ontologia_Veterinaria_DEPURADA.owl');
const text = await res.text();
```

El archivo está en `public/ontologia/` y Vite lo sirve estáticamente.

### 2. Parseo XML con DOMParser
```typescript
const doc = new DOMParser().parseFromString(text, 'application/xml');
```

`DOMParser` es una API estándar disponible en todos los browsers modernos.
No requiere dependencias externas.

### 3. Extracción de individuos

Se iteran únicamente los elementos `owl:NamedIndividual` (datos de instancia).
Las definiciones de clases y propiedades no son necesarias para las consultas.

```typescript
const individuals = doc.getElementsByTagNameNS(
  'http://www.w3.org/2002/07/owl#',
  'NamedIndividual'
);
```

### 4. Normalización de namespace `vet:`

El archivo ontológico tiene una declaración inusual:
```xml
xmlns:vet1="vet:"
```

Esto hace que `DOMParser` expanda los elementos `<vet1:color>` a namespace
`"vet:"` (un URI relativo, no absoluto). La función `normNs` resuelve esto:

```typescript
function normNs(ns: string): string {
  return ns === 'vet:' ? VET_NS : ns;
  // VET_NS = 'http://www.semanticweb.org/grupo14/ontologias/veterinaria#'
}
```

También los valores de atributos `rdf:resource="vet:Animal"` deben normalizarse
porque el parser XML no expande CURIEs en valores de atributos:

```typescript
function normalizeIri(iri: string): string {
  return iri.startsWith('vet:') ? VET_NS + iri.slice(4) : iri;
}
```

### 5. Construcción de triples

Por cada hijo del `NamedIndividual`:

```typescript
for (const child of Array.from(ind.children)) {
  const pred = namedNode(normNs(child.namespaceURI) + child.localName);
  const resourceRef = child.getAttributeNS(RDF_NS, 'resource');

  if (resourceRef !== null) {
    // Propiedad de objeto → NamedNode
    store.addQuad(subj, pred, namedNode(normalizeIri(resourceRef)));
  } else {
    // Propiedad de dato → Literal
    store.addQuad(subj, pred, literal(child.textContent ?? ''));
  }
}
```

## Resultado

El `Store` de n3 contiene todos los triples de instancia normalizados con IRIs
absolutas. Ejemplo para `Animal_01`:

| Subject | Predicate | Object |
|---------|-----------|--------|
| `vet:#Animal_01` | `rdf:type` | `vet:#Animal` |
| `vet:#Animal_01` | `vet:#nombreAnimal` | `"Thor"` |
| `vet:#Animal_01` | `vet:#especie` | `"Canino"` |
| `vet:#Animal_01` | `vet:#raza` | `"Pug"` |
| `vet:#Animal_01` | `vet:#edad` | `"3"` |

## Singleton

La función es llamada una sola vez gracias al patrón singleton en `useOntology.ts`.
Ver [hook-enrich.md](../ui/hook-enrich.md) para la lógica de caché.
