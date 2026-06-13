import { StemmerEs, StopwordsEs, TokenizerEs } from '@nlpjs/lang-es'
import type { ClassSchema, OntologySchema } from '../services/schemaDiscovery'
import type { EntityMap, PropertyValueMatch } from './entityDetector'

const stemmer = new StemmerEs()
stemmer.stopwords = new StopwordsEs()
const tokenizer = new TokenizerEs()
const stopwords = new StopwordsEs()

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
  for (const prop of cls.datatypeProps) {
    if (
      prop.distinctValues.length > 0 &&
      prop.distinctValues.every(v => !isNaN(Number(v)) && v.trim() !== '')
    ) {
      return prop.localName
    }
  }
  return null
}

function extractAge(tokens: string[]): { age: string | null; remaining: string[] } {
  const rem = [...tokens]
  for (let i = 0; i < rem.length - 1; i++) {
    if (/^\d+$/.test(rem[i]) && (rem[i + 1] === 'años' || rem[i + 1] === 'año' || rem[i + 1] === 'years' || rem[i + 1] === 'year')) {
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

// Detecta sexo en español, inglés y portugués
function extractSexo(tokens: string[]): { sexo: string | null; remaining: string[] } {
  const sexoMap: Record<string, string> = {
    macho: 'Macho', machos: 'Macho', masculino: 'Macho',
    hembra: 'Hembra', hembras: 'Hembra', femenino: 'Hembra',
    male: 'Macho', female: 'Hembra',
    macho_pt: 'Macho', fêmea: 'Hembra', femea: 'Hembra',
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
    return hits?.length ? hits : null
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
      const valueMatches = lookupPhrase(phrase)
      if (valueMatches) return { type: 'value', matches: valueMatches, start, len }
      const clsName = lookupClass(phrase)
      if (clsName) return { type: 'class', className: clsName, start, len }
    }
  }
  return null
}

export function parseQuery(
  rawInput: string,
  entityMap: EntityMap,
  schema: OntologySchema | null,
): ParsedQuery {
  // La ontología activa ya está en el idioma del usuario; el término se procesa
  // tal cual, sin traducción intermedia.
  const lower = rawInput.toLowerCase().trim()
  const allTokens = tokenizer.tokenize(lower, true)
  const terms = stopwords.removeStopwords(allTokens)
  const stemmed = stemmer.tokenizeAndStem(lower, false)

  // Step 1 — Extraer edad y sexo (patrones de lenguaje, no ontología)
  let workingTokens = stopwords.removeStopwords([...allTokens]).filter(t => t.length > 0)
  const { age, remaining: afterAge } = extractAge(workingTokens)
  workingTokens = afterAge
  const { sexo, remaining: afterSexo } = extractSexo(workingTokens)
  workingTokens = afterSexo

  // Step 2 — Greedy longest-match para detectar entidades y valores de propiedades
  const contextMap = new Map<string, EntityContext>()
  let remaining = [...workingTokens]

  while (remaining.length > 0) {
    const match = longestMatch(remaining, entityMap)
    if (!match) break

    if (match.type === 'value') {
      for (const m of match.matches) {
        const ctx = getOrCreate(contextMap, m.className)
        addFilter(ctx, m.propertyLocalName, m.canonicalValue, 'exact')
      }
    } else {
      getOrCreate(contextMap, match.className)
    }

    remaining = [
      ...remaining.slice(0, match.start),
      ...remaining.slice(match.start + match.len),
    ]
  }

  // Step 3 — Asignar sexo al contexto Animal si existe
  if (sexo) {
    const animalCtx = getOrCreate(contextMap, 'Animal')
    addFilter(animalCtx, 'sexo', sexo, 'exact')
  }

  // Step 4 — Asignar edad numérica al primer contexto con propiedad numérica
  if (age !== null && schema) {
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

    // Si no hay contexto aún pero hay edad → crear contexto Animal
    if (!ageTarget) {
      ageTarget = getOrCreate(contextMap, 'Animal')
      agePropLocalName = 'edad'
    }

    if (ageTarget && agePropLocalName) {
      addFilter(ageTarget, agePropLocalName, age, 'numeric')
    }
  }

  // Step 5 — Determinar searchMode
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
