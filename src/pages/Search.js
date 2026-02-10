import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { discoveryApi } from "../api";
import "./Search.css";
import defaultCover from "../assets/images/sable_default_cover.png";

export default function Search() {
  const [params, setParams] = useSearchParams();

  const urlQuery = (params.get("q") || "").trim();
  const urlType = params.get("type") || "all";

  const [input, setInput] = React.useState(urlQuery);
  const [searchType, setSearchType] = React.useState(urlType);
  const [results, setResults] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  // Perform search when URL query changes
  React.useEffect(() => {
    setInput(urlQuery);
    if (urlQuery.length >= 2) {
      performSearch(urlQuery, urlType);
    } else {
      setResults(null);
    }
  }, [urlQuery, urlType]);

  async function performSearch(query, type) {
    if (query.length < 2) return;

    setLoading(true);
    try {
      const data = await discoveryApi.search(query, type);
      setResults(data.results);
    } catch (err) {
      console.error("Search failed:", err);
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  function submitSearch(e) {
    e.preventDefault();
    const q = input.trim();

    if (!q || q.length < 2) {
      setParams({});
      setResults(null);
      return;
    }

    setParams({ q, type: searchType });
  }

  function clearSearch() {
    setInput("");
    setParams({});
    setResults(null);
  }

  const hasQuery = urlQuery.length >= 2;
  const hasResults = results && (
    (results.works?.items?.length > 0) ||
    (results.users?.items?.length > 0) ||
    (results.fandoms?.items?.length > 0) ||
    (results.tags?.items?.length > 0)
  );

  return (
    <div className="searchPage">
      <div className="searchWrap">
        <header className="searchHeader" aria-label="Search header">
          <div className="searchTitleBlock">
            <h1 className="searchTitle">Search Results For:</h1>
            <div className="searchQuery" title={urlQuery || ""}>
              {hasQuery ? urlQuery : "Type a title, author, genre, fandom, or keyword."}
            </div>
          </div>

          <form className="searchBar" role="search" aria-label="Search works" onSubmit={submitSearch}>
            <input
              className="searchInput"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search Sable... (min 2 characters)"
              aria-label="Search Sable"
              minLength={2}
            />

            <select
              className="searchTypeSelect"
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              aria-label="Search type"
            >
              <option value="all">All</option>
              <option value="works">Works</option>
              <option value="users">Users</option>
              <option value="fandoms">Fandoms</option>
              <option value="tags">Tags</option>
            </select>

            <button type="submit" className="searchBtn" disabled={loading}>
              {loading ? "..." : "Search"}
            </button>

            {hasQuery && (
              <button
                type="button"
                className="searchBtn"
                onClick={clearSearch}
                aria-label="Clear search"
                title="Clear"
              >
                Clear
              </button>
            )}
          </form>
        </header>

        <main className="searchMain" aria-label="Search results">
          {loading ? (
            <div className="searchEmptyState" role="status" aria-live="polite">
              <div className="searchEmptyTitle">Searching...</div>
            </div>
          ) : !hasQuery ? (
            <div className="searchEmptyState" role="status" aria-live="polite">
              <div className="searchEmptyTitle">Search Sable.</div>
              <div className="searchEmptySub">
                Enter at least 2 characters, then hit <span className="searchEm">Search</span>.
              </div>
            </div>
          ) : !hasResults ? (
            <div className="searchEmptyState" role="status" aria-live="polite">
              <div className="searchEmptyTitle">No results found.</div>
              <div className="searchEmptySub">
                Try a different keyword, or search by <span className="searchEm">author</span>,{" "}
                <span className="searchEm">genre</span>, or <span className="searchEm">fandom</span>.
              </div>
            </div>
          ) : (
            <div className="searchResultsList" aria-label="Results list">
              {/* Works */}
              {results.works?.items?.length > 0 && (
                <div className="searchSection">
                  <h2 className="searchSectionTitle">Works ({results.works.total})</h2>
                  {results.works.items.map((w) => (
                    <div key={w._id} className="searchResultCard searchResultCard--work" aria-label={`Result: ${w.title}`}>
                      <Link to={`/works/${w._id}`} className="searchResultCover">
                        <img
                          src={w.coverImageUrl || defaultCover}
                          alt=""
                          className="searchResultCoverImg"
                        />
                      </Link>
                      <div className="searchResultLeft">
                        <Link
                          to={`/works/${w._id}`}
                          className="searchResultTitle"
                          style={{ color: "inherit", textDecoration: "none" }}
                        >
                          {w.title || "Untitled"}
                        </Link>
                        <div className="searchResultAuthor">
                          by <Link to={`/communities/${encodeURIComponent(w.authorUsername || "unknown")}`} className="searchAuthorLink">{w.authorUsername || "Unknown"}</Link>
                        </div>
                      </div>
                      <div className="searchResultRight">
                        <div className="searchMetaRow">
                          <div className="searchMetaLabel">Genre:</div>
                          <div className="searchMetaValue">{w.genre || "—"}</div>
                        </div>
                        <div className="searchMetaRow">
                          <div className="searchMetaLabel">Views:</div>
                          <div className="searchMetaValue">{w.stats?.viewCount || 0}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Users */}
              {results.users?.items?.length > 0 && (
                <div className="searchSection">
                  <h2 className="searchSectionTitle">Users ({results.users.total})</h2>
                  {results.users.items.map((u) => (
                    <div key={u._id} className="searchResultCard" aria-label={`User: ${u.username}`}>
                      <div className="searchResultLeft">
                        <Link
                          to={`/communities/${u.username}`}
                          className="searchResultTitle"
                          style={{ color: "inherit", textDecoration: "none" }}
                        >
                          {u.displayName || u.username}
                        </Link>
                        <div className="searchResultAuthor">@{u.username}</div>
                      </div>
                      <div className="searchResultRight">
                        <div className="searchMetaRow">
                          <div className="searchMetaLabel">Followers:</div>
                          <div className="searchMetaValue">{u.stats?.followersCount || 0}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Fandoms */}
              {results.fandoms?.items?.length > 0 && (
                <div className="searchSection">
                  <h2 className="searchSectionTitle">Fandoms ({results.fandoms.total})</h2>
                  {results.fandoms.items.map((f) => (
                    <div key={f._id} className="searchResultCard" aria-label={`Fandom: ${f.name}`}>
                      <div className="searchResultLeft">
                        <Link
                          to={`/fandoms/${f.slug}`}
                          className="searchResultTitle"
                          style={{ color: "inherit", textDecoration: "none" }}
                        >
                          {f.name}
                        </Link>
                        <div className="searchResultAuthor">{f.category}</div>
                      </div>
                      <div className="searchResultRight">
                        <div className="searchMetaRow">
                          <div className="searchMetaLabel">Works:</div>
                          <div className="searchMetaValue">{f.workCount || 0}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tags */}
              {results.tags?.items?.length > 0 && (
                <div className="searchSection">
                  <h2 className="searchSectionTitle">Tags ({results.tags.total})</h2>
                  {results.tags.items.map((t) => (
                    <div key={t._id} className="searchResultCard" aria-label={`Tag: ${t.name}`}>
                      <div className="searchResultLeft">
                        <Link
                          to={`/tags/${t.slug}`}
                          className="searchResultTitle"
                          style={{ color: "inherit", textDecoration: "none" }}
                        >
                          #{t.name}
                        </Link>
                        <div className="searchResultAuthor">{t.category}</div>
                      </div>
                      <div className="searchResultRight">
                        <div className="searchMetaRow">
                          <div className="searchMetaLabel">Used:</div>
                          <div className="searchMetaValue">{t.usageCount || 0} times</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
