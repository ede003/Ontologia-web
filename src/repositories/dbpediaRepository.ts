import { queryDBpedia, type DbpediaAnimalInfo, type DbpediaEnfermedadInfo } from '../services/dbpediaService';
import { resolveAnimalSlug, resolveEnfermedadSlug } from '../maps/dbpediaMaps';

function buildAnimalQuery(slug: string): string {
  const uri = `http://dbpedia.org/resource/${slug}`;
  return `PREFIX dbo:  <http://dbpedia.org/ontology/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?abstract ?thumbnail ?page WHERE {
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

SELECT ?abstract ?page WHERE {
  <${uri}> dbo:abstract ?abstract .
  OPTIONAL { <${uri}> foaf:isPrimaryTopicOf ?page }
  FILTER (lang(?abstract) = 'es' || lang(?abstract) = 'en')
} ORDER BY (lang(?abstract) != 'es') LIMIT 2`;
}

export async function getAnimalInfo(
  especie: string,
  raza: string,
): Promise<DbpediaAnimalInfo> {
  const slug = resolveAnimalSlug(raza, especie);
  if (!slug) return {};

  const bindings = await queryDBpedia(buildAnimalQuery(slug));
  if (bindings.length === 0) return {};

  const row = bindings[0];
  return {
    abstract:  row.abstract?.value,
    thumbnail: row.thumbnail?.value,
    wikiPage:  row.page?.value,
  };
}

export async function getEnfermedadInfo(
  nombreEnfermedad: string,
): Promise<DbpediaEnfermedadInfo> {
  const slug = resolveEnfermedadSlug(nombreEnfermedad);
  if (!slug) return {};

  const bindings = await queryDBpedia(buildEnfermedadQuery(slug));
  if (bindings.length === 0) return {};

  const row = bindings[0];
  return {
    abstract: row.abstract?.value,
    wikiPage: row.page?.value,
  };
}
