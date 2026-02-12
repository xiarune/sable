import api from "./client";

/**
 * Discovery API - Trending, Featured, Search, Genres, Fandoms, Tags
 */
const discoveryApi = {
  // Trending works
  trending: (period = "week", limit = 20) =>
    api.get(`/discovery/trending?period=${period}&limit=${limit}`),

  // Featured/staff picks
  featured: () => api.get("/discovery/featured"),

  // Newest works
  newest: (page = 1, limit = 20) =>
    api.get(`/discovery/new?page=${page}&limit=${limit}`),

  // Global search
  search: (query, type = "all", page = 1, limit = 20) =>
    api.get(`/discovery/search?q=${encodeURIComponent(query)}&type=${type}&page=${page}&limit=${limit}`),

  // Genres
  genres: () => api.get("/discovery/genres"),
  genre: (slug, page = 1, limit = 20, sort = "popular") =>
    api.get(`/discovery/genres/${slug}?page=${page}&limit=${limit}&sort=${sort}`),

  // Fandoms
  fandoms: (category, search, page = 1, limit = 50) => {
    const params = new URLSearchParams({ page, limit });
    if (category) params.append("category", category);
    if (search) params.append("search", search);
    return api.get(`/discovery/fandoms?${params}`);
  },
  fandom: (slug, page = 1, limit = 20, sort = "recent") =>
    api.get(`/discovery/fandoms/${slug}?page=${page}&limit=${limit}&sort=${sort}`),

  // Tags
  tags: (search, category, page = 1, limit = 50) => {
    const params = new URLSearchParams({ page, limit });
    if (search) params.append("search", search);
    if (category) params.append("category", category);
    return api.get(`/discovery/tags?${params}`);
  },
  tag: (slug, page = 1, limit = 20, sort = "recent") =>
    api.get(`/discovery/tags/${slug}?page=${page}&limit=${limit}&sort=${sort}`),

  // Sync genres, fandoms, and tags from existing works
  sync: () => api.post("/discovery/sync"),
};

export default discoveryApi;
