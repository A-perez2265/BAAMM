import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SearchBar from '../components/search/SearchBar'
import SearchFilters from '../components/search/SearchFilters'
import {
  EMPTY_SEARCH_FILTERS,
  getDiscoverableSkills,
  getListingSuggestionTags,
  skillMatchesFilters,
  skillMatchesQuery,
  teacherDisplayName,
} from '../services/discoveryService'
import { parseTags } from '../utils/skillUtils'
import { supabase } from '../utils/supabaseClient'
import { useListingRefresh } from '../utils/useListingRefresh'
import './SearchPage.css'

function SearchPage() {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState(EMPTY_SEARCH_FILTERS)
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision] = useListingRefresh()

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (!active) return

        if (userError) {
          setError(userError.message)
          setLoading(false)
          return
        }

        if (!user) {
          setLoading(false)
          return
        }

        const skills = await getDiscoverableSkills(user.id)
        if (active) setListings(skills)
      } catch (loadError) {
        if (active) setError(loadError.message)
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => { active = false }
  }, [revision])

  const results = useMemo(
    () =>
      listings.filter(
        (skill) =>
          skillMatchesQuery(skill, query) && skillMatchesFilters(skill, filters)
      ),
    [listings, query, filters]
  )

  const suggestionTags = useMemo(
    () => getListingSuggestionTags(listings),
    [listings]
  )

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const resetFilters = () => setFilters(EMPTY_SEARCH_FILTERS)

  const clearSearch = () => {
    setQuery('')
    setFilters(EMPTY_SEARCH_FILTERS)
  }

  const showEmptyResults = !loading && !error && listings.length > 0 && results.length === 0
  const showNoListings = !loading && !error && listings.length === 0

  return (
    <main id="main-content" className="community-page search-page" tabIndex={-1}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Discover</p>
          <h1>
            Search <span className="count">{results.length}</span>
          </h1>
          <p>
            Browse teacher listings. Type at least three letters for matching
            tags, or choose a popular tag and filters, then select Request
            Exchange.
          </p>
        </div>
      </div>

      <section className="panel search-page__controls" aria-label="Search and filters">
        <SearchBar
          query={query}
          onQueryChange={setQuery}
          suggestionTags={suggestionTags}
          showEmptyTagsHint={!loading && listings.length > 0 && suggestionTags.length === 0}
        />
        <SearchFilters
          filters={filters}
          onFilterChange={updateFilter}
          onReset={resetFilters}
        />
      </section>

      {loading && (
        <p role="status" className="panel">
          Loading listings…
        </p>
      )}
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {showNoListings && (
        <div className="panel empty-state">
          <span className="empty-icon" aria-hidden="true">
            ✦
          </span>
          <h3>No teacher listings yet</h3>
          <p>No teacher listings from other users are available yet.</p>
        </div>
      )}

      {showEmptyResults && (
        <div className="panel empty-state">
          <h3>No Results found.</h3>
          <p>Try another tag or reset the filters to see more listings.</p>
          <button type="button" className="primary-button" onClick={clearSearch}>
            Clear search
          </button>
        </div>
      )}

      {results.length > 0 && (
        <ul className="skills-grid search-page__results">
          {results.map((skill) => {
            const tags = parseTags(skill.tags)
            const teacherName = teacherDisplayName(skill.teacher)
            return (
              <li key={skill.id}>
                <article className="skill-card">
                  <div className="card-labels">
                    {skill.category && <span className="badge">{skill.category}</span>}
                    <span className="listing-label listing-teaching">Teacher</span>
                  </div>
                  <h3>{skill.title}</h3>
                  {teacherName && skill.user_id && (
                    <p className="search-page__teacher">
                      <Link className="text-link" to={`/profile/${skill.user_id}`}>
                        {teacherName}
                      </Link>
                    </p>
                  )}
                  <p className="skill-description">{skill.description}</p>
                  <dl className="skill-details">
                    {[
                      ['Experience', skill.experience_level],
                      ['Format', skill.format],
                      ['Language', skill.language],
                      ['Location', skill.location],
                    ]
                      .filter(([, value]) => value)
                      .map(([label, value]) => (
                        <div key={label}>
                          <div>
                            <dt>{label}</dt>
                            <dd>{value}</dd>
                          </div>
                        </div>
                      ))}
                  </dl>
                  {tags.length > 0 && (
                    <ul className="skill-tags" aria-label="Skill tags">
                      {tags.map((tag) => (
                        <li key={tag}>#{tag}</li>
                      ))}
                    </ul>
                  )}
                  <div className="card-actions">
                    <Link
                      className="button-link primary-button"
                      to={`/request?skill=${encodeURIComponent(skill.id)}`}
                    >
                      Request Exchange
                    </Link>
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}

export default SearchPage
