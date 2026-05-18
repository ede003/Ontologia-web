# AnimalesPage

**Archivo:** `src/pages/AnimalesPage.tsx`

## Responsabilidades

1. Cargar los animales de la ontología local via SPARQL (Comunica).
2. Filtrar por texto libre y por especie.
3. Mostrar un panel lateral (drawer) al hacer click en una fila, con datos
   locales + enriquecimiento DBpedia.

## Estado del componente

| Estado | Tipo | Descripción |
|--------|------|-------------|
| `animales` | `Individual[]` | Resultado del SPARQL local, se llena una vez |
| `queryLoading` | `boolean` | `true` mientras Comunica ejecuta el query |
| `search` | `string` | Texto del input de búsqueda |
| `especieFilter` | `string` | Valor del select de especie |
| `selected` | `Individual \| null` | Animal seleccionado (abre el drawer) |

## Carga de datos

```typescript
useEffect(() => {
  if (!store) return;
  setQueryLoading(true);
  getAnimales(store)
    .then(result => { setAnimales(result); setQueryLoading(false); })
    .catch(() => setQueryLoading(false));
}, [store]);
```

`store` llega de `useOntology()` y solo está disponible tras el parseo del RDF/XML.
El efecto se dispara una sola vez cuando `store` pasa de `null` a un valor real.

## Filtrado (memoizado)

```typescript
const filtered = useMemo(() => {
  return animales.filter(a => {
    const matchesSearch = !q || [a.props.nombreAnimal, a.props.especie, a.props.raza]
      .some(v => v?.toLowerCase().includes(q));
    const matchesEspecie = !especieFilter || a.props.especie === especieFilter;
    return matchesSearch && matchesEspecie;
  });
}, [animales, search, especieFilter]);
```

Ambos filtros son acumulativos (AND). `useMemo` evita re-filtrar en cada render.

## Drawer lateral (`AnimalDrawer`)

Componente interno que se monta cuando `selected !== null`.

```
┌────────────────────────────────────┐
│ Nombre del animal              [×] │
├────────────────────────────────────│
│ DATOS DE LA ONTOLOGÍA              │
│ Nombre:  Thor                      │
│ Especie: Canino                    │
│ Raza:    Pug                       │
│ Sexo:    Macho  Edad: 3 años       │
│ Peso:    8.5 kg Color: Arena       │
├────────────────────────────────────│
│ INFORMACIÓN ADICIONAL [DBpedia]    │
│ [thumbnail]                        │
│ El pug es una raza canina...       │
│ Ver en Wikipedia →                 │
└────────────────────────────────────┘
```

- Los datos locales siempre se muestran.
- La sección DBpedia solo aparece si `enriched.abstract` existe.
- Si DBpedia no responde, se muestra "Sin información adicional en DBpedia."
  en itálica — **nunca un error visible al usuario**.
- El badge `[DBpedia]` en amarillo indica la fuente de los datos enriquecidos.

## Layout

```
┌─────────────────────────────┬──────────────┐
│         Tabla               │    Drawer    │
│    (flex: 1, minWidth: 0)   │  (320px)     │
└─────────────────────────────┴──────────────┘
```

Cuando no hay animal seleccionado la tabla ocupa el 100% del ancho.
El drawer usa `position: sticky; top: 1rem` para mantenerse visible al hacer scroll.
