import { useState } from 'react';
import './SearchBar.css';

function SearchBar() {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="search-bar">
      <label htmlFor="skill-search" className="search-bar__label">
        Search skills
      </label>
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
      />
      <p className="search-bar__status" aria-live="polite">
        Query: “{query}” · Focused: {isFocused ? 'yes' : 'no'}
      </p>
    </div>
  );
}

export default SearchBar;
