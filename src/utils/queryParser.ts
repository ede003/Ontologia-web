// Parses a raw search string into structured query intent.
import { StemmerEs, StopwordsEs, TokenizerEs } from '@nlpjs/lang-es'
import type { EntityMap } from './entityDetector'
import { detectEntityType, resolveSpeciesValue, resolveRazaValue } from './entityDetector'

const stemmer = new StemmerEs()
stemmer.stopwords = new StopwordsEs()
const tokenizer = new TokenizerEs()
const stopwords = new StopwordsEs()

export interface ParsedQuery {
  terms: string[]
  stemmed: string[]
  isRelational: boolean
  primaryTerm: string
  secondaryTerm: string | null
  rawInput: string
  filters: Record<string, string>  // edad, sexo, raza, especie detectados
}

// Detecta edad: "5 años", "3 años", número suelto
function extractAge(tokens: string[]): { age: string | null; remaining: string[] } {
  const remaining = [...tokens]
  for (let i = 0; i < remaining.length - 1; i++) {
    if (/^\d+$/.test(remaining[i]) && (remaining[i + 1] === 'años' || remaining[i + 1] === 'año')) {
      const age = remaining[i]
      remaining.splice(i, 2)
      return { age, remaining }
    }
  }
  for (let i = 0; i < remaining.length; i++) {
    if (/^\d+$/.test(remaining[i])) {
      const age = remaining[i]
      remaining.splice(i, 1)
      return { age, remaining }
    }
  }
  return { age: null, remaining }
}

// Detecta sexo: "macho", "hembra"
function extractSexo(tokens: string[]): { sexo: string | null; remaining: string[] } {
  const sexoMap: Record<string, string> = {
    macho: 'Macho', machos: 'Macho',
    hembra: 'Hembra', hembras: 'Hembra',
  }
  const remaining = [...tokens]
  for (let i = 0; i < remaining.length; i++) {
    const val = sexoMap[remaining[i]]
    if (val) {
      remaining.splice(i, 1)
      return { sexo: val, remaining }
    }
  }
  return { sexo: null, remaining }
}

// Detecta raza de múltiples palabras: "golden retriever", "maine coon"
// Prueba combinaciones de términos consecutivos (más largo primero)
function extractRaza(
  tokens: string[],
  entityMap: EntityMap,
): { raza: string | null; remaining: string[] } {
  for (let len = tokens.length; len >= 1; len--) {
    for (let start = 0; start <= tokens.length - len; start++) {
      const phrase = tokens.slice(start, start + len).join(' ')
      const razaVal = resolveRazaValue(phrase, entityMap)
      if (razaVal) {
        const remaining = [...tokens.slice(0, start), ...tokens.slice(start + len)]
        return { raza: razaVal, remaining }
      }
    }
  }
  return { raza: null, remaining: tokens }
}

// Detecta especie de múltiples palabras
function extractEspecie(
  tokens: string[],
  entityMap: EntityMap,
): { especie: string | null; remaining: string[] } {
  for (let len = tokens.length; len >= 1; len--) {
    for (let start = 0; start <= tokens.length - len; start++) {
      const phrase = tokens.slice(start, start + len).join(' ')
      const especieVal = resolveSpeciesValue(phrase, entityMap)
      if (especieVal) {
        const remaining = [...tokens.slice(0, start), ...tokens.slice(start + len)]
        return { especie: especieVal, remaining }
      }
    }
  }
  return { especie: null, remaining: tokens }
}

// Intenta detectar una instancia compuesta (nombre de enfermedad, medicamento, etc.)
function findLongestInstanceMatch(
  terms: string[],
  entityMap: EntityMap,
): { primaryTerm: string; remainingTerms: string[] } | null {
  for (let len = terms.length; len >= 2; len--) {
    for (let start = 0; start <= terms.length - len; start++) {
      const phrase = terms.slice(start, start + len).join(' ')
      const cls = detectEntityType(phrase, entityMap)
      if (cls && cls !== 'Animal') {
        // Solo para instancias no-Animal (enfermedades, medicamentos, etc.)
        const remaining = [...terms.slice(0, start), ...terms.slice(start + len)]
        return { primaryTerm: phrase, remainingTerms: remaining }
      }
    }
  }
  return null
}

export function parseQuery(rawInput: string, entityMap?: EntityMap): ParsedQuery {
  const lower = rawInput.toLowerCase().trim()
  const allTokens = tokenizer.tokenize(lower, true)
  const terms = stopwords.removeStopwords(allTokens)
  const stemmed = stemmer.tokenizeAndStem(lower, false)
  const filters: Record<string, string> = {}

  // ── Paso 1: extraer atributos simples (edad, sexo) ───────────────────────
  let workingTokens = [...allTokens]

  const { age, remaining: afterAge } = extractAge(workingTokens)
  if (age) { filters.edad = age; workingTokens = afterAge }

  const { sexo, remaining: afterSexo } = extractSexo(workingTokens)
  if (sexo) { filters.sexo = sexo; workingTokens = afterSexo }

  // Tokens limpios sin stopwords para continuar
  let cleanTerms = stopwords.removeStopwords(workingTokens).filter(t => t.length > 0)

  // ── Paso 2: extraer raza y especie si hay entityMap ──────────────────────
  if (entityMap) {
    const { raza, remaining: afterRaza } = extractRaza(cleanTerms, entityMap)
    if (raza) { filters.raza = raza; cleanTerms = afterRaza }

    const { especie, remaining: afterEspecie } = extractEspecie(cleanTerms, entityMap)
    if (especie) { filters.especie = especie; cleanTerms = afterEspecie }
  }

  // ── Paso 3: si hay especie o raza detectada → modo Animal ────────────────
  if (filters.especie || filters.raza) {
    return {
      terms,
      stemmed,
      isRelational: false,
      primaryTerm: filters.especie ?? filters.raza ?? cleanTerms[0] ?? lower,
      secondaryTerm: null,
      rawInput,
      filters,
    }
  }

  // ── Paso 4: detectar instancia compuesta no-Animal (Leucemia Felina, etc.) ─
  if (entityMap && cleanTerms.length >= 2) {
    const instanceMatch = findLongestInstanceMatch(cleanTerms, entityMap)
    if (instanceMatch) {
      const { primaryTerm, remainingTerms } = instanceMatch
      const isRelational = remainingTerms.length > 0
      const secondaryTerm = remainingTerms.length > 0 ? remainingTerms[0] : null
      return { terms, stemmed, isRelational, primaryTerm, secondaryTerm, rawInput, filters }
    }
  }

  // ── Paso 5: comportamiento original ──────────────────────────────────────
  const isRelational = cleanTerms.length >= 2
  const primaryTerm  = cleanTerms[0] ?? lower
  const secondaryTerm = cleanTerms.length >= 2 ? cleanTerms[1] : null

  return { terms, stemmed, isRelational, primaryTerm, secondaryTerm, rawInput, filters }
}
