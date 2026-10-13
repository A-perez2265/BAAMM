import { useState } from 'react';
import { getPrefixMatchedTags } from '../../services/discoveryService';
import './SearchBar.css';

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

function SearchBar({ query, onQueryChange, suggestionTags = [] }) {
  const [isFocused, setIsFocused] = useState(false);
  const [menuDismissed, setMenuDismissed] = useState(false);

  const trimmedQuery = query.trim();
  const showClear = query.length > 0;
  const prefixMatches = getPrefixMatchedTags(suggestionTags, query);
  const showSuggestedTags =
    isFocused && !menuDismissed && trimmedQuery === '' && suggestionTags.length > 0;
  const showAutocomplete =
    isFocused && !menuDismissed && trimmedQuery.length >= 3 && prefixMatches.length > 0;
  const showDropdown = showSuggestedTags || showAutocomplete;

  const updateQuery = (value) => {
    setMenuDismissed(false);
    onQueryChange(value);
  };

  const clearQuery = () => updateQuery('');
  const keepInputFocused = (event) => event.preventDefault();
  const selectTag = (name) => {
    onQueryChange(name);
    setMenuDismissed(true);
  };

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
            onChange={(event) => updateQuery(event.target.value)}
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
            {suggestionTags.map((tag) => (
              <li key={tag.id}>
                <button
                  type="button"
                  className="search-bar__suggestion"
                  onMouseDown={keepInputFocused}
                  onClick={() => selectTag(tag.name)}
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
                  onMouseDown={keepInputFocused}
                  onClick={() => selectTag(tag.name)}
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
