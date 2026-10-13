import assert from 'node:assert/strict'
import { createServer } from 'vite'

const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false, ws: false },
  plugins: [{
    name: 'mock-discovery-client',
    enforce: 'pre',
    resolveId(id) { if (/\/supabaseClient(?:\.js)?$/.test(id)) return '\0discovery-client' },
    load(id) { if (id === '\0discovery-client') return 'export const supabase = {}' },
  }],
})

try {
  const discovery = await server.ssrLoadModule('/src/services/discoveryService.js')
  const listings = [
    { tags: ['guitar', 'music'] },
    { tags: ['#Guitar', 'beginner'] },
    { tags: 'python, music' },
    { tags: [] },
    { title: 'Baking', category: 'Cooking & Baking' },
  ]

  const tags = discovery.getListingSuggestionTags(listings)
  assert.deepEqual(tags.map((tag) => tag.name), ['guitar', 'music', 'beginner', 'python'])
  assert.equal(tags.some((tag) => tag.name === 'Cooking & Baking'), false)
  assert.deepEqual(discovery.getListingSuggestionTags([]), [])
  assert.deepEqual(
    discovery.getPrefixMatchedTags(tags, 'gui').map((tag) => tag.name),
    ['guitar']
  )
  assert.deepEqual(discovery.getPrefixMatchedTags(tags, 'py').map((tag) => tag.name), [])
  assert.deepEqual(
    discovery.getPrefixMatchedTags(tags, 'pyt').map((tag) => tag.name),
    ['python']
  )

  console.log('Passed: suggestion tags come from unique live listing tags, not categories, and prefix match those tags.')
} finally {
  await server.close()
}
