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
  const skill = {
    title: 'Guitar lessons',
    category: 'Music',
    format: 'In Person',
    experience_level: 'Beginner',
    language: 'English',
  }

  assert.equal(discovery.skillMatchesFilters(skill, discovery.EMPTY_SEARCH_FILTERS), true)
  assert.equal(discovery.skillMatchesFilters(skill, { ...discovery.EMPTY_SEARCH_FILTERS, category: 'Music' }), true)
  assert.equal(discovery.skillMatchesFilters(skill, { ...discovery.EMPTY_SEARCH_FILTERS, category: 'Technology' }), false)
  assert.equal(
    discovery.skillMatchesFilters(skill, {
      ...discovery.EMPTY_SEARCH_FILTERS,
      category: 'Music',
      format: 'In Person',
    }),
    true
  )
  assert.equal(
    discovery.skillMatchesFilters(skill, {
      ...discovery.EMPTY_SEARCH_FILTERS,
      category: 'Music',
      format: 'Online',
    }),
    false
  )
  assert.equal(
    discovery.skillMatchesFilters(skill, {
      category: 'Music',
      format: 'In Person',
      experienceLevel: 'Beginner',
      language: 'Spanish',
    }),
    false
  )
  assert.equal(
    discovery.skillMatchesQuery(skill, 'guitar') &&
      discovery.skillMatchesFilters(skill, { ...discovery.EMPTY_SEARCH_FILTERS, format: 'In Person' }),
    true
  )

  console.log('Passed: discovery filters use AND, All ignores a facet, and query can combine with filters.')
} finally {
  await server.close()
}
