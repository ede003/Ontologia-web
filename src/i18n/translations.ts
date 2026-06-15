// ============================================================
//  src/i18n/translations.ts
//  Sistema de internacionalización — ES / EN / PT
// ============================================================

export type Language = 'es' | 'en' | 'pt';

export interface Translations {
  // ── Header ──────────────────────────────────────────────
  headerTitle: string;
  headerSub: string;

  // ── Página principal ────────────────────────────────────
  pageTitle: string;
  searchPlaceholder: string;
  allSpecies: string;

  // ── Estados de carga y error ────────────────────────────
  loadingOntology: string;
  loadingSchema: string;
  loadingSparql: string;
  errorPrefix: string;

  // ── Tabla de animales ────────────────────────────────────
  colName: string;
  colSpecies: string;
  colBreed: string;
  colSex: string;
  colAge: string;
  colDiseases: string;
  noResults: string;

  // ── Footer de tabla ──────────────────────────────────────
  footerAnimals: string;       // ej: "animales" / "animals" / "animais"
  footerOf: string;            // ej: "de" / "of" / "de"
  footerClickClose: string;
  footerClickDetail: string;

  // ── Drawer (panel lateral del animal) ───────────────────
  drawerOntologyData: string;
  drawerAdditionalInfo: string;
  drawerConsultingDbpedia: string;
  drawerNoDbpedia: string;
  drawerWikipediaLink: string;
  drawerDbpediaLink: string;

  drawerFieldName: string;
  drawerFieldSpecies: string;
  drawerFieldBreed: string;
  drawerFieldSex: string;
  drawerFieldAge: string;
  drawerFieldAgeUnit: string;   // "años" / "years" / "anos"
  drawerFieldWeight: string;
  drawerFieldWeightUnit: string; // "kg"
  drawerFieldColor: string;
  drawerFieldDisease: string;
  drawerFieldOwner: string;
  drawerFieldVeterinarian: string;
  drawerClose: string;          // aria-label del botón ×
  drawerNetworkError: string;   // DBpedia inalcanzable (sin red)

  tableOwner: string;
  tableVeterinarian: string;

  // ── ResultRenderer ───────────────────────────────────────
  colRelation: string;
  colType: string;              // cabecera "Tipo" en content search
  colField: string;             // cabecera "Campo"
  colFoundValue: string;        // cabecera "Valor encontrado"
  drawerAnimalFallback: string; // fallback cuando nombreAnimal es undefined
  resultCount: string;          // ej: "resultado" / "result" / "resultado"
  resultCountPlural: string;    // ej: "resultados" / "results" / "resultados"
  noResultsSearch: string;

  // ── Selector de idioma ───────────────────────────────────
  languageLabel: string;

  // ── DBpedia: idioma de consulta ──────────────────────────
  dbpediaLang: string;          // "es" / "en" / "pt"

}

// ============================================================
//  ESPAÑOL
// ============================================================
const es: Translations = {
  headerTitle: 'Veterinaria',
  headerSub: 'Buscador Semántico',

  pageTitle: 'Buscador Semántico Veterinario',
  searchPlaceholder: 'Buscar por nombre, especie, enfermedad…',
  allSpecies: 'Todas las especies',

  loadingOntology: 'Cargando ontología…',
  loadingSchema: 'Analizando schema…',
  loadingSparql: 'Ejecutando consulta SPARQL…',
  errorPrefix: 'Error',

  colName: 'Nombre',
  colSpecies: 'Especie',
  colBreed: 'Raza',
  colSex: 'Sexo',
  colAge: 'Edad',
  colDiseases: 'Enfermedades',
  noResults: 'Sin resultados',

  footerAnimals: 'animales',
  footerOf: 'de',
  footerClickClose: 'Haz clic en la misma fila para cerrar el panel',
  footerClickDetail: 'Haz clic en una fila para ver detalles',

  drawerOntologyData: 'Datos de la ontología',
  drawerAdditionalInfo: 'Información adicional',
  drawerConsultingDbpedia: 'Consultando DBpedia…',
  drawerNoDbpedia: 'Sin información adicional en DBpedia.',
  drawerWikipediaLink: 'Ver en Wikipedia →',
  drawerDbpediaLink: 'Ver en DBpedia →',

  drawerFieldName: 'Nombre',
  drawerFieldSpecies: 'Especie',
  drawerFieldBreed: 'Raza',
  drawerFieldSex: 'Sexo',
  drawerFieldAge: 'Edad',
  drawerFieldAgeUnit: 'años',
  drawerFieldWeight: 'Peso',
  drawerFieldWeightUnit: 'kg',
  drawerFieldColor: 'Color',
  drawerFieldDisease: 'Enfermedad',
  drawerFieldOwner: 'Dueño',
  drawerFieldVeterinarian: 'Veterinario',
  drawerClose: 'Cerrar',
  drawerNetworkError: 'DBpedia no disponible (sin conexión).',

  tableOwner: 'Dueño',
  tableVeterinarian: 'Veterinario',

  colRelation: 'Relación',
  colType: 'Tipo',
  colField: 'Campo',
  colFoundValue: 'Valor encontrado',
  drawerAnimalFallback: 'Animal',
  resultCount: 'resultado',
  resultCountPlural: 'resultados',
  noResultsSearch: 'Sin resultados para esta búsqueda.',

  languageLabel: 'Idioma',
  dbpediaLang: 'es',

};

// ============================================================
//  INGLÉS
// ============================================================
const en: Translations = {
  headerTitle: 'Veterinary',
  headerSub: 'Semantic Search',

  pageTitle: 'Veterinary Semantic Search',
  searchPlaceholder: 'Search by name, species, disease…',
  allSpecies: 'All species',

  loadingOntology: 'Loading ontology…',
  loadingSchema: 'Analysing schema…',
  loadingSparql: 'Running SPARQL query…',
  errorPrefix: 'Error',

  colName: 'Name',
  colSpecies: 'Species',
  colBreed: 'Breed',
  colSex: 'Sex',
  colAge: 'Age',
  colDiseases: 'Diseases',
  noResults: 'No results',

  footerAnimals: 'animals',
  footerOf: 'of',
  footerClickClose: 'Click the same row to close the panel',
  footerClickDetail: 'Click a row to see details',

  drawerOntologyData: 'Ontology data',
  drawerAdditionalInfo: 'Additional information',
  drawerConsultingDbpedia: 'Querying DBpedia…',
  drawerNoDbpedia: 'No additional information in DBpedia.',
  drawerWikipediaLink: 'View on Wikipedia →',
  drawerDbpediaLink: 'View on DBpedia →',

  drawerFieldName: 'Name',
  drawerFieldSpecies: 'Species',
  drawerFieldBreed: 'Breed',
  drawerFieldSex: 'Sex',
  drawerFieldAge: 'Age',
  drawerFieldAgeUnit: 'years',
  drawerFieldWeight: 'Weight',
  drawerFieldWeightUnit: 'kg',
  drawerFieldColor: 'Color',
  drawerFieldDisease: 'Disease',
  drawerFieldOwner: 'Owner',
  drawerFieldVeterinarian: 'Veterinarian',
  drawerClose: 'Close',
  drawerNetworkError: 'DBpedia unavailable (no connection).',

  tableOwner: 'Owner',
  tableVeterinarian: 'Veterinarian',

  colRelation: 'Relation',
  colType: 'Type',
  colField: 'Field',
  colFoundValue: 'Found value',
  drawerAnimalFallback: 'Animal',
  resultCount: 'result',
  resultCountPlural: 'results',
  noResultsSearch: 'No results for this search.',

  languageLabel: 'Language',
  dbpediaLang: 'en',

};

// ============================================================
//  PORTUGUÉS
// ============================================================
const pt: Translations = {
  headerTitle: 'Veterinária',
  headerSub: 'Busca Semântica',

  pageTitle: 'Busca Semântica Veterinária',
  searchPlaceholder: 'Buscar por nome, espécie, doença…',
  allSpecies: 'Todas as espécies',

  loadingOntology: 'Carregando ontologia…',
  loadingSchema: 'Analisando schema…',
  loadingSparql: 'Executando consulta SPARQL…',
  errorPrefix: 'Erro',

  colName: 'Nome',
  colSpecies: 'Espécie',
  colBreed: 'Raça',
  colSex: 'Sexo',
  colAge: 'Idade',
  colDiseases: 'Doenças',
  noResults: 'Sem resultados',

  footerAnimals: 'animais',
  footerOf: 'de',
  footerClickClose: 'Clique na mesma linha para fechar o painel',
  footerClickDetail: 'Clique em uma linha para ver detalhes',

  drawerOntologyData: 'Dados da ontologia',
  drawerAdditionalInfo: 'Informação adicional',
  drawerConsultingDbpedia: 'Consultando DBpedia…',
  drawerNoDbpedia: 'Sem informação adicional no DBpedia.',
  drawerWikipediaLink: 'Ver na Wikipedia →',
  drawerDbpediaLink: 'Ver no DBpedia →',

  drawerFieldName: 'Nome',
  drawerFieldSpecies: 'Espécie',
  drawerFieldBreed: 'Raça',
  drawerFieldSex: 'Sexo',
  drawerFieldAge: 'Idade',
  drawerFieldAgeUnit: 'anos',
  drawerFieldWeight: 'Peso',
  drawerFieldWeightUnit: 'kg',
  drawerFieldColor: 'Cor',
  drawerFieldDisease: 'Doença',
  drawerFieldOwner: 'Dono',
  drawerFieldVeterinarian: 'Veterinário',
  drawerClose: 'Fechar',
  drawerNetworkError: 'DBpedia indisponível (sem conexão).',

  tableOwner: 'Dono',
  tableVeterinarian: 'Veterinário',

  colRelation: 'Relação',
  colType: 'Tipo',
  colField: 'Campo',
  colFoundValue: 'Valor encontrado',
  drawerAnimalFallback: 'Animal',
  resultCount: 'resultado',
  resultCountPlural: 'resultados',
  noResultsSearch: 'Sem resultados para esta busca.',

  languageLabel: 'Idioma',
  dbpediaLang: 'pt',

};

// ============================================================
//  MAPA PRINCIPAL — exporta el objeto con los 3 idiomas
// ============================================================
export const translations: Record<Language, Translations> = { es, en, pt };

// ============================================================
//  Hook utilitario — úsalo en cualquier componente así:
//    const t = useTranslations(lang);
//    <p>{t.pageTitle}</p>
// ============================================================
export function useTranslations(lang: Language): Translations {
  return translations[lang];
}
export const searchTermTranslations: Record<string, string> = {}