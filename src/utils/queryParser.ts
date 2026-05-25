// Parses a raw search string into structured query intent.
// Uses @nlpjs/lang-es (AXA Group) for Spanish tokenization and stopword removal.
// Replaced compromise.js, which is English-only at its core and lacked reliable
// Spanish support for user queries like "gatos con rabia" or "enfermedades de caninos".
import { StemmerEs, StopwordsEs, TokenizerEs } from '@nlpjs/lang-es'

const stemmer = new StemmerEs()
stemmer.stopwords = new StopwordsEs()
const tokenizer = new TokenizerEs()
const stopwords = new StopwordsEs()

export interface ParsedQuery {
  terms: string[]           // raw tokens without Spanish stopwords
  stemmed: string[]         // Snowball Spanish stems — used by detectEntityType as fallback
  isRelational: boolean     // true when 2+ terms detected (join query)
  primaryTerm: string       // raw token — preserved for SPARQL FILTER values
  secondaryTerm: string | null
  rawInput: string
}

export function parseQuery(rawInput: string): ParsedQuery {
  const lower = rawInput.toLowerCase().trim()

  // Spanish tokenization + stopword removal
  // e.g. "animales con otitis" → ["animales", "otitis"]
  const terms = stopwords.removeStopwords(tokenizer.tokenize(lower, true))

  // Snowball stems for CLASS_MAP fallback matching
  // e.g. "gaticos" → ["gat"], "enfermedades" → ["enfermedad"]
  const stemmed = stemmer.tokenizeAndStem(lower, false)

  const isRelational = terms.length >= 2
  const primaryTerm  = terms[0] ?? lower
  const secondaryTerm = terms.length >= 2 ? terms[1] : null

  return { terms, stemmed, isRelational, primaryTerm, secondaryTerm, rawInput }
}
