const initialState = {
  // Search Bar
  mode: 'learner', // 'learner' (browsing teachers) | 'teacher' (browsing requests)
  query: '',
  selectedTag: null,

  // Filters
  barterOnly: false,
  category: 'all',
  experienceLevel: 'all',
  modality: 'all', // 'all' | 'remote' | 'in_person'
  language: 'all',
  maxDistance: 25,

  // Presentation & UI
  sortBy: 'relevance', // 'relevance' | 'rating' | 'trades' | 'distance'
  viewMode: 'grid', // 'grid' | 'list'
};