import SearchBar from '../components/search/SearchBar';

function SearchPage() {
  return (
    <main className="search-page">
      <h1>Search</h1>
      <p>Type in the bar and click away to see query and focus update. Suggestions come next.</p>
      <SearchBar />
    </main>
  );
}

export default SearchPage;
