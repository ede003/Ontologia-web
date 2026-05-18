# Mapas de URI: raza / especie / enfermedad → DBpedia

**Archivo fuente:** `src/maps/dbpediaMaps.ts`

## Por qué mapas estáticos

Los valores en la ontología son nombres en español con ortografía específica del
grupo ("Dermaitis Alergica", "Bulldog Fránces"). DBpedia usa slugs en inglés con
guiones bajos ("French_Bulldog").

Una búsqueda dinámica por `rdfs:label` con `contains(lcase(?label), ...)` falló
en `dbpedia.org/sparql` por falta de índices de texto. La búsqueda por URI directa
requiere conocer el slug exacto de antemano.

Los slugs fueron **verificados manualmente** contra `es.dbpedia.org/sparql` con:
```bash
curl "https://es.dbpedia.org/sparql?query=SELECT ?a WHERE { <http://dbpedia.org/resource/SLUG> dbo:abstract ?a . FILTER(lang(?a)='es') } LIMIT 1&format=json"
```

## Mapa de razas (`RAZA_MAP`)

| Clave (lowercase) | Slug DBpedia | Verificado |
|-------------------|-------------|-----------|
| `pug` | `Pug` | ✓ |
| `poodle` | `Poodle` | ✓ |
| `beagle` | `Beagle` | ✓ |
| `boxer` | `Boxer_(dog)` | ✓ |
| `rottweiler` | `Rottweiler` | ✓ |
| `pastor alemán` | `German_Shepherd` | ✓ |
| `golden retriever` | `Golden_Retriever` | ✓ |
| `bulldog fránces` | `French_Bulldog` | ✓ |
| `bulldog francés` | `French_Bulldog` | ✓ |
| `persa` | `Persian_cat` | ✓ |
| `angora` | `Turkish_Angora` | ✓ |
| `bengala` | `Bengal_cat` | ✓ |
| `sphynx` | `Sphynx_cat` | ✓ |
| `loro` | `Parrot` | ✓ |
| `mestizo` | `null` | — sin artículo útil |
| `felino` | `null` | — demasiado genérico |
| `canino` | `null` | — demasiado genérico |

## Mapa de especies (`ESPECIE_MAP`)

Se usa como fallback cuando la raza es `null` o no está en el mapa.

| Clave | Slug DBpedia |
|-------|-------------|
| `felino` | `Cat` |
| `canino` | `Dog` |
| `gato` | `Cat` |
| `loro australiano` | `Budgerigar` |

## Mapa de enfermedades (`ENFERMEDAD_MAP`)

Las claves son los valores exactos del campo `nombreEnfermedad` en la ontología,
en minúsculas. El código intenta coincidencia exacta primero, luego subcadena.

| nombreEnfermedad (ontología) | Slug DBpedia | Verificado |
|-----------------------------|-------------|-----------|
| `otitis` | `Otitis` | ✓ |
| `otitis cronica` | `Otitis` | ✓ |
| `otitis externa` | `Otitis` | ✓ |
| `otomicosis` | `Otomycosis` | ✓ |
| `insuficiencia renal` | `Kidney_failure` | ✓ |
| `dermaitis alergica` | `Dermatitis` | ✓ |
| `dermatitis bacteriana` | `Dermatitis` | ✓ |
| `parvovirus` | `Parvovirus` | ✓ |
| `conjuntivitis` | `Conjunctivitis` | ✓ |
| `leucemia felina` | `Feline_leukemia_virus` | ✓ |
| `cistitis idiopática` | `Cystitis` | ✓ |
| `úlcera corneal` | `Corneal_ulcer` | ✓ |
| `gastroenteritis parasitaria` | `Gastroenteritis` | ✓ |
| `sarna sarcóptica` | `Scabies` | ✓ |
| `traqueobronquitis` | `Bronchitis` | ✓ |
| `diabetes mellitus` | `Diabetes` | ✓ |

## Lógica de resolución

```typescript
function resolveSlug(raza: string, especie: string): string | null {
  const razaKey = raza.toLowerCase().trim();
  if (razaKey in RAZA_MAP) return RAZA_MAP[razaKey] ?? null;
  //   ↑ null explícito = sabemos que no hay artículo útil, no hacer fetch

  const especieKey = especie.toLowerCase().trim();
  if (especieKey in ESPECIE_MAP) return ESPECIE_MAP[especieKey] ?? null;

  return null; // término desconocido = no hacer fetch
}
```

Para enfermedades se usa coincidencia por subcadena como fallback:
```typescript
const slug = ENFERMEDAD_MAP[key] ??
  Object.entries(ENFERMEDAD_MAP).find(([k]) => key.includes(k))?.[1] ??
  null;
```

Esto permite que "Dermaitis Alergica" encuentre la clave `'dermatitis'` aunque
no sea una coincidencia exacta.
