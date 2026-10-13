import {
  CATEGORIES,
  EXPERIENCE_LEVELS,
  FORMATS,
  LANGUAGES,
} from '../../constants/skillOptions'
import { EMPTY_SEARCH_FILTERS } from '../../services/discoveryService'
import './SearchFilters.css'

const FILTERS = [
  { key: 'category', label: 'Category', options: CATEGORIES },
  { key: 'format', label: 'Format', options: FORMATS },
  { key: 'experienceLevel', label: 'Experience', options: EXPERIENCE_LEVELS },
  { key: 'language', label: 'Language', options: LANGUAGES },
]

function SearchFilters({ filters, onFilterChange, onReset }) {
  const hasActiveFilters = FILTERS.some(
    (filter) => (filters[filter.key] || 'all') !== 'all'
  )

  return (
    <div className="search-filters">
      <div className="search-filters__controls" role="group" aria-label="Search filters">
        {FILTERS.map((filter) => (
          <label key={filter.key} className="search-filters__field">
            {filter.label}
            <select
              value={filters[filter.key] || EMPTY_SEARCH_FILTERS[filter.key]}
              onChange={(event) => onFilterChange(filter.key, event.target.value)}
            >
              <option value="all">All</option>
              {filter.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {hasActiveFilters && (
        <button type="button" className="search-filters__reset" onClick={onReset}>
          Reset filters
        </button>
      )}
    </div>
  )
}

export default SearchFilters
