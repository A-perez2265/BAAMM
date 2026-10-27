import { useEffect, useState } from 'react';
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
  const [activeIndex, setActiveIndex] = useState(-1);
  const [highlightMenuKey, setHighlightMenuKey] = useState('closed');

  const trimmedQuery = query.trim();
  const showClear = query.length > 0;
  const prefixMatches = getPrefixMatchedTags(suggestionTags, query);
  const showSuggestedTags =
    isFocused && !menuDismissed && trimmedQuery === '' && suggestionTags.length > 0;
  const showAutocomplete =
    isFocused && !menuDismissed && trimmedQuery.length >= 3 && prefixMatches.length > 0;
  const showDropdown = showSuggestedTags || showAutocomplete;
  const visibleTags = showSuggestedTags ? suggestionTags : showAutocomplete ? prefixMatches : [];
  const menuKey = showSuggestedTags
    ? `suggested:${suggestionTags.map((tag) => tag.id).join('|')}`
    : showAutocomplete
      ? `auto:${trimmedQuery}:${prefixMatches.map((tag) => tag.id).join('|')}`
      : 'closed';

  if (highlightMenuKey !== menuKey) {
    setHighlightMenuKey(menuKey);
    setActiveIndex(-1);
  }

  const activeTagId =
    activeIndex >= 0 && visibleTags[activeIndex]
      ? visibleTags[activeIndex].id
      : null;

  useEffect(() => {
    if (!activeTagId) {
      return;
    }

    document
      .getElementById(`search-tag-${activeTagId}`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeTagId]);

  const updateQuery = (value) => {
    setMenuDismissed(false);
    onQueryChange(value);
  };

  const clearQuery = () => updateQuery('');
  const keepInputFocused = (event) => event.preventDefault();
  const selectTag = (name) => {
    onQueryChange(name);
    setMenuDismissed(true);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setMenuDismissed(true);
      setActiveIndex(-1);
      return;
    }

    if (!showDropdown || visibleTags.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) =>
        current < visibleTags.length - 1 ? current + 1 : 0
      );
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) =>
        current <= 0 ? visibleTags.length - 1 : current - 1
      );
      return;
    }

    if (event.key === 'Enter' && activeIndex >= 0 && visibleTags[activeIndex]) {
      event.preventDefault();
      selectTag(visibleTags[activeIndex].name);
    }
  };

  const activeOptionId =
    activeIndex >= 0 && visibleTags[activeIndex]
      ? `search-tag-${visibleTags[activeIndex].id}`
      : undefined;

  return (
    <div className="search-bar">
      <label htmlFor="skill-search" className="search-bar__label">
        Search skills
      </label>
      <div
        className="search-bar__field"
        onFocus={() => setIsFocused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setIsFocused(false);
            setActiveIndex(-1);
          }
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
            onKeyDown={handleKeyDown}
            autoComplete="off"
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls="search-suggested-tags"
            aria-activedescendant={activeOptionId}
            aria-autocomplete="list"
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
            role="listbox"
            aria-label="Popular tags"
          >
            {suggestionTags.map((tag, index) => (
              <li key={tag.id} role="presentation">
                <button
                  type="button"
                  id={`search-tag-${tag.id}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  className={`search-bar__suggestion${index === activeIndex ? ' search-bar__suggestion--active' : ''}`}
                  onMouseDown={keepInputFocused}
                  onMouseEnter={() => setActiveIndex(index)}
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
            role="listbox"
            aria-label="Matching tags"
          >
            {prefixMatches.map((tag, index) => (
              <li key={tag.id} role="presentation">
                <button
                  type="button"
                  id={`search-tag-${tag.id}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  className={`search-bar__suggestion${index === activeIndex ? ' search-bar__suggestion--active' : ''}`}
                  onMouseDown={keepInputFocused}
                  onMouseEnter={() => setActiveIndex(index)}
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
