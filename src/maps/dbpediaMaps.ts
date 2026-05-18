// Maps lowercase raza/especie/enfermedad values → DBpedia resource slug.
// null = term is known to have no useful DBpedia entry; skip the fetch entirely.
// All slugs verified against https://es.dbpedia.org/sparql.

export const RAZA_MAP: Record<string, string | null> = {
  'pug':              'Pug',
  'poodle':           'Poodle',
  'beagle':           'Beagle',
  'boxer':            'Boxer_(dog)',
  'rottweiler':       'Rottweiler',
  'pastor alemán':    'German_Shepherd',
  'golden retriever': 'Golden_Retriever',
  'bulldog fránces':  'French_Bulldog',
  'bulldog francés':  'French_Bulldog',
  'persa':            'Persian_cat',
  'angora':           'Turkish_Angora',
  'bengala':          'Bengal_cat',
  'sphynx':           'Sphynx_cat',
  'loro':             'Parrot',
  'mestizo':          null,
  'felino':           null,
  'canino':           null,
};

export const ESPECIE_MAP: Record<string, string | null> = {
  'felino':           'Cat',
  'canino':           'Dog',
  'gato':             'Cat',
  'loro australiano': 'Budgerigar',
};

// Keys are the exact nombreEnfermedad values from the ontology (lowercase).
// Substring fallback is applied in dbpediaRepository if no exact match.
export const ENFERMEDAD_MAP: Record<string, string | null> = {
  'otitis':                      'Otitis',
  'otitis cronica':              'Otitis',
  'otitis externa':              'Otitis',
  'otomicosis':                  'Otomycosis',
  'insuficiencia renal':         'Kidney_failure',
  'dermaitis alergica':          'Dermatitis',
  'dermatitis bacteriana':       'Dermatitis',
  'parvovirus':                  'Parvovirus',
  'conjuntivitis':               'Conjunctivitis',
  'leucemia felina':             'Feline_leukemia_virus',
  'cistitis idiopática':         'Cystitis',
  'úlcera corneal':              'Corneal_ulcer',
  'gastroenteritis parasitaria': 'Gastroenteritis',
  'sarna sarcóptica':            'Scabies',
  'traqueobronquitis':           'Bronchitis',
  'diabetes mellitus':           'Diabetes',
};

export function resolveAnimalSlug(raza: string, especie: string): string | null {
  const razaKey = raza.toLowerCase().trim();
  if (razaKey in RAZA_MAP) return RAZA_MAP[razaKey] ?? null;

  const especieKey = especie.toLowerCase().trim();
  if (especieKey in ESPECIE_MAP) return ESPECIE_MAP[especieKey] ?? null;

  return null;
}

export function resolveEnfermedadSlug(nombre: string): string | null {
  const key = nombre.toLowerCase().trim();
  if (key in ENFERMEDAD_MAP) return ENFERMEDAD_MAP[key] ?? null;

  // Fallback: find a map entry that is a substring of the disease name
  const entry = Object.entries(ENFERMEDAD_MAP).find(([k]) => key.includes(k));
  return entry?.[1] ?? null;
}
