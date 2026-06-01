# Informe: Implementación de multilingualidad en el proyecto

Fecha: 2026-06-01

Este documento describe con detalle cómo se implementa la multilingualidad en el proyecto "Ontología Veterinaria": arquitectura, flujo de datos, ejemplos concretos de código, limitaciones y recomendaciones.

## 1. Arquitectura general

- La aplicación mantiene un `lang` (idioma) en el nivel de UI y lo propaga a componentes y hooks.
- Las traducciones estánt centralizadas en `src/i18n/translations.ts`.
- El enriquecimiento de información externa (DBpedia) intenta respetar el idioma solicitado y usa un mecanismo de fallback y caché en sesión.
- Componentes y módulos clave:
  - `src/components/LanguageSelector.tsx` — selector UI de idioma.
  - `src/i18n/translations.ts` — textos localizados, diccionario de búsqueda y hook `useTranslations`.
  - `src/hooks/useDbpediaEnrich.ts` — hook que enriquece la ficha de un animal consultando DBpedia y aplicando caché y fallback de idioma.
  - `src/repositories/dbpediaRepository.ts` — construye las consultas SPARQL para recursos DBpedia.
  - `src/services/dbpediaService.ts` — ejecuta la petición HTTP al endpoint SPARQL y parsea resultados.
  - `src/maps/dbpediaMaps.ts` — mapea `raza`, `especie` y `enfermedad` → slug DBpedia (ej. `Golden_Retriever`).

## 2. Organización de las traducciones

- `Language` (tipo): `'es' | 'en' | 'pt'`.
- `translations` exporta un objeto con las tres localizaciones: `es`, `en`, `pt`.
- `useTranslations(lang)` devuelve un objeto `t` con todas las cadenas localizadas (placeholders, labels, mensajes, unidades, etc.).

Ejemplo de uso en un componente:

```ts
import { useTranslations } from '../i18n/translations';

function MyComponent({ lang }){
  const t = useTranslations(lang);
  return <h1>{t.pageTitle}</h1>;
}
```

Archivo central: `src/i18n/translations.ts`.

## 3. Selector de idioma (UI)

- `LanguageSelector` muestra las opciones (`es`, `en`, `pt`) y llama a `setLang` para actualizar el idioma.
- Se integra en `AnimalesPage` para que el `lang` seleccionado llegue a toda la página.

## 4. Flujo de internacionalización al renderizar

1. El estado `lang` vive en un componente superior (p. ej. `App` / `AnimalesPage`).
2. `useTranslations(lang)` entrega los textos localizados a los componentes.
3. Componentes renderizan usando `t.<clave>` (p. ej. `t.searchPlaceholder`).
4. Para el contenido externo (DBpedia), `useDbpediaEnrich(animal, lang)` solicita datos en `lang` y muestra resultados en el `Drawer` del animal.

## 5. Multilingualidad en DBpedia: cómo se implementa

- Endpoint actual: `https://es.dbpedia.org/sparql` (fijo) en `src/services/dbpediaService.ts`.
- Construcción de la consulta: `src/repositories/dbpediaRepository.ts` crea una consulta que solicita `?abstract`, `?thumbnail`, `?page`, `?dbpediaUri` para la URI del recurso DBpedia.
- Filtro de idioma en la consulta SPARQL:

```sparql
FILTER (lang(?abstract) = 'pt' || lang(?abstract) = 'en' || lang(?abstract) = 'es')
```

- Orden y prioridad: la consulta usa `ORDER BY (lang(?abstract) != '${lang}')` para priorizar abstracts en el idioma pedido y limitar resultados (`LIMIT 3`).
- Resolución de slug: `resolveAnimalSlug(raza, especie)` y `resolveEnfermedadSlug(nombre)` en `src/maps/dbpediaMaps.ts`. Si no hay slug conocido, no se realiza consulta.

### Ejemplo de consulta generada (Golden_Retriever, `pt`):

```sparql
PREFIX dbo:  <http://dbpedia.org/ontology/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?abstract ?thumbnail ?page ?dbpediaUri WHERE {
  BIND(<http://dbpedia.org/resource/Golden_Retriever> AS ?dbpediaUri)
  <http://dbpedia.org/resource/Golden_Retriever> dbo:abstract ?abstract .
  OPTIONAL { <http://dbpedia.org/resource/Golden_Retriever> dbo:thumbnail ?thumbnail }
  OPTIONAL { <http://dbpedia.org/resource/Golden_Retriever> foaf:isPrimaryTopicOf ?page }
  FILTER (lang(?abstract) = 'pt' || lang(?abstract) = 'en' || lang(?abstract) = 'es')
} ORDER BY (lang(?abstract) != 'pt') LIMIT 3
```

La respuesta viene en JSON SPARQL (`results.bindings`) y se convierte a un array de filas sencillas en `queryDBpedia`.

## 6. Caché y fallback de idioma

- `useDbpediaEnrich` mantiene una caché en memoria por sesión (`_cache`) con clave `especie|raza|lang`.
- Si no hay resultados en el `lang` solicitado y `lang !== 'es'`, el hook reintenta con `es` (fallback) y guarda los resultados en caché para la clave original.

## 7. Limitaciones actuales y recomendaciones

1. **Endpoint fijo**: ahora se usa `es.dbpedia.org`. Recomendación: usar endpoint dinámico según idioma (`https://${lang}.dbpedia.org/sparql`) para mejorar cobertura en idiomas distintos del español.

2. **Mapas limitados**: `src/maps/dbpediaMaps.ts` cubre razas y enfermedades comunes. Recomendar:
   - Ampliar el mapa con más sinónimos y variantes.
   - Mantener el mapa en un archivo JSON/CSV para facilitar actualizaciones por no desarrolladores.

3. **Estrategia de fallback**: actualmente `lang -> es`. Alternativas:
   - `lang -> en -> es` (si se prefiere inglés sobre español),
   - `lang -> es -> en` (si la ontología está en español y se quiere priorizar datos consistentes).

4. **Caché persistente**: considerar `localStorage` o un backend cache con TTL para reducir latencia y número de peticiones.

5. **Observabilidad**: instrumentar métricas: tasa de aciertos por idioma, latencias, uso de fallback, hit rate de caché.

6. **Errores y límites**: `queryDBpedia` usa timeout (8000 ms). Documentar comportamiento ante timeouts y límites de rate.

## 8. Fragmentos útiles para incluir en el informe

- Ejemplo de uso de `useTranslations` y `LanguageSelector` (citas de `src/components` y `src/i18n`).
- SPARQL de ejemplo (ver sección 5).
- Extracto del `dbpediaMaps.ts` mostrando cómo se resuelven slugs.

## 9. Métricas e impacto

- Métricas sugeridas:
  - Porcentaje de animales/enfermedades con información DBpedia en idioma solicitado.
  - Latencia media de consulta DBpedia.
  - Hit rate de caché por sesión.
  - Número de fallbacks usados (cuántas búsquedas pidieron `lang` y terminaron mostrando `es`).

## 10. Conclusiones y próximos pasos sugeridos

- Cambiar endpoint a dinámico según `lang` para mejorar resultados locales.
- Ampliar y externalizar `dbpediaMaps`.
- Añadir caché persistente con TTL.
- Instrumentar métricas para evaluar cobertura por idioma.

---

Archivo generado automáticamente por asistente el 2026-06-01.
