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

  tableOwner: string;
  tableVeterinarian: string;

  // ── ResultRenderer ───────────────────────────────────────
  colRelation: string;
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

  tableOwner: 'Dueño',
  tableVeterinarian: 'Veterinario',

  colRelation: 'Relación',
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

  tableOwner: 'Owner',
  tableVeterinarian: 'Veterinarian',

  colRelation: 'Relation',
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

  tableOwner: 'Dono',
  tableVeterinarian: 'Veterinário',

  colRelation: 'Relação',
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

const domainValueTranslations: Record<Language, Record<string, string>> = {
  en: {
    macho: 'Male',
    hembra: 'Female',

    perro: 'Dog',
    perros: 'Dogs',
    gato: 'Cat',
    gatos: 'Cats',
    ave: 'Bird',
    aves: 'Birds',
    conejo: 'Rabbit',
    conejos: 'Rabbits',
    hamster: 'Hamster',
    pez: 'Fish',
    tortuga: 'Turtle',
    tortugas: 'Turtles',
    caballo: 'Horse',
    caballos: 'Horses',
    loro: 'Parrot',
    loros: 'Parrots',
    cobaya: 'Guinea pig',

    caniche: 'Poodle',
    poodle: 'Poodle',
    labrador: 'Labrador',
    chihuahua: 'Chihuahua',
    pomeranian: 'Pomeranian',
    siamés: 'Siamese',
    siamese: 'Siamese',
    persa: 'Persian',
  },
  pt: {
    macho: 'Macho',
    hembra: 'Fêmea',

    perro: 'Cão',
    perros: 'Cães',
    gato: 'Gato',
    gatos: 'Gatos',
    ave: 'Ave',
    aves: 'Aves',
    conejo: 'Coelho',
    conejos: 'Coelhos',
    hamster: 'Hamster',
    pez: 'Peixe',
    tortuga: 'Tartaruga',
    tortugas: 'Tartarugas',
    caballo: 'Cavalo',
    caballos: 'Cavalos',
    loro: 'Papagaio',
    loros: 'Papagaios',
    cobaya: 'Porquinho-da-índia',

    caniche: 'Poodle',
    poodle: 'Poodle',
    labrador: 'Labrador',
    chihuahua: 'Chihuahua',
    pomeranian: 'Pomeranian',
    siamés: 'Siamês',
    siamese: 'Siamês',
    persa: 'Persa',
  },
  es: {},
};

export function translateDomainValue(value: string, lang: Language): string {
  if (lang === 'es') return value;
  const map = domainValueTranslations[lang] ?? {};

  return value.split(/(\s+|[;,|]+)/).map(segment => {
    const key = segment.trim().toLowerCase();
    return key && map[key] ? map[key] : segment;
  }).join('');
}

// ============================================================
//  DICCIONARIO DE BÚSQUEDA MULTILINGÜE
//  Traduce términos EN/PT → ES para que la ontología
//  (que está en español) pueda buscar correctamente.
// ============================================================
export const searchTermTranslations: Record<string, string> = {
  // ── Inglés → Español ─────────────────────────────────────
  // Clases generales
  animal: 'animal', animals: 'animales',
  pet: 'mascota', pets: 'mascotas',
  disease: 'enfermedad', diseases: 'enfermedades', illness: 'enfermedad',
  medicine: 'medicamento', medicines: 'medicamentos',
  medication: 'medicamento', medications: 'medicamentos', drug: 'medicamento',
  vet: 'veterinario', veterinarian: 'veterinario', veterinary: 'veterinario',
  consultation: 'consulta', consultations: 'consultas', appointment: 'consulta',
  vaccine: 'vacuna', vaccines: 'vacunas', vaccination: 'vacunacion',
  treatment: 'tratamiento', treatments: 'tratamientos',
  exam: 'examen', examination: 'examen', 'medical exam': 'examen',
  surgery: 'cirugia', surgeries: 'cirugias', operation: 'cirugia',
  owner: 'dueño', owners: 'dueños',

  // Sexo
  male: 'macho', female: 'hembra',

  // Especies comunes
  dog: 'perro', dogs: 'perros',
  cat: 'gato', cats: 'gatos',
  bird: 'ave', birds: 'aves',
  rabbit: 'conejo', rabbits: 'conejos',
  hamster: 'hamster',
  fish: 'pez',
  turtle: 'tortuga', turtles: 'tortugas',
  horse: 'caballo', horses: 'caballos',
  parrot: 'loro', parrots: 'loros',
  guinea: 'cobaya',

  // Razas comunes
  'golden retriever': 'golden retriever',
  labrador: 'labrador',
  bulldog: 'bulldog',
  poodle: 'caniche',
  chihuahua: 'chihuahua',
  pomeranian: 'pomerania',
  siamese: 'siamés',
  persian: 'persa',

  // ── Portugués → Español ──────────────────────────────────
  // Clases generales
  doença: 'enfermedad', doenças: 'enfermedades',
  medicamento: 'medicamento', medicamentos: 'medicamentos',
  medicina: 'medicamento', medicinas: 'medicamentos',
  veterinário: 'veterinario', veterinária: 'veterinario',
  consulta: 'consulta', consultas: 'consultas',
  vacina: 'vacuna', vacinas: 'vacunas', vacinação: 'vacunacion',
  tratamento: 'tratamiento', tratamentos: 'tratamientos',
  exame: 'examen', exames: 'examenes',
  cirurgia: 'cirugia', cirurgias: 'cirugias',
  dono: 'dueño', donos: 'dueños', proprietário: 'dueño',
  mascote: 'mascota', mascotes: 'mascotas',

  // Sexo
  macho: 'macho', fêmea: 'hembra', femea: 'hembra',

  // Especies comunes
  cão: 'perro', cao: 'perro', cães: 'perros', caes: 'perros',
  gato: 'gato', gatos: 'gatos',
  pássaro: 'ave', passaro: 'ave', pássaros: 'aves',
  coelho: 'conejo', coelhos: 'conejos',
  peixe: 'pez', peixes: 'peces',
  tartaruga: 'tortuga', tartarugas: 'tortugas',
  cavalo: 'caballo', cavalos: 'caballos',
  papagaio: 'loro', papagaios: 'loros',
};