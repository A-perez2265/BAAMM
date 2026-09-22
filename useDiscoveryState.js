export const initialDiscoveryState = {
  // Search Bar
  mode: 'learner', // 'learner' (browsing teachers) | 'teacher' (browsing requests)
  query: '',
  selectedTagId: null,

  // Filters
  barterOnly: false,
  category: 'all',
  experienceLevel: 'all',
  modality: 'all', // 'all' | 'Remote' | 'In-Person'
  language: 'all',
  maxDistance: 25,

  // Presentation & UI
  sortBy: 'relevance', // 'relevance' | 'rating' | 'trades' | 'distance'
  viewMode: 'grid', // 'grid' | 'list'
};

export function clearQuery(prev) {
  return { ...prev, query: '', selectedTagId: null };
}

export function resetFilters(prev) {
  return {
    ...prev,
    barterOnly: false,
    category: 'all',
    experienceLevel: 'all',
    modality: 'all',
    language: 'all',
    maxDistance: 25,
    // Retains user's query, mode, sortBy, and viewMode
  };
}
