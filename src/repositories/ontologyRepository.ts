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

export function getAnimales(store: Store): Promise<Individual[]> {
  return getIndividualsByClass(store, 'Animal');
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
