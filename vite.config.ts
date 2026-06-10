import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { translate } from '@vitalets/google-translate-api'

function translationApiPlugin() {
  function translateMiddleware(req: any, res: any, next: any) {
    if (!req.url?.startsWith('/api/translate')) return next()

    const url = new URL(req.url, 'http://localhost')
    const text = url.searchParams.get('text') || ''
    const to = (url.searchParams.get('to') || 'en') as string

    if (!text.trim()) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'text query param is required' }))
      return
    }

    translate(text, { to })
      .then(result => {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ text: result.text }))
      })
      .catch(error => {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: String(error) }))
      })
  }

  return {
    name: 'vite:translation-api',
    configureServer(server: any) {
      server.middlewares.use(translateMiddleware)
    },
    configurePreviewServer(server: any) {
      server.middlewares.use(translateMiddleware)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), translationApiPlugin()],
})
