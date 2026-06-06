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
  // Legacy fields — used by AnimalesPage during rendering decisions
  terms: string[]
  stemmed: string[]
}

// ─── Numeric property discovery — finds first prop whose distinct values are all numbers ──

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

// ─── Age extraction — language knowledge (regex), not ontology data ──────────

function extractAge(tokens: string[]): { age: string | null; remaining: string[] } {
  const rem = [...tokens]
  for (let i = 0; i < rem.length - 1; i++) {
    if (/^\d+$/.test(rem[i]) && (rem[i + 1] === 'años' || rem[i + 1] === 'año')) {
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

// ─── Context helpers ─────────────────────────────────────────────────────────

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

// ─── Greedy longest-match scan ───────────────────────────────────────────────

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
      // Stem fallback only for single-word phrases — multi-word phrases must match exactly
      // to avoid "perro beagle" → stem("perro") = "perr" → false match on especie="perro"
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

      // Property value match takes priority over generic class match
      const valueMatches = lookupPhrase(phrase)
      if (valueMatches) {
        return { type: 'value', matches: valueMatches, start, len }
      }

      const clsName = lookupClass(phrase)
      if (clsName) {
        return { type: 'class', className: clsName, start, len }
      }
    }
  }
  return null
}

// ─── Main parser ─────────────────────────────────────────────────────────────

export function parseQuery(
  rawInput: string,
  entityMap: EntityMap,
  schema: OntologySchema | null,
): ParsedQuery {
  const lower = rawInput.toLowerCase().trim()
  const allTokens = tokenizer.tokenize(lower, true)
  const terms = stopwords.removeStopwords(allTokens)
  const stemmed = stemmer.tokenizeAndStem(lower, false)

  // Step 1 — Age extraction (language pattern, not ontology)
  let workingTokens = stopwords.removeStopwords([...allTokens]).filter(t => t.length > 0)
  const { age, remaining: afterAge } = extractAge(workingTokens)
  workingTokens = afterAge

  // Step 2 — Greedy longest-match to detect all entity+property-value matches
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
      // Generic class reference — ensure context exists with no extra filter
      getOrCreate(contextMap, match.className)
    }

    // Remove matched tokens from remaining
    remaining = [
      ...remaining.slice(0, match.start),
      ...remaining.slice(match.start + match.len),
    ]
  }

  // Step 3 — Assign numeric value to the first context whose class has a numeric property
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

    if (ageTarget && agePropLocalName) {
      addFilter(ageTarget, agePropLocalName, age, 'numeric')
    }
    // If no class has a numeric property, numeric value is silently ignored
  }

  // Step 4 — Determine searchMode
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
