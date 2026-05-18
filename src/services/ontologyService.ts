import { Store, DataFactory } from 'n3';

const { namedNode, literal } = DataFactory;

const VET_NS  = 'http://www.semanticweb.org/grupo14/ontologias/veterinaria#';
const RDF_NS  = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const OWL_NS  = 'http://www.w3.org/2002/07/owl#';
const ONTOLOGY_PATH = '/ontologia/Ontologia_veterinaria2.rdf';

export interface Individual {
  uri: string;
  props: Record<string, string>;
}

// The RDF file uses xmlns:vet1="vet:" — a non-absolute namespace URI.
// DOMParser expands vet1:foo to namespace "vet:" and stores rdf:resource="vet:X" verbatim.
function normalizeIri(iri: string): string {
  return iri.startsWith('vet:') ? VET_NS + iri.slice(4) : iri;
}

function normNs(ns: string): string {
  return ns === 'vet:' ? VET_NS : ns;
}

// Parses the RDF/XML file with the browser's native DOMParser and populates an
// n3 Store. Only owl:NamedIndividual triples (instance data) are extracted.
export async function loadOntology(): Promise<Store> {
  const res = await fetch(ONTOLOGY_PATH);
  if (!res.ok) throw new Error(`No se pudo cargar la ontología: ${res.status}`);
  const text = await res.text();

  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const parseErr = doc.querySelector('parsererror');
  if (parseErr) throw new Error(`XML parse error: ${parseErr.textContent ?? ''}`);

  const store = new Store();
  const individuals = doc.getElementsByTagNameNS(OWL_NS, 'NamedIndividual');

  for (const ind of Array.from(individuals)) {
    const aboutAttr = ind.getAttributeNS(RDF_NS, 'about');
    if (!aboutAttr) continue;
    const subj = namedNode(normalizeIri(aboutAttr));

    for (const child of Array.from(ind.children)) {
      const predNs = child.namespaceURI;
      const predLocal = child.localName;
      if (!predNs || !predLocal) continue;

      const pred = namedNode(normNs(predNs) + predLocal);
      const resourceRef = child.getAttributeNS(RDF_NS, 'resource');

      if (resourceRef !== null) {
        store.addQuad(subj, pred, namedNode(normalizeIri(resourceRef)));
      } else {
        store.addQuad(subj, pred, literal(child.textContent ?? ''));
      }
    }
  }

  return store;
}
