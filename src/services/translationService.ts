import type { Language } from '../i18n/translations'

const translationCache = new Map<string, string>()
const pendingPromises = new Map<string, Promise<string>>()

export async function translateText(text: string, to: Language): Promise<string> {
  if (!text.trim()) return text

  const key = `${to}|${text}`
  if (translationCache.has(key)) {
    return translationCache.get(key)!
  }

  if (pendingPromises.has(key)) {
    return pendingPromises.get(key)!
  }

  const promise = (async () => {
    const params = new URLSearchParams({ text, to })
    const response = await fetch(`/api/translate?${params.toString()}`)
    const payload = await response.json()

    if (!response.ok) {
      throw new Error(payload?.error || 'Translation failed')
    }

    const result = payload.text as string
    translationCache.set(key, result)
    return result
  })()

  pendingPromises.set(key, promise)

  try {
    return await promise
  } finally {
    pendingPromises.delete(key)
  }
}
