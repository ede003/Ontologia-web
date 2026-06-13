import { QueryEngine } from '@comunica/query-sparql-rdfjs';
import type { Store } from 'n3';
import type { Individual } from '../services/ontologyService';

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

export async function getIndividualsByClass(
  store: Store,
  className: string,
): Promise<Individual[]> {
  const classUri = className.startsWith('http') ? className : VET_NS + className;

  const sparql = `${PREFIXES}
SELECT ?subject ?predicate ?object WHERE {
  ?subject rdf:type <${classUri}> .
  ?subject ?predicate ?object .
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

export async function getAnimales(store: Store): Promise<Individual[]> {
  const sparql = `${PREFIXES}
SELECT ?animal ?predicate ?object ?nombreEnfermedad ?nombreDueno ?nombreVeterinario WHERE {
  ?animal rdf:type vet:Animal .
  ?animal ?predicate ?object .

  OPTIONAL {
    ?enfermedad vet:afectaA ?animal .
    ?enfermedad vet:nombreEnfermedad ?nombreEnfermedad .
  }
    OPTIONAL {
  ?animal vet:tieneDueno ?dueno .
  ?dueno vet:nombre ?nombreDueno .
}

OPTIONAL {
  ?animal vet:esAtendidoPor ?veterinario .
  ?veterinario vet:nombre ?nombreVeterinario .
}
}`;

  const stream = await engine.queryBindings(sparql, { sources: [store] });
  const rows = await stream.toArray();

  // Los múltiples OPTIONAL generan un producto cartesiano (cada propiedad del
  // animal × cada enfermedad/dueño/vet), por lo que un mismo nombre aparece en
  // muchas filas. Deduplicamos con Set por animal antes de concatenar.
  interface Agg {
    props: Record<string, string>;
    enfermedades: Set<string>;
    dueno: Set<string>;
    veterinario: Set<string>;
  }
  const bySubject = new Map<string, Agg>();

  for (const row of rows) {
    const animal = row.get('animal')?.value;
    const predicate = row.get('predicate')?.value;
    const object = row.get('object')?.value;
    const nombreEnfermedad = row.get('nombreEnfermedad')?.value;
    const nombreDueno = row.get('nombreDueno')?.value;
    const nombreVeterinario = row.get('nombreVeterinario')?.value;

    if (!animal) continue;
    if (!bySubject.has(animal)) {
      bySubject.set(animal, { props: {}, enfermedades: new Set(), dueno: new Set(), veterinario: new Set() });
    }
    const agg = bySubject.get(animal)!;

    if (predicate && object) {
      agg.props[localName(predicate)] = object;
    }
    if (nombreEnfermedad) agg.enfermedades.add(nombreEnfermedad);
    if (nombreDueno) agg.dueno.add(nombreDueno);
    if (nombreVeterinario) agg.veterinario.add(nombreVeterinario);
  }

  const animales = Array.from(bySubject.entries()).map(([uri, agg]) => {
    const props = agg.props;
    if (agg.enfermedades.size) props.enfermedades = [...agg.enfermedades].join(', ');
    if (agg.dueno.size) props.dueno = [...agg.dueno].join(', ');
    if (agg.veterinario.size) props.veterinario = [...agg.veterinario].join(', ');
    return { uri, props };
  });
  console.log(`[ontologyRepository] getAnimales → ${animales.length} animales cargados`);
  if (animales.length > 0) {
    const sample = animales[0];
    console.log(`[ontologyRepository] Ejemplo URI: ${sample.uri}`);
    console.log(`[ontologyRepository] Ejemplo props:`, sample.props);
  }
  return animales;
}

export function getVeterinarios(store: Store): Promise<Individual[]> {
  return getIndividualsByClass(store, 'Veterinario');
}

export function getEnfermedades(store: Store): Promise<Individual[]> {
  return getIndividualsByClass(store, 'Enfermedad');
}

export function getMedicamentos(store: Store): Promise<Individual[]> {
  return getIndividualsByClass(store, 'Medicamento');
}

export function getConsultas(store: Store): Promise<Individual[]> {
  return getIndividualsByClass(store, 'Consulta');
}