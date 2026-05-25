declare module '@nlpjs/lang-es' {
  export class StemmerEs {
    stopwords: StopwordsEs
    tokenizeAndStem(text: string, keepStopwords?: boolean): string[]
  }
  export class StopwordsEs {
    removeStopwords(tokens: string[]): string[]
  }
  export class TokenizerEs {
    tokenize(text: string, normalize?: boolean): string[]
  }
}
