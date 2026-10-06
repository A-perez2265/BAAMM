import { useState } from 'react';
import mockData from '../../../mockData.json';
import './SearchBar.css';

const popularTags = mockData.predefinedTags.filter((tag) => tag.isPopular);

function SearchBar({ query, onQueryChange }) {
  const [isFocused, setIsFocused] = useState(false);

  const showSuggestedTags = isFocused && query.trim() === '';

  return (
    <div className="search-bar">
      <label htmlFor="skill-search" className="search-bar__label">
        Search skills
      </label>
      <div
        className="search-bar__field"
        onFocus={() => setIsFocused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setIsFocused(false);
        }}
      >
        <input
          id="skill-search"
          type="text"
          className="search-bar__input"
          placeholder="Search skills..."
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          autoComplete="off"
          aria-expanded={showSuggestedTags}
          aria-controls="search-suggested-tags"
        />
        {showSuggestedTags && (
          <ul
            id="search-suggested-tags"
            className="search-bar__suggestions"
            aria-label="Popular tags"
          >
            {popularTags.map((tag) => (
              <li key={tag.id}>
                <button
                  type="button"
                  className="search-bar__suggestion"
                  onClick={() => onQueryChange(tag.name)}
                >
                  {tag.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="search-bar__status" aria-live="polite">
        Query: “{query}” · Focused: {isFocused ? 'yes' : 'no'}
      </p>
    </div>
  );
}

export default SearchBar;
