import { Store, DataFactory } from 'n3';

const { namedNode, literal } = DataFactory;

const VET_NS  = 'http://www.semanticweb.org/grupo14/ontologias/veterinaria#';
const RDF_NS  = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const OWL_NS  = 'http://www.w3.org/2002/07/owl#';
const ONTOLOGY_PATH = '/ontologia/ontologia-veterinaria-OF.rdf';

export interface Individual {
  uri: string;
  props: Record<string, string>;
}

// The new RDF file uses rdf:Description + rdf:type child (not owl:NamedIndividual as tag).
// Full IRIs are used throughout, so no vet: prefix normalization is needed.
function normalizeIri(iri: string): string {
  return iri.startsWith('vet:') ? VET_NS + iri.slice(4) : iri;
}

const OWL_NAMED_INDIVIDUAL = OWL_NS + 'NamedIndividual';

// Parses the RDF/XML file with the browser's native DOMParser and populates an
// n3 Store. Individuals are rdf:Description elements whose first rdf:type is owl:NamedIndividual.
export async function loadOntology(): Promise<Store> {
  const res = await fetch(ONTOLOGY_PATH);
  if (!res.ok) throw new Error(`No se pudo cargar la ontología: ${res.status}`);
  const text = await res.text();

  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const parseErr = doc.querySelector('parsererror');
  if (parseErr) throw new Error(`XML parse error: ${parseErr.textContent ?? ''}`);

  const store = new Store();

  // The file uses <rdf:Description rdf:about="..."><rdf:type rdf:resource="owl:NamedIndividual"/>...
  // instead of <owl:NamedIndividual rdf:about="...">
  const descriptions = doc.getElementsByTagNameNS(RDF_NS, 'Description');
  const individuals = Array.from(descriptions).filter(desc =>
    Array.from(desc.children).some(
      child => child.getAttributeNS(RDF_NS, 'resource') === OWL_NAMED_INDIVIDUAL
    )
  );
  console.log(`[ontologyService] rdf:Description totales: ${descriptions.length}, NamedIndividuals filtrados: ${individuals.length}`);

  for (const ind of individuals) {
    const aboutAttr = ind.getAttributeNS(RDF_NS, 'about');
    if (!aboutAttr) continue;
    const subj = namedNode(normalizeIri(aboutAttr));

    for (const child of Array.from(ind.children)) {
      const predNs = child.namespaceURI;
      const predLocal = child.localName;
      if (!predNs || !predLocal) continue;

      const pred = namedNode(predNs + predLocal);
      const resourceRef = child.getAttributeNS(RDF_NS, 'resource');

      if (resourceRef !== null) {
        store.addQuad(subj, pred, namedNode(normalizeIri(resourceRef)));
      } else {
        store.addQuad(subj, pred, literal(child.textContent ?? ''));
      }
    }
  }

  console.log(`[ontologyService] Store cargado con ${store.size} triples`);
  return store;
}
