// Builds SPARQL queries for DBpedia and returns raw result rows.
// No intermediate typed objects — callers read binding variables directly.
import { queryDBpedia } from '../services/dbpediaService';
import { resolveAnimalSlug, resolveEnfermedadSlug } from '../maps/dbpediaMaps';

function buildAnimalQuery(slug: string, lang: string): string {
  const uri = `http://dbpedia.org/resource/${slug}`;
  return `PREFIX dbo:  <http://dbpedia.org/ontology/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?abstract ?thumbnail ?page ?dbpediaUri WHERE {
  BIND(<${uri}> AS ?dbpediaUri)
  <${uri}> dbo:abstract ?abstract .
  OPTIONAL { <${uri}> dbo:thumbnail ?thumbnail }
  OPTIONAL { <${uri}> foaf:isPrimaryTopicOf ?page }
  FILTER (lang(?abstract) = '${lang}' || lang(?abstract) = 'en' || lang(?abstract) = 'es')
} ORDER BY (lang(?abstract) != '${lang}') LIMIT 3`;
}

function buildEnfermedadQuery(slug: string, lang: string): string {
  const uri = `http://dbpedia.org/resource/${slug}`;
  return `PREFIX dbo:  <http://dbpedia.org/ontology/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?abstract ?page ?dbpediaUri WHERE {
  BIND(<${uri}> AS ?dbpediaUri)
  <${uri}> dbo:abstract ?abstract .
  OPTIONAL { <${uri}> foaf:isPrimaryTopicOf ?page }
  FILTER (lang(?abstract) = '${lang}' || lang(?abstract) = 'en' || lang(?abstract) = 'es')
} ORDER BY (lang(?abstract) != '${lang}') LIMIT 3`;
}

export async function getAnimalInfo(
  especie: string,
  raza: string,
  lang = 'es',
): Promise<Record<string, string>[]> {
  const slug = resolveAnimalSlug(raza, especie);
  console.log(`[dbpediaRepository] getAnimalInfo(especie="${especie}", raza="${raza}", lang="${lang}") → slug="${slug ?? 'NO ENCONTRADO'}"`)
  if (!slug) return [];
  const query = buildAnimalQuery(slug, lang);
  console.log('[dbpediaRepository] Query DBpedia:\n' + query)
  return queryDBpedia(query);
}

export async function getEnfermedadInfo(
  nombreEnfermedad: string,
  lang = 'es',
): Promise<Record<string, string>[]> {
  const slug = resolveEnfermedadSlug(nombreEnfermedad);
  if (!slug) return [];
  return queryDBpedia(buildEnfermedadQuery(slug, lang));
}
