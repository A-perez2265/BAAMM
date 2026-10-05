import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SearchBar from '../components/search/SearchBar'
import {
  getDiscoverableSkills,
  skillMatchesQuery,
} from '../services/discoveryService'
import { supabase } from '../utils/supabaseClient'
import './SearchPage.css'

function SearchPage() {
  const [query, setQuery] = useState('')
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        setError(userError.message)
        setLoading(false)
        return
      }

      if (!user) {
        setLoading(false)
        return
      }

      try {
        const skills = await getDiscoverableSkills(user.id)
        setListings(skills)
      } catch (loadError) {
        setError(loadError.message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const results = useMemo(
    () => listings.filter((skill) => skillMatchesQuery(skill, query)),
    [listings, query]
  )

  const showEmptyResults = !loading && !error && listings.length > 0 && results.length === 0
  const showNoListings = !loading && !error && listings.length === 0

  return (
    <main className="search-page">
      <h1>Search</h1>
      <p>
        Browse teacher listings. Type to filter. Request Exchange opens the
        request page; auto-selecting the skill waits on that page’s next update.
      </p>

      <SearchBar query={query} onQueryChange={setQuery} />

      {loading && <p>Loading listings…</p>}
      {error && <p className="search-page__error">{error}</p>}
      {showNoListings && (
        <p>No teacher listings from other users are available yet.</p>
      )}

      {showEmptyResults && (
        <div className="search-page__empty">
          <p>No Results found.</p>
          <button type="button" onClick={() => setQuery('')}>
            Clear search
          </button>
        </div>
      )}

      {results.length > 0 && (
        <ul className="search-page__results">
          {results.map((skill) => (
            <li key={skill.id} className="search-page__card">
              <h2>{skill.title}</h2>
              <p>{skill.description}</p>
              <p>
                {skill.category}
                {skill.experience_level ? ` · ${skill.experience_level}` : ''}
                {skill.format ? ` · ${skill.format}` : ''}
              </p>
              {skill.location && <p>{skill.location}</p>}
              <Link
                className="search-page__request"
                to={`/request?skill=${encodeURIComponent(skill.id)}`}
              >
                Request Exchange
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

export default SearchPage
