import { useEffect, useMemo, useState } from 'react'
import type { Language } from '../i18n/translations'
import { translateDomainValue, translateDomainValueStrict } from '../i18n/translations'
import { translateText } from '../services/translationService'

export function useTranslatedValues(values: (string | undefined | null)[], lang: Language) {
  const normalizedValues = useMemo(
    () => Array.from(new Set(values.filter((v): v is string => !!v).map(v => v.trim()))),
    [values]
  )

  const [translations, setTranslations] = useState<Record<string, string>>({})

  useEffect(() => {
    if (lang === 'es') {
      setTranslations({})
      return
    }

    let active = true
    const result: Record<string, string> = {}
    const toTranslate: string[] = []

    for (const value of normalizedValues) {
      // Prefer strict domain mapping: only accept domain map when it fully
      // covers the value (avoids partial mappings that mix languages).
      const strict = translateDomainValueStrict(value, lang)
      if (strict !== value) {
        result[value] = strict
        continue
      }

      // Fallback to permissive/domain mapping for single-token direct mappings
      const permissive = translateDomainValue(value, lang)
      if (permissive !== value && !value.includes(' ')) {
        // single-token mapped
        result[value] = permissive
      } else {
        toTranslate.push(value)
      }
    }

    if (toTranslate.length === 0) {
      if (active) setTranslations(result)
      return
    }

    setTranslations(result)

    Promise.all(
      toTranslate.map(async (value) => {
        try {
          const translated = await translateText(value, lang)
          return { value, translated: translated || value }
        } catch {
          return { value, translated: value }
        }
      })
    ).then(items => {
      if (!active) return
      const merged = { ...result }
      for (const item of items) {
        if (item.value) merged[item.value] = item.translated
      }
      setTranslations(merged)
    })

    return () => {
      active = false
    }
  }, [lang, normalizedValues])

  return translations
}
