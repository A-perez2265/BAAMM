import { useState } from 'react';
import mockData from '../../../mockData.json';
import './SearchBar.css';

const popularTags = mockData.predefinedTags.filter((tag) => tag.isPopular);

function SearchBar() {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const showSuggestedTags = isFocused && query.trim() === '';

  return (
    <div className="search-bar">
      <label htmlFor="skill-search" className="search-bar__label">
        Search skills
      </label>
      <div className="search-bar__field">
        <input
          id="skill-search"
          type="text"
          className="search-bar__input"
          placeholder="Search skills..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoComplete="off"
          aria-expanded={showSuggestedTags}
          aria-controls="search-suggested-tags"
        />
        {showSuggestedTags && (
          <ul
            id="search-suggested-tags"
            className="search-bar__suggestions"
            role="listbox"
            aria-label="Popular tags"
            onMouseDown={(event) => event.preventDefault()}
          >
            {popularTags.map((tag) => (
              <li key={tag.id} className="search-bar__suggestion" role="option">
                {tag.name}
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
