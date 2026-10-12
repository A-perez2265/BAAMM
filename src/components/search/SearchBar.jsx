import { useState } from 'react';
import mockData from '../../../mockData.json';
import { getPrefixMatchedTags } from '../../services/discoveryService';
import './SearchBar.css';

const predefinedTags = mockData.predefinedTags;
const popularTags = predefinedTags.filter((tag) => tag.isPopular);

function HighlightedTagName({ name, query }) {
  const prefixLength = query.trim().length;
  const matched = name.slice(0, prefixLength);
  const remainder = name.slice(prefixLength);

  return (
    <>
      <mark className="search-bar__highlight">{matched}</mark>
      {remainder}
    </>
  );
}

function SearchBar({ query, onQueryChange }) {
  const [isFocused, setIsFocused] = useState(false);

  const trimmedQuery = query.trim();
  const showClear = query.length > 0;
  const prefixMatches = getPrefixMatchedTags(predefinedTags, query);
  const showSuggestedTags = isFocused && trimmedQuery === '';
  const showAutocomplete = isFocused && trimmedQuery.length >= 3 && prefixMatches.length > 0;
  const showDropdown = showSuggestedTags || showAutocomplete;

  const clearQuery = () => onQueryChange('');

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
        <div className="search-bar__input-wrap">
          <input
            id="skill-search"
            type="text"
            className={`search-bar__input${showClear ? ' search-bar__input--with-clear' : ''}`}
            placeholder="Search skills..."
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            autoComplete="off"
            aria-expanded={showDropdown}
            aria-controls="search-suggested-tags"
          />
          {showClear && (
            <button
              type="button"
              className="search-bar__clear"
              aria-label="Clear search"
              onMouseDown={(event) => event.preventDefault()}
              onClick={clearQuery}
            >
              ×
            </button>
          )}
        </div>
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
        {showAutocomplete && (
          <ul
            id="search-suggested-tags"
            className="search-bar__suggestions"
            aria-label="Matching tags"
          >
            {prefixMatches.map((tag) => (
              <li key={tag.id}>
                <button
                  type="button"
                  className="search-bar__suggestion"
                  onClick={() => onQueryChange(tag.name)}
                >
                  <HighlightedTagName name={tag.name} query={query} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default SearchBar;
