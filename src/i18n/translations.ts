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
 
    //Sexo 
    'Macho': 'Male',       'macho': 'Male',
    'Hembra': 'Female',    'hembra': 'Female',
 
    //Especies (exactas del RDF)
    'perro': 'Dog',        'perros': 'Dogs',
    'Canino': 'Canine',    'canino': 'Canine',
    'gato': 'Cat',         'gatos': 'Cats',
    'Felino': 'Feline',    'felino': 'Feline',
    'Conejo': 'Rabbit',    'conejo': 'Rabbit',    'conejos': 'Rabbits',
    'loro': 'Parrot',      'loros': 'Parrots',
    'hamster': 'Hamster',  'hámster': 'Hamster',
    'Pez': 'Fish',         'pez': 'Fish',
    'tortuga': 'Turtle',   'tortugas': 'Turtles',
    'oveja': 'Sheep',
    'gallina': 'Hen',
    'cerdo': 'Pig',
    'cobaya': 'Guinea pig',
    'caballo': 'Horse',    'caballos': 'Horses',
    'Canina': 'Canine',       'canina': 'Canine',
 
    //Razas
    'Labrador': 'Labrador',           'labrador': 'Labrador',
    'Beagle': 'Beagle',               'beagle': 'Beagle',
    'Cocker Spaniel': 'Cocker Spaniel',
    'Golden Retriever': 'Golden Retriever',
    'Pug': 'Pug',                     'pug': 'Pug',
    'Pitbull': 'Pitbull',             'pitbull': 'Pitbull',
    'Maine Coon': 'Maine Coon',
    'Persa': 'Persian',               'persa': 'Persian',
    'Siamés': 'Siamese',              'siamés': 'Siamese',    'siames': 'Siamese',
    'Mini Lop': 'Mini Lop',
    'Mini Pig': 'Mini Pig',
    'Suffolk': 'Suffolk',
    'Merino': 'Merino',
    'Corriedale': 'Corriedale',
    'Duroc': 'Duroc',
    'Landrace': 'Landrace',
    'Rhode Island': 'Rhode Island',
    'Ruso enano': 'Dwarf Russian',    'ruso enano': 'Dwarf Russian',
    'Campbell': 'Campbell',
    'Amazona': 'Amazon',              'amazona': 'Amazon',
    'Amazónico': 'Amazonian',         'amazónico': 'Amazonian',  'amazonico': 'Amazonian',
    'Periquito': 'Budgerigar',        'periquito': 'Budgerigar',
    'Betta': 'Betta',
    'Goldfish': 'Goldfish',
    'Mediterránea': 'Mediterranean',  'mediterránea': 'Mediterranean',  'mediterranea': 'Mediterranean',
    'Sirio': 'Syrian',                'sirio': 'Syrian',
    'Rex': 'Rex',
    'Miniatura': 'Miniature',         'miniatura': 'Miniature',
    'Caniche': 'Poodle',              'caniche': 'Poodle',
    'Poodle': 'Poodle',               'poodle': 'Poodle',
    'Chihuahua': 'Chihuahua',         'chihuahua': 'Chihuahua',
 
    //Colores
    'Negro': 'Black',                 'negro': 'Black',
    'Blanco': 'White',                'blanco': 'White',
    'Gris': 'Gray',                   'gris': 'Gray',
    'Marron': 'Brown',                'marron': 'Brown',
    'Marrón': 'Brown',                'marrón': 'Brown',
    'Dorado': 'Golden',               'dorado': 'Golden',
    'Naranja': 'Orange',              'naranja': 'Orange',
    'Crema': 'Cream',                 'crema': 'Cream',
    'Canela': 'Cinnamon',             'canela': 'Cinnamon',
    'Chocolate': 'Chocolate',         'chocolate': 'Chocolate',
    'Tricolor': 'Tricolor',           'tricolor': 'Tricolor',
    'Arena': 'Sand',                  'arena': 'Sand',
    'Rosado': 'Pink',                 'rosado': 'Pink',
    'Azul': 'Blue',                   'azul': 'Blue',
    'Gris atigrado': 'Gray tabby',    'gris atigrado': 'Gray tabby',
    'Gris perla': 'Pearl gray',       'gris perla': 'Pearl gray',
    'Gris y blanco': 'Gray and white','gris y blanco': 'Gray and white',
    'Blanco y Negro': 'Black and white',
    'Blanco y negro': 'Black and white',  'blanco y negro': 'Black and white',
    'Blanco y marrón': 'White and brown', 'blanco y marrón': 'White and brown',
    'Blanco manchas': 'White with spots', 'blanco manchas': 'White with spots',
    'Azul grisaceo': 'Grayish blue',  'azul grisaceo': 'Grayish blue',
    'Azul metalico': 'Metallic blue', 'azul metalico': 'Metallic blue',
    'Azul y rojo': 'Blue and red',    'azul y rojo': 'Blue and red',
    'Marrón rojizo': 'Reddish brown', 'marrón rojizo': 'Reddish brown', 'marron rojizo': 'Reddish brown',
    'Rosado manchas': 'Pink with spots', 'rosado manchas': 'Pink with spots',
    'Rosado oscuro': 'Dark pink',     'rosado oscuro': 'Dark pink',
    'Verde lima': 'Lime green',       'verde lima': 'Lime green',
    'Verde oscuro': 'Dark green',     'verde oscuro': 'Dark green',
    'Verde y rojo': 'Green and red',  'verde y rojo': 'Green and red',
 
    //Enfermedades
    'Moquillo Canino': 'Canine Distemper',
    'Otitis Media Canina': 'Canine Otitis Media',
    'Otitis Externa': 'Otitis Externa',
    'Traqueobronquitis Canina': 'Canine Tracheobronchitis',
    'Parvovirus Canino': 'Canine Parvovirus',
    'Leucemia Felina': 'Feline Leukemia',
    'Dermatofitosis': 'Dermatophytosis',
    'Sarna Sarcóptica': 'Sarcoptic Mange',  'sarna sarcóptica': 'Sarcoptic Mange',  'Sarna Sarcoptica': 'Sarcoptic Mange',
    'Aspergilosis Aviar': 'Avian Aspergillosis',
    'Psitacosis': 'Psittacosis',
    'Encefalitis Aviaria': 'Avian Encephalitis',
    'Influenza Aviar': 'Avian Influenza',
    'Rinitis Aviaria': 'Avian Rhinitis',
    'Mixomatosis': 'Myxomatosis',
    'Absceso Dental Conejo': 'Rabbit Dental Abscess',
    'Enteritis Mucosa': 'Mucous Enteritis',
    'Hidrops en Peces': 'Fish Dropsy',
    'Diabetes Hamster': 'Hamster Diabetes',
    'Coccidiosis Ovina': 'Ovine Coccidiosis',
    'Timpanismo Ovino': 'Ovine Bloat',
    'Neumonia Bacteriana': 'Bacterial Pneumonia',
    'Brucelosis Porcina': 'Porcine Brucellosis',
    'Erisipela Porcina': 'Porcine Erysipelas',
    'Parvovirus Porcino': 'Porcine Parvovirus',
    'Hipoglucemia Porcina': 'Porcine Hypoglycemia',
    'Traqueobronquitis': 'Tracheobronchitis', 'traqueobronquitis': 'Tracheobronchitis',
    'Encefalitis': 'Encephalitis', 'encefalitis': 'Encephalitis',
    'Aspergilosis': 'Aspergillosis', 'aspergilosis': 'Aspergillosis',
 
    //Palabras sueltas de enfermedades
    'moquillo': 'Distemper',
    'aviar': 'Avian',     'aviaria': 'Avian',
    'porcina': 'Porcine', 'porcino': 'Porcine',
    'ovina': 'Ovine',     'ovino': 'Ovine',
    'felina': 'Feline',   
    'sarcóptica': 'Sarcoptic', 'sarcoptica': 'Sarcoptic',
    'dermatofitosis': 'Dermatophytosis',
    'psitacosis': 'Psittacosis',
    'mixomatosis': 'Myxomatosis',
    'absceso': 'Abscess',
    'dental': 'Dental',
    'enteritis': 'Enteritis',
    'mucosa': 'Mucous',
    'hidrops': 'Dropsy',
    'diabetes': 'Diabetes',
    'coccidiosis': 'Coccidiosis',
    'timpanismo': 'Bloat',
    'neumonia': 'Pneumonia',  'neumonía': 'Pneumonia',
    'brucelosis': 'Brucellosis',
    'erisipela': 'Erysipelas',
    'parvovirus': 'Parvovirus',
    'hipoglucemia': 'Hypoglycemia',
    'leucemia': 'Leukemia',
    'influenza': 'Influenza',
    'rinitis': 'Rhinitis',
    'otitis': 'Otitis',
    'sarna': 'Mange',
    'bacteriana': 'Bacterial', 'bacteriano': 'Bacterial',
    'externa': 'Externa',
    'media': 'Media',
 
    //Nivel de gravedad 
    'Leve': 'Mild',       'leve': 'Mild',
    'Moderado': 'Moderate','moderado': 'Moderate',
    'Grave': 'Severe',    'grave': 'Severe',
 
    //Tipo de enfermedad
    'Bacteriana': 'Bacterial',
    'Viral': 'Viral',          'viral': 'Viral',
    'Fungica': 'Fungal',       'fungica': 'Fungal',
    'Metabolica': 'Metabolic', 'metabolica': 'Metabolic',
    'Parasitaria': 'Parasitic','parasitaria': 'Parasitic',
    'Digestiva': 'Digestive',  'digestiva': 'Digestive',
 
    //General
    'dueño': 'Owner',       'Dueño': 'Owner',   'dueno': 'Owner',
    'veterinario': 'Veterinarian',
    'enfermedad': 'Disease','enfermedades': 'Diseases',
    'consulta': 'Consultation',
    'vacuna': 'Vaccine',
    'tratamiento': 'Treatment',
    'examen': 'Exam',
    'cirugía': 'Surgery',  'cirugia': 'Surgery',
    'medicamento': 'Medicine',
    'mascota': 'Pet',      'mascotas': 'Pets',
    'infección': 'Infection', 'infeccion': 'Infection',
    'crónico': 'Chronic',  'cronico': 'Chronic',
    'agudo': 'Acute',
  },
 
  pt: {
 
    //Sexo 
    'Macho': 'Macho',      'macho': 'Macho',
    'Hembra': 'Fêmea',     'hembra': 'Fêmea',
 
    //EspecieS
    'perro': 'Cão',        'perros': 'Cães',
    'Canino': 'Canino',    'canino': 'Canino',
    'gato': 'Gato',        'gatos': 'Gatos',
    'Felino': 'Felino',    'felino': 'Felino',
    'Conejo': 'Coelho',    'conejo': 'Coelho',    'conejos': 'Coelhos',
    'loro': 'Papagaio',    'loros': 'Papagaios',
    'hamster': 'Hamster',  'hámster': 'Hamster',
    'Pez': 'Peixe',        'pez': 'Peixe',
    'tortuga': 'Tartaruga','tortugas': 'Tartarugas',
    'oveja': 'Ovelha',
    'gallina': 'Galinha',
    'cerdo': 'Porco',
    'cobaya': 'Porquinho-da-índia',
    'caballo': 'Cavalo',   'caballos': 'Cavalos',
 
    // Razas
    'Labrador': 'Labrador',           'labrador': 'Labrador',
    'Beagle': 'Beagle',               'beagle': 'Beagle',
    'Cocker Spaniel': 'Cocker Spaniel',
    'Golden Retriever': 'Golden Retriever',
    'Pug': 'Pug',
    'Pitbull': 'Pitbull',
    'Maine Coon': 'Maine Coon',
    'Persa': 'Persa',                 'persa': 'Persa',
    'Siamés': 'Siamês',               'siamés': 'Siamês',    'siames': 'Siamês',
    'Mini Lop': 'Mini Lop',
    'Mini Pig': 'Mini Pig',
    'Suffolk': 'Suffolk',
    'Merino': 'Merino',
    'Corriedale': 'Corriedale',
    'Duroc': 'Duroc',
    'Landrace': 'Landrace',
    'Rhode Island': 'Rhode Island',
    'Ruso enano': 'Russo anão',       'ruso enano': 'Russo anão',
    'Campbell': 'Campbell',
    'Amazona': 'Amazona',             'amazona': 'Amazona',
    'Amazónico': 'Amazônico',         'amazónico': 'Amazônico',  'amazonico': 'Amazônico',
    'Periquito': 'Periquito',         'periquito': 'Periquito',
    'Betta': 'Betta',
    'Goldfish': 'Peixe dourado',
    'Mediterránea': 'Mediterrânea',   'mediterránea': 'Mediterrânea',  'mediterranea': 'Mediterrânea',
    'Sirio': 'Sírio',                 'sirio': 'Sírio',
    'Rex': 'Rex',
    'Miniatura': 'Miniatura',         'miniatura': 'Miniatura',
    'Caniche': 'Poodle',              'caniche': 'Poodle',
    'Poodle': 'Poodle',
    'Chihuahua': 'Chihuahua',
 
    //Colores
    'Negro': 'Preto',                 'negro': 'Preto',
    'Blanco': 'Branco',               'blanco': 'Branco',
    'Gris': 'Cinza',                  'gris': 'Cinza',
    'Marron': 'Marrom',               'marron': 'Marrom',
    'Marrón': 'Marrom',               'marrón': 'Marrom',
    'Dorado': 'Dourado',              'dorado': 'Dourado',
    'Naranja': 'Laranja',             'naranja': 'Laranja',
    'Crema': 'Creme',                 'crema': 'Creme',
    'Canela': 'Canela',
    'Chocolate': 'Chocolate',
    'Tricolor': 'Tricolor',
    'Arena': 'Areia',                 'arena': 'Areia',
    'Rosado': 'Rosado',               'rosado': 'Rosado',
    'Azul': 'Azul',
    'Gris atigrado': 'Cinza tigrado', 'gris atigrado': 'Cinza tigrado',
    'Gris perla': 'Cinza pérola',     'gris perla': 'Cinza pérola',
    'Gris y blanco': 'Cinza e branco','gris y blanco': 'Cinza e branco',
    'Blanco y Negro': 'Branco e preto',
    'Blanco y negro': 'Branco e preto',   'blanco y negro': 'Branco e preto',
    'Blanco y marrón': 'Branco e marrom', 'blanco y marrón': 'Branco e marrom',
    'Blanco manchas': 'Branco com manchas',
    'Azul grisaceo': 'Azul acinzentado',
    'Azul metalico': 'Azul metálico',
    'Azul y rojo': 'Azul e vermelho',
    'Marrón rojizo': 'Marrom avermelhado', 'marrón rojizo': 'Marrom avermelhado',
    'Rosado manchas': 'Rosa com manchas',
    'Rosado oscuro': 'Rosa escuro',
    'Verde lima': 'Verde limão',
    'Verde oscuro': 'Verde escuro',
    'Verde y rojo': 'Verde e vermelho',
 
    //Enfermedades 
    'Moquillo Canino': 'Cinomose Canina',
    'Otitis Media Canina': 'Otite Média Canina',
    'Otitis Externa': 'Otite Externa',
    'Traqueobronquitis Canina': 'Traqueobronquite Canina',
    'Parvovirus Canino': 'Parvovirose Canina',
    'Leucemia Felina': 'Leucemia Felina',
    'Dermatofitosis': 'Dermatofitose',
    'Sarna Sarcóptica': 'Sarna Sarcóptica',  'Sarna Sarcoptica': 'Sarna Sarcóptica',
    'Aspergilosis Aviar': 'Aspergilose Aviária',
    'Psitacosis': 'Psitacose',
    'Encefalitis Aviaria': 'Encefalite Aviária',
    'Influenza Aviar': 'Influenza Aviária',
    'Rinitis Aviaria': 'Rinite Aviária',
    'Mixomatosis': 'Mixomatose',
    'Absceso Dental Conejo': 'Abscesso Dentário em Coelho',
    'Enteritis Mucosa': 'Enterite Mucosa',
    'Hidrops en Peces': 'Hidropisia em Peixes',
    'Diabetes Hamster': 'Diabetes em Hamster',
    'Coccidiosis Ovina': 'Coccidiose Ovina',
    'Timpanismo Ovino': 'Timpanismo Ovino',
    'Neumonia Bacteriana': 'Pneumonia Bacteriana',
    'Brucelosis Porcina': 'Brucelose Suína',
    'Erisipela Porcina': 'Erisipela Suína',
    'Parvovirus Porcino': 'Parvovirose Suína',
    'Hipoglucemia Porcina': 'Hipoglicemia Suína',
 
    //Palabras sueltas de enfermedades
    'moquillo': 'Cinomose',
    'aviar': 'Aviária',   'aviaria': 'Aviária',
    'porcina': 'Suína',   'porcino': 'Suíno',
    'ovina': 'Ovina',     'ovino': 'Ovino',
    'felina': 'Felina',
    'sarcóptica': 'Sarcóptica', 'sarcoptica': 'Sarcóptica',
    'dermatofitosis': 'Dermatofitose',
    'psitacosis': 'Psitacose',
    'mixomatosis': 'Mixomatose',
    'absceso': 'Abscesso',
    'dental': 'Dental',
    'enteritis': 'Enterite',
    'mucosa': 'Mucosa',
    'hidrops': 'Hidropisia',
    'diabetes': 'Diabetes',
    'coccidiosis': 'Coccidiose',
    'timpanismo': 'Timpanismo',
    'neumonia': 'Pneumonia',  'neumonía': 'Pneumonia',
    'brucelosis': 'Brucelose',
    'erisipela': 'Erisipela',
    'parvovirus': 'Parvovirose',
    'hipoglucemia': 'Hipoglicemia',
    'leucemia': 'Leucemia',
    'influenza': 'Influenza',
    'rinitis': 'Rinite',
    'encefalitis': 'Encefalite',
    'aspergilosis': 'Aspergilose',
    'traqueobronquitis': 'Traqueobronquite',
    'otitis': 'Otite',
    'sarna': 'Sarna',
    'bacteriana': 'Bacteriana', 'bacteriano': 'Bacteriano',
    'externa': 'Externa',
    'media': 'Média',
 
    //Nivel de gravedad
    'Leve': 'Leve',        'leve': 'Leve',
    'Moderado': 'Moderado','moderado': 'Moderado',
    'Grave': 'Grave',      'grave': 'Grave',
 
    //Tipo de enfermedad
    'Bacteriana': 'Bacteriana',
    'Viral': 'Viral',          'viral': 'Viral',
    'Fungica': 'Fúngica',      'fungica': 'Fúngica',
    'Metabolica': 'Metabólica','metabolica': 'Metabólica',
    'Parasitaria': 'Parasitária','parasitaria': 'Parasitária',
    'Digestiva': 'Digestiva',  'digestiva': 'Digestiva',
 
    //General
    'dueño': 'Dono',       'Dueño': 'Dono',   'dueno': 'Dono',
    'veterinario': 'Veterinário',
    'enfermedad': 'Doença','enfermedades': 'Doenças',
    'consulta': 'Consulta',
    'vacuna': 'Vacina',
    'tratamiento': 'Tratamento',
    'examen': 'Exame',
    'cirugía': 'Cirurgia', 'cirugia': 'Cirurgia',
    'medicamento': 'Medicamento',
    'mascota': 'Mascote',  'mascotas': 'Mascotes',
    'infección': 'Infecção','infeccion': 'Infecção',
    'crónico': 'Crônico',  'cronico': 'Crônico',
    'agudo': 'Agudo',
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

// Like translateDomainValue but only returns a mapped value when ALL non-space
// segments are present in the domain map. Otherwise returns the original value.
export function translateDomainValueStrict(value: string, lang: Language): string {
  if (lang === 'es') return value;
  const map = domainValueTranslations[lang] ?? {};

  const parts = value.split(/(\s+|[;,|]+)/);
  let allMapped = true;
  const mapped = parts.map(segment => {
    const key = segment.trim().toLowerCase();
    if (key === '') return segment;
    if (map[key]) return map[key];
    allMapped = false;
    return segment;
  }).join('');

  return allMapped ? mapped : value;
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
  can: 'caniche',
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