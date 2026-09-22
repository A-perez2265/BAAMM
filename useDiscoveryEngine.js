import { useState, useMemo } from 'react';
import {
  initialDiscoveryState,
  clearQuery as clearQueryState,
  resetFilters,
} from './useDiscoveryState';

export function useDiscoveryEngine({ initialListings = [], currentUser = null }) {
  // Central State Object / Memory Box for Search & Filter Parameters
  const [searchState, setSearchState] = useState(initialDiscoveryState);

  // State update handlers "Remote Controllers" for the searchState object
  const updateFilter = (key, value) => {
    setSearchState((prev) => ({ ...prev, [key]: value }));
  };

  const setMode = (newMode) => {
    setSearchState((prev) => ({ ...prev, mode: newMode }));
  };

  const clearQuery = () => {
    setSearchState(clearQueryState);
  };

  const resetAllFilters = () => {
    setSearchState(resetFilters);
  };

  // 2. Client-Side Filtering & Sorting Pipeline
  const filteredResults = useMemo(() => {
    return initialListings
      .filter((item) => {
        // --- Mode Filter ---
        // Learner searches for teachers ('teach'); Teacher searches for requests ('learn')
        const targetType = searchState.mode === 'learner' ? 'teach' : 'learn';
        if (item.type !== targetType) return false;

        // --- Barter Compatibility Filter ---
        if (searchState.barterOnly) {
          // If no user or no offered skills, barter matching fails
          if (!currentUser || !currentUser.skillsOffered || currentUser.skillsOffered.length === 0) {
            return false;
          }
          // Check if teacher's wishlist intersects with what currentUser can teach
          const hasBarterOverlap = item.wantsInReturnTagIds?.some((tagId) =>
            currentUser.skillsOffered.includes(tagId)
          );
          if (!hasBarterOverlap) return false;
        }

        // --- Text Query & Tag Filter ---
        if (searchState.selectedTagId) {
          if (!item.tagIds.includes(searchState.selectedTagId)) return false;
        } else if (searchState.query.trim().length > 0) {
          const cleanQuery = searchState.query.toLowerCase().trim();
          const matchesTitle = item.skillTitle.toLowerCase().includes(cleanQuery);
          const matchesDescription = item.description.toLowerCase().includes(cleanQuery);
          const matchesCategory = item.category.toLowerCase().includes(cleanQuery);
          if (!matchesTitle && !matchesDescription && !matchesCategory) return false;
        }

        // --- Standard Multi-Faceted Filters ---
        if (searchState.category !== 'all' && item.category !== searchState.category) {
          return false;
        }
        if (searchState.experienceLevel !== 'all' && item.experienceLevel !== searchState.experienceLevel) {
          return false;
        }
        if (searchState.modality !== 'all' && item.modality !== searchState.modality) {
          return false;
        }
        if (searchState.language !== 'all' && item.language !== searchState.language) {
          return false;
        }
        if (
          item.modality === 'In-Person' &&
          item.location?.distanceMiles > searchState.maxDistance
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        // --- Sorting Engine ---
        if (searchState.sortBy === 'rating') {
          return b.rating - a.rating; // Descending
        }
        if (searchState.sortBy === 'trades') {
          return b.tradesCompleted - a.tradesCompleted; // Descending
        }
        if (searchState.sortBy === 'distance') {
          return (a.location?.distanceMiles || 0) - (b.location?.distanceMiles || 0); // Ascending
        }
        return 0; // 'relevance' maintains matching array order
      });
  }, [initialListings, searchState, currentUser]);

  return {
    searchState,
    filteredResults,
    updateFilter,
    setMode,
    clearQuery,
    resetAllFilters,
  };
}