import { StemmerEs, StopwordsEs, TokenizerEs } from '@nlpjs/lang-es'
import type { ClassSchema, OntologySchema } from '../services/schemaDiscovery'
import type { EntityMap, PropertyValueMatch } from './entityDetector'
import type { Language } from '../i18n/translations'

const stemmer = new StemmerEs()
stemmer.stopwords = new StopwordsEs()
const tokenizer = new TokenizerEs()
const stopwords = new StopwordsEs()

const EN_STOPWORDS = new Set([
  'a', 'an', 'the', 'with', 'of', 'in', 'on', 'at', 'for', 'to', 'by',
  'is', 'are', 'was', 'were', 'has', 'have', 'had', 'be', 'been',
  'and', 'or', 'but', 'not', 'no', 'that', 'this', 'it', 'its',
  'from', 'as', 'into', 'than', 'more', 'most', 'also', 'some',
])

const PT_STOPWORDS = new Set([
  'a', 'o', 'as', 'os', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das',
  'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'com', 'que', 'se',
  'e', 'ou', 'mas', 'não', 'é', 'foi', 'tem', 'ter', 'ser', 'este',
  'esta', 'isso', 'ele', 'ela',
])

function basicTokenize(text: string, lang: Language): string[] {
  const stopwordSet = lang === 'en' ? EN_STOPWORDS : lang === 'pt' ? PT_STOPWORDS : new Set<string>()
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !stopwordSet.has(t))
}

export type MatchType = 'exact' | 'contains' | 'numeric'

export interface PropertyFilter {
  propertyLocalName: string
  value: string
  matchType: MatchType
}

export interface EntityContext {
  className: string
  propertyFilters: PropertyFilter[]
}

export interface ParsedQuery {
  rawInput: string
  searchMode: 'entity' | 'content' | 'multi-entity' | 'fallback'
  entityContexts: EntityContext[]
  terms: string[]
  stemmed: string[]
}

function findNumericProp(cls: ClassSchema): string | null {
  let firstNumeric: string | null = null
  for (const prop of cls.datatypeProps) {
    const values = prop.distinctValues.filter(v => v.trim() !== '')
    if (values.length === 0 || !values.every(v => !isNaN(Number(v)))) continue
    if (firstNumeric === null) firstNumeric = prop.localName
    if (values.every(v => Number.isInteger(Number(v)) && !v.includes('.'))) {
      return prop.localName
    }
  }
  return firstNumeric
}

function extractAge(tokens: string[]): { age: string | null; remaining: string[] } {
  const rem = [...tokens]
  const ageUnits = new Set(['años', 'año', 'anos', 'ano', 'years', 'year'])

  for (let i = 0; i < rem.length - 1; i++) {
    if (/^\d+$/.test(rem[i]) && ageUnits.has(rem[i + 1])) {
      const age = rem[i]
      rem.splice(i, 2)
      return { age, remaining: rem }
    }
  }
  for (let i = 0; i < rem.length; i++) {
    if (/^\d+$/.test(rem[i])) {
      const age = rem[i]
      rem.splice(i, 1)
      return { age, remaining: rem }
    }
  }
  return { age: null, remaining: rem }
}

function extractSexo(tokens: string[]): { sexo: string | null; remaining: string[] } {
  const sexoMap: Record<string, string> = {
    // Español
    macho: 'Macho', machos: 'Macho', masculino: 'Macho',
    hembra: 'Hembra', hembras: 'Hembra', femenino: 'Hembra',
    // Inglés
    male: 'Macho', males: 'Macho',
    female: 'Hembra', females: 'Hembra',
    // Portugués
    fêmea: 'Hembra', femea: 'Hembra', fêmeas: 'Hembra', femeas: 'Hembra',
  }
  const rem = [...tokens]
  for (let i = 0; i < rem.length; i++) {
    const val = sexoMap[rem[i]]
    if (val) {
      rem.splice(i, 1)
      return { sexo: val, remaining: rem }
    }
  }
  return { sexo: null, remaining: rem }
}

function getOrCreate(map: Map<string, EntityContext>, className: string): EntityContext {
  let ctx = map.get(className)
  if (!ctx) {
    ctx = { className, propertyFilters: [] }
    map.set(className, ctx)
  }
  return ctx
}

function addFilter(ctx: EntityContext, localName: string, value: string, matchType: MatchType) {
  const dup = ctx.propertyFilters.some(
    f => f.propertyLocalName === localName && f.value === value
  )
  if (!dup) ctx.propertyFilters.push({ propertyLocalName: localName, value, matchType })
}

interface PhraseMatch {
  type: 'value'
  matches: PropertyValueMatch[]
  start: number
  len: number
}
interface ClassMatch {
  type: 'class'
  className: string
  start: number
  len: number
}
type TokenMatch = PhraseMatch | ClassMatch

function longestMatch(tokens: string[], map: EntityMap): TokenMatch | null {
  function lookupPhrase(phrase: string): PropertyValueMatch[] | null {
    const lower = phrase.toLowerCase()
    let hits = map.termToPropertyValue.get(lower)
    if (!hits && !lower.includes(' ')) {
      const s = stemmer.tokenizeAndStem(lower, false)[0]
      if (s) hits = map.termToPropertyValue.get(s)
    }
    if (hits?.length) return hits

    if (lower.length >= 3) {
      const partialHits: PropertyValueMatch[] = []
      for (const [, matches] of map.termToPropertyValue) {
        for (const m of matches) {
          const canonical = m.canonicalValue.toLowerCase()
          if (
            canonical.includes(lower) &&
            !partialHits.some(
              p => p.className === m.className &&
                   p.propertyLocalName === m.propertyLocalName &&
                   p.canonicalValue === m.canonicalValue
            )
          ) {
            partialHits.push(m)
          }
        }
      }
      if (partialHits.length) return partialHits
    }
    return null
  }

  function lookupClass(phrase: string): string | null {
    const lower = phrase.toLowerCase()
    let cls = map.termToClass.get(lower)
    if (!cls && !lower.includes(' ')) {
      const s = stemmer.tokenizeAndStem(lower, false)[0]
      if (s) cls = map.termToClass.get(s)
    }
    return cls ?? null
  }

  for (let len = tokens.length; len >= 1; len--) {
    for (let start = 0; start <= tokens.length - len; start++) {
      const phrase = tokens.slice(start, start + len).join(' ')
      const clsName = lookupClass(phrase)
      if (clsName) return { type: 'class', className: clsName, start, len }
      const valueMatches = lookupPhrase(phrase)
      if (valueMatches) return { type: 'value', matches: valueMatches, start, len }
    }
  }
  return null
}

const ESPECIES_CANONICAS = new Set([
  'canino', 'felino', 'pez', 'cerdo', 'conejo', 'gallina',
  'gato', 'hamster', 'hámster', 'loro', 'oveja', 'perro', 'tortuga',
])

// ── Diccionario SOLO inglés ───────────────────────────────────────────────────
const LANG_CLASS_HINTS_EN: Record<string, string> = {
  // Clases
  animal: 'Animal', animals: 'Animal',
  disease: 'Enfermedad', diseases: 'Enfermedad',
  illness: 'Enfermedad', illnesses: 'Enfermedad',
  medication: 'Medicamento', medications: 'Medicamento',
  medicine: 'Medicamento', medicines: 'Medicamento',
  drug: 'Medicamento', drugs: 'Medicamento',
  veterinarian: 'Veterinario', veterinarians: 'Veterinario',
  vet: 'Veterinario', vets: 'Veterinario',
  owner: 'Dueno', owners: 'Dueno',
  consultation: 'Consulta', consultations: 'Consulta',
  appointment: 'Consulta', appointments: 'Consulta',
  vaccine: 'Vacunacion', vaccines: 'Vacunacion',
  vaccination: 'Vacunacion', vaccinations: 'Vacunacion',
  treatment: 'Tratamiento', treatments: 'Tratamiento',
  surgery: 'Cirugia', surgeries: 'Cirugia', operation: 'Cirugia',
  exam: 'ExamenMedico', exams: 'ExamenMedico',
  examination: 'ExamenMedico', examinations: 'ExamenMedico',
  checkup: 'ExamenMedico',
  // Especies
  cat: 'gato', cats: 'gato',
  dog: 'perro', dogs: 'perro',
  rabbit: 'conejo', rabbits: 'conejo',
  hamster: 'hamster',
  parrot: 'loro', parrots: 'loro',
  fish: 'pez',
  turtle: 'tortuga', turtles: 'tortuga',
  pig: 'cerdo', pigs: 'cerdo',
  hen: 'gallina', hens: 'gallina', chicken: 'gallina', chickens: 'gallina',
  sheep: 'oveja',
  canine: 'canino', feline: 'felino',
  // Tipos de enfermedad
  viral: 'Viral',
  bacterial: 'Bacteriana',
  fungal: 'Fungica', fungic: 'Fungica',
  parasitic: 'Parasitaria',
  digestive: 'Digestiva',
  metabolic: 'Metabolica',
  // Gravedad
  mild: 'Leve', slight: 'Leve',
  moderate: 'Moderado',
  severe: 'Grave', serious: 'Grave', critical: 'Grave',
  // Enfermedades
  rabies: 'rabia',
  distemper: 'moquillo',
  leukemia: 'leucemia',
  mange: 'sarna', scabies: 'sarna',
  otitis: 'otitis',
  // Razas
  'golden retriever': 'Golden Retriever',
  'cocker spaniel': 'Cocker Spaniel',
  'maine coon': 'Maine Coon',
  labrador: 'Labrador',
  beagle: 'Beagle',
  pug: 'Pug',
  siamese: 'Siamés',
  persian: 'Persa',
  'mini pig': 'Mini Pig',
}

// ── Diccionario SOLO portugués ────────────────────────────────────────────────
const LANG_CLASS_HINTS_PT: Record<string, string> = {
  // Clases
  animais: 'Animal',
  doença: 'Enfermedad', doenças: 'Enfermedad',
  doenca: 'Enfermedad', doencas: 'Enfermedad',
  medicamento: 'Medicamento', medicamentos: 'Medicamento',
  remédio: 'Medicamento', remedio: 'Medicamento',
  veterinário: 'Veterinario', veterinario: 'Veterinario',
  veterinários: 'Veterinario', veterinarios: 'Veterinario',
  dono: 'Dueno', donos: 'Dueno',
  consulta: 'Consulta', consultas: 'Consulta',
  vacina: 'Vacunacion', vacinas: 'Vacunacion',
  vacinação: 'Vacunacion', vacinacao: 'Vacunacion',
  tratamento: 'Tratamiento', tratamentos: 'Tratamiento',
  cirurgia: 'Cirugia', cirurgias: 'Cirugia',
  exame: 'ExamenMedico', exames: 'ExamenMedico',
  // Especies
  gato: 'gato', gatos: 'gato',
  cachorro: 'perro', cão: 'perro', cao: 'perro', cães: 'perro', caes: 'perro',
  coelho: 'conejo', coelhos: 'conejo',
  peixe: 'pez', peixes: 'pez',
  tartaruga: 'tortuga', tartarugas: 'tortuga',
  porco: 'cerdo', porcos: 'cerdo',
  galinha: 'gallina', galinhas: 'gallina',
  ovelha: 'oveja', ovelhas: 'oveja',
  papagaio: 'loro', papagaios: 'loro',
  // Tipos de enfermedad
  bacteriana: 'Bacteriana', bacteriano: 'Bacteriana',
  fúngica: 'Fungica', fungica: 'Fungica',
  parasitária: 'Parasitaria', parasitaria: 'Parasitaria',
  digestiva: 'Digestiva', digestivo: 'Digestiva',
  metabólica: 'Metabolica', metabolica: 'Metabolica',
  // Gravedad
  leve: 'Leve',
  moderado: 'Moderado', moderada: 'Moderado',
  grave: 'Grave', graves: 'Grave',
  // Enfermedades
  raiva: 'rabia',
  sarna: 'sarna',
  leucemia: 'leucemia',
  cinomose: 'moquillo',
  // Razas
  'golden retriever': 'Golden Retriever',
  'cocker spaniel': 'Cocker Spaniel',
  'maine coon': 'Maine Coon',
  labrador: 'Labrador',
  beagle: 'Beagle',
  pug: 'Pug',
  siamês: 'Siamés', siames: 'Siamés',
  persa: 'Persa',
}

// Traduce tokens según el idioma activo — intenta bigramas primero
function translateTokens(tokens: string[], lang: Language): string[] {
  const hints = lang === 'en' ? LANG_CLASS_HINTS_EN : LANG_CLASS_HINTS_PT
  const result: string[] = []
  let i = 0
  while (i < tokens.length) {
    if (i + 1 < tokens.length) {
      const bigram = `${tokens[i]} ${tokens[i + 1]}`
      const translated = hints[bigram.toLowerCase()]
      if (translated) {
        result.push(translated)
        i += 2
        continue
      }
    }
    result.push(hints[tokens[i].toLowerCase()] ?? tokens[i])
    i++
  }
  return result
}

export function parseQuery(
  rawInput: string,
  entityMap: EntityMap,
  schema: OntologySchema | null,
  lang: Language = 'es',
): ParsedQuery {
  const lower = rawInput.toLowerCase().trim()
  const isSpanish = lang === 'es'

  const allTokens: string[] = isSpanish
    ? tokenizer.tokenize(lower, true)
    : basicTokenize(lower, lang)

  const terms: string[] = isSpanish ? stopwords.removeStopwords(allTokens) : [...allTokens]
  const stemmed: string[] = isSpanish ? stemmer.tokenizeAndStem(lower, false) : []

  // Step 1: extraer edad y sexo del stream completo de tokens
  const rawTokensForExtraction = lower
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0)

  const { age, remaining: afterAge } = extractAge([...rawTokensForExtraction])
  const { sexo, remaining: afterSexo } = extractSexo(afterAge)

  // Step 2: filtrar stopwords y traducir según idioma activo
  const EN_STOP_FOR_ENTITY = new Set([...EN_STOPWORDS, 'old'])
  const PT_STOP_FOR_ENTITY = new Set([...PT_STOPWORDS])

  const cleanedTokens = isSpanish
    ? stopwords.removeStopwords(afterSexo).filter(t => t.length > 0)
    : afterSexo.filter(t => {
        const stopSet = lang === 'en' ? EN_STOP_FOR_ENTITY : PT_STOP_FOR_ENTITY
        return t.length > 1 && !stopSet.has(t)
      })

  // Solo traducir con el diccionario del idioma activo
  const workingTokens = isSpanish ? cleanedTokens : translateTokens(cleanedTokens, lang)

  // Step 3: extraer especies antes del longestMatch
  const contextMap = new Map<string, EntityContext>()
  const tokensAfterSpecies: string[] = []

  for (const token of workingTokens) {
    const tokenLower = token.toLowerCase()
    if (ESPECIES_CANONICAS.has(tokenLower)) {
      const animalCtx = getOrCreate(contextMap, 'Animal')
      addFilter(animalCtx, 'especie', token, 'exact')
    } else {
      tokensAfterSpecies.push(token)
    }
  }

  // Step 4: greedy longest-match
  let remaining = [...tokensAfterSpecies]

  while (remaining.length > 0) {
    const match = longestMatch(remaining, entityMap)
    if (!match) break

    if (match.type === 'value') {
      for (const m of match.matches) {
        const ctx = getOrCreate(contextMap, m.className)
        const matchType: MatchType = m.canonicalValue.toLowerCase() === remaining
          .slice(match.start, match.start + match.len).join(' ').toLowerCase()
          ? 'exact'
          : 'contains'
        addFilter(ctx, m.propertyLocalName, m.canonicalValue, matchType)
      }
    } else {
      getOrCreate(contextMap, match.className)
    }

    remaining = [
      ...remaining.slice(0, match.start),
      ...remaining.slice(match.start + match.len),
    ]
  }

  // Step 5: asignar sexo → Animal
  if (sexo) {
    const animalCtx = getOrCreate(contextMap, 'Animal')
    addFilter(animalCtx, 'sexo', sexo, 'exact')
  }

  // Step 6: asignar edad
  if (age !== null) {
    if (contextMap.size === 0) {
      const animalCtx = getOrCreate(contextMap, 'Animal')
      addFilter(animalCtx, 'edad', age, 'numeric')
    } else if (schema) {
      let ageTarget: EntityContext | null = null
      let agePropLocalName: string | null = null

      for (const [, ctx] of contextMap) {
        const cls = schema.classes.get(ctx.className)
        const numProp = cls ? findNumericProp(cls) : null
        if (numProp) {
          ageTarget = ctx
          agePropLocalName = numProp
          break
        }
      }

      if (!ageTarget) {
        ageTarget = getOrCreate(contextMap, 'Animal')
        agePropLocalName = 'edad'
      }

      addFilter(ageTarget, agePropLocalName!, age, 'numeric')
    } else {
      const animalCtx = getOrCreate(contextMap, 'Animal')
      addFilter(animalCtx, 'edad', age, 'numeric')
    }
  }

  // Step 7: determinar searchMode
  const contexts = Array.from(contextMap.values())
  let searchMode: ParsedQuery['searchMode']

  if (contexts.length === 0) {
    searchMode = rawInput.trim().length > 0 ? 'content' : 'fallback'
  } else if (contexts.length >= 2) {
    searchMode = 'multi-entity'
  } else {
    searchMode = 'entity'
  }

  return { rawInput, searchMode, entityContexts: contexts, terms, stemmed }
}
