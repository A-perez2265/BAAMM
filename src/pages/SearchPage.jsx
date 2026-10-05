import SearchBar from '../components/search/SearchBar';

function SearchPage() {
  return (
    <main className="search-page">
      <h1>Search</h1>
      <p>Click the empty bar to see popular tags. Typing hides them. Choosing a tag comes later.</p>
      <SearchBar />
    </main>
  );
}

export default SearchPage;
