import { QueryEngine } from '@comunica/query-sparql-rdfjs';
import type { Store } from 'n3';
import type { Individual } from '../services/ontologyService';
import type { Language } from '../i18n/translations';

const VET_NS = 'http://www.semanticweb.org/grupo14/ontologias/veterinaria#';
const RDF_NS = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const OWL_NS = 'http://www.w3.org/2002/07/owl#';

const PREFIXES = `PREFIX rdf:  <${RDF_NS}>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX owl:  <${OWL_NS}>
PREFIX vet:  <${VET_NS}>
`;

// Single shared engine instance (stateless, thread-safe)
const engine = new QueryEngine();

function localName(iri: string): string {
  const h = iri.lastIndexOf('#');
  if (h !== -1) return iri.slice(h + 1);
  const s = iri.lastIndexOf('/');
  if (s !== -1) return iri.slice(s + 1);
  const c = iri.lastIndexOf(':');
  if (c !== -1) return iri.slice(c + 1);
  return iri;
}

// La ontología es multilingüe: cada individuo trae un rdfs:label por idioma.
// Al hacer un patrón comodín (?predicate ?object) traemos todas las variantes,
// así que conservamos solo la del idioma activo y descartamos las demás (y el
// label técnico sin etiqueta = nombre de la URI). El resto de propiedades pasan
// intactas porque su predicado no es rdfs:label.
function labelLangFilter(lang: Language, objVar = 'object'): string {
  return `FILTER(!isLiteral(?${objVar}) || lang(?${objVar}) = "" || lang(?${objVar}) = "${lang}")`
}

export async function getIndividualsByClass(
  store: Store,
  className: string,
  lang: Language,
): Promise<Individual[]> {
  const classUri = className.startsWith('http') ? className : VET_NS + className;

  const sparql = `${PREFIXES}
SELECT ?subject ?predicate ?object WHERE {
  ?subject rdf:type <${classUri}> .
  ?subject ?predicate ?object .
  ${labelLangFilter(lang)}
}`;

  const stream = await engine.queryBindings(sparql, { sources: [store] });
  const rows = await stream.toArray();

  const bySubject = new Map<string, Record<string, string>>();
  for (const row of rows) {
    const s = row.get('subject')?.value;
    const p = row.get('predicate')?.value;
    const o = row.get('object')?.value;
    if (!s || !p || !o) continue;
    if (!bySubject.has(s)) bySubject.set(s, {});
    bySubject.get(s)![localName(p)] = o;
  }

  return Array.from(bySubject.entries()).map(([uri, props]) => ({ uri, props }));
}

export async function getAnimales(store: Store, lang: Language): Promise<Individual[]> {
  // Use direct n3 Store index lookups instead of Comunica SPARQL to avoid the
  // Cartesian explosion that multilingual triples (3 lang tags per property)
  // cause in wildcard ?predicate ?object patterns.
  const bySubject = new Map<string, {
    props: Record<string, string>
    enfermedades: Set<string>
    dueno: Set<string>
    veterinario: Set<string>
  }>()

  // 1. Collect all Animal URIs
  for (const q of store.getQuads(null, `${RDF_NS}type`, `${VET_NS}Animal`, null)) {
    bySubject.set(q.subject.value, { props: {}, enfermedades: new Set(), dueno: new Set(), veterinario: new Set() })
  }

  for (const [animalUri, agg] of bySubject) {
    // 2. Direct properties — skip lang-tagged literals that don't match active lang
    for (const q of store.getQuads(animalUri, null, null, null)) {
      const obj = q.object
      if (obj.termType === 'Literal' && obj.language !== '' && obj.language !== lang) continue
      agg.props[localName(q.predicate.value)] = obj.value
    }

    // 3. Enfermedades: ?enfermedad vet:afectaA ?animal
    for (const eq of store.getQuads(null, `${VET_NS}afectaA`, animalUri, null)) {
      for (const nq of store.getQuads(eq.subject.value, `${VET_NS}nombreEnfermedad`, null, null)) {
        const lit = nq.object
        if (lit.termType === 'Literal' && (lit.language === '' || lit.language === lang)) {
          agg.enfermedades.add(lit.value)
        }
      }
    }

    // 4. Dueño: ?animal vet:tieneDueno ?dueno → ?dueno vet:nombre ?nombre
    for (const dq of store.getQuads(animalUri, `${VET_NS}tieneDueno`, null, null)) {
      for (const nq of store.getQuads(dq.object.value, `${VET_NS}nombre`, null, null)) {
        const lit = nq.object
        if (lit.termType === 'Literal' && (lit.language === '' || lit.language === lang)) {
          agg.dueno.add(lit.value)
        }
      }
    }

    // 5. Veterinario: ?animal vet:esAtendidoPor ?vet → ?vet vet:nombre ?nombre
    for (const vq of store.getQuads(animalUri, `${VET_NS}esAtendidoPor`, null, null)) {
      for (const nq of store.getQuads(vq.object.value, `${VET_NS}nombre`, null, null)) {
        const lit = nq.object
        if (lit.termType === 'Literal' && (lit.language === '' || lit.language === lang)) {
          agg.veterinario.add(lit.value)
        }
      }
    }
  }

  const animales = Array.from(bySubject.entries()).map(([uri, agg]) => {
    const props = agg.props
    if (agg.enfermedades.size) props.enfermedades = [...agg.enfermedades].join(', ')
    if (agg.dueno.size) props.dueno = [...agg.dueno].join(', ')
    if (agg.veterinario.size) props.veterinario = [...agg.veterinario].join(', ')
    return { uri, props }
  })

  console.log(`[ontologyRepository] getAnimales → ${animales.length} animales cargados`)
  if (animales.length > 0) {
    const sample = animales[0]
    console.log(`[ontologyRepository] Ejemplo URI: ${sample.uri}`)
    console.log(`[ontologyRepository] Ejemplo props:`, sample.props)
  }
  return animales
}

export function getVeterinarios(store: Store, lang: Language): Promise<Individual[]> {
  return getIndividualsByClass(store, 'Veterinario', lang);
}

export function getEnfermedades(store: Store, lang: Language): Promise<Individual[]> {
  return getIndividualsByClass(store, 'Enfermedad', lang);
}

export function getMedicamentos(store: Store, lang: Language): Promise<Individual[]> {
  return getIndividualsByClass(store, 'Medicamento', lang);
}

export function getConsultas(store: Store, lang: Language): Promise<Individual[]> {
  return getIndividualsByClass(store, 'Consulta', lang);
}