import { Store, DataFactory } from 'n3';
import type { Language } from '../i18n/translations';

const { namedNode, literal } = DataFactory;

const VET_NS  = 'http://www.semanticweb.org/grupo14/ontologias/veterinaria#';
const RDF_NS  = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const OWL_NS  = 'http://www.w3.org/2002/07/owl#';
const XML_NS  = 'http://www.w3.org/XML/1998/namespace';

// Única fuente de datos: una sola ontología multilingüe. Los rdfs:label traen
// variantes xml:lang="es|en|pt" y se preservan como literales con etiqueta de
// idioma, de modo que las consultas SPARQL puedan filtrar con
// FILTER(lang(?label) = "<idioma>"). El idioma activo se aplica en las queries,
// no al cargar el archivo.
const ONTOLOGY_PATH = '/ontologia/ontologia_veterinaria_multilingue.rdf';

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
const OWL_CLASS             = OWL_NS + 'Class';
const OWL_DATATYPE_PROPERTY = OWL_NS + 'DatatypeProperty';
const OWL_OBJECT_PROPERTY   = OWL_NS + 'ObjectProperty';

const SCHEMA_TYPES = new Set([OWL_CLASS, OWL_DATATYPE_PROPERTY, OWL_OBJECT_PROPERTY]);

function hasTypeResource(desc: Element, typeIri: string): boolean {
  return Array.from(desc.children).some(
    child => child.getAttributeNS(RDF_NS, 'resource') === typeIri
  );
}

function loadDescription(desc: Element, store: Store): void {
  const aboutAttr = desc.getAttributeNS(RDF_NS, 'about');
  if (!aboutAttr) return;
  const subj = namedNode(normalizeIri(aboutAttr));

  for (const child of Array.from(desc.children)) {
    const predNs = child.namespaceURI;
    const predLocal = child.localName;
    if (!predNs || !predLocal) continue;

    const pred = namedNode(predNs + predLocal);
    const resourceRef = child.getAttributeNS(RDF_NS, 'resource');

    if (resourceRef !== null) {
      store.addQuad(subj, pred, namedNode(normalizeIri(resourceRef)));
    } else {
      const xmlLang = child.getAttributeNS(XML_NS, 'lang');
      const text = child.textContent ?? '';
      store.addQuad(subj, pred, xmlLang ? literal(text, xmlLang) : literal(text));
    }
  }
}

// Parses the RDF/XML file with the browser's native DOMParser and populates an
// n3 Store. Loads both NamedIndividual instances and class/property schema
// declarations (for their multilingual rdfs:label triples).
export async function loadOntology(lang: Language): Promise<Store> {
  console.log(`[ontologyService] Cargando ontología multilingüe (idioma activo: ${lang})`);
  const res = await fetch(ONTOLOGY_PATH);
  if (!res.ok) throw new Error(`No se pudo cargar la ontología: ${res.status}`);
  const text = await res.text();

  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const parseErr = doc.querySelector('parsererror');
  if (parseErr) throw new Error(`XML parse error: ${parseErr.textContent ?? ''}`);

  const store = new Store();

  const descriptions = Array.from(doc.getElementsByTagNameNS(RDF_NS, 'Description'));

  let individualCount = 0;
  let schemaCount = 0;

  for (const desc of descriptions) {
    if (hasTypeResource(desc, OWL_NAMED_INDIVIDUAL)) {
      loadDescription(desc, store);
      individualCount++;
    } else if (Array.from(desc.children).some(c => SCHEMA_TYPES.has(c.getAttributeNS(RDF_NS, 'resource') ?? ''))) {
      loadDescription(desc, store);
      schemaCount++;
    }
  }

  console.log(`[ontologyService] Store cargado con ${store.size} triples (${individualCount} individuos, ${schemaCount} declaraciones de clase/propiedad)`);
  return store;
}
