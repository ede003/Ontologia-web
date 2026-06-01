// Builds SPARQL queries for DBpedia and returns raw result rows.
// No intermediate typed objects — callers read binding variables directly.
import { queryDBpedia } from '../services/dbpediaService';
import { resolveAnimalSlug, resolveEnfermedadSlug } from '../maps/dbpediaMaps';

function buildAnimalQuery(slug: string): string {
  const uri = `http://dbpedia.org/resource/${slug}`;
  return `PREFIX dbo:  <http://dbpedia.org/ontology/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?abstract ?thumbnail ?page ?dbpediaUri WHERE {
  BIND(<${uri}> AS ?dbpediaUri)
  <${uri}> dbo:abstract ?abstract .
  OPTIONAL { <${uri}> dbo:thumbnail ?thumbnail }
  OPTIONAL { <${uri}> foaf:isPrimaryTopicOf ?page }
  FILTER (lang(?abstract) = 'es' || lang(?abstract) = 'en')
} ORDER BY (lang(?abstract) != 'es') LIMIT 2`;
}

function buildEnfermedadQuery(slug: string): string {
  const uri = `http://dbpedia.org/resource/${slug}`;
  return `PREFIX dbo:  <http://dbpedia.org/ontology/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?abstract ?page ?dbpediaUri WHERE {
  BIND(<${uri}> AS ?dbpediaUri)
  <${uri}> dbo:abstract ?abstract .
  OPTIONAL { <${uri}> foaf:isPrimaryTopicOf ?page }
  FILTER (lang(?abstract) = 'es' || lang(?abstract) = 'en')
} ORDER BY (lang(?abstract) != 'es') LIMIT 2`;
}

export async function getAnimalInfo(
  especie: string,
  raza: string,
): Promise<Record<string, string>[]> {
  const slug = resolveAnimalSlug(raza, especie);
  console.log(`[dbpediaRepository] getAnimalInfo(especie="${especie}", raza="${raza}") → slug="${slug ?? 'NO ENCONTRADO'}"`)
  if (!slug) return [];
  const query = buildAnimalQuery(slug);
  console.log('[dbpediaRepository] Query DBpedia:\n' + query)
  return queryDBpedia(query);
}

export async function getEnfermedadInfo(
  nombreEnfermedad: string,
): Promise<Record<string, string>[]> {
  const slug = resolveEnfermedadSlug(nombreEnfermedad);
  if (!slug) return [];
  return queryDBpedia(buildEnfermedadQuery(slug));
}
