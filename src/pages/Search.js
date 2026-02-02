// src/pages/Search.js
import React from "react";
import { useSearchParams } from "react-router-dom";
import { works } from "../data/libraryWorks";
import "./Search.css";

export default function Search() {
  const [params, setParams] = useSearchParams();

  const urlQuery = (params.get("q") || "").trim();
  const [input, setInput] = React.useState(urlQuery);

  // Keep input synced when navigating to /search?q=... (Navbar, tags, back button, etc.)
  React.useEffect(() => {
    setInput(urlQuery);
  }, [urlQuery]);

  function normalize(s) {
    return String(s || "").toLowerCase();
  }

  const hasQuery = Boolean(input.trim());

  const filtered = React.useMemo(() => {
    const q = normalize(input).trim();
    if (!q) return [];

    return works.filter((w) => {
      const hay = [
        w.title,
        w.author,
        w.genre,
        w.fandom,
        w.language,
        w.wordCount,
        w.views,
        w.keywords,
        Array.isArray(w.tags) ? w.tags.join(" ") : "",
      ]
        .filter(Boolean)
        .join(" ");

      return normalize(hay).includes(q);
    });
  }, [input]);

  function submitSearch(e) {
    e.preventDefault();
    const q = input.trim();

    if (!q) {
      setParams({});
      return;
    }

    setParams({ q });
  }

  function clearSearch() {
    setInput("");
    setParams({});
  }

  return (
    <div className="searchPage">
      <div className="searchWrap">
        <header className="searchHeader" aria-label="Search header">
          <div className="searchTitleBlock">
            <h1 className="searchTitle">SEARCH RESULTS FOR:</h1>
            <div className="searchQuery" title={input.trim() || ""}>
              {hasQuery ? input.trim() : "Type a title, author, genre, fandom, or keyword."}
            </div>
          </div>

          <form className="searchBar" role="search" aria-label="Search works" onSubmit={submitSearch}>
            <input
              className="searchInput"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search your library..."
              aria-label="Search your library"
            />
            <button type="submit" className="searchBtn">
              Search
            </button>

            {hasQuery ? (
              <button
                type="button"
                className="searchBtn"
                onClick={clearSearch}
                aria-label="Clear search"
                title="Clear"
              >
                Clear
              </button>
            ) : null}
          </form>
        </header>

        <main className="searchMain" aria-label="Search results">
          {!hasQuery ? (
            <div className="searchEmptyState" role="status" aria-live="polite">
              <div className="searchEmptyTitle">Search your library.</div>
              <div className="searchEmptySub">
                Start typing above, then hit <span className="searchEm">Search</span>.
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="searchEmptyState" role="status" aria-live="polite">
              <div className="searchEmptyTitle">No results found.</div>
              <div className="searchEmptySub">
                Try a different keyword, or search by <span className="searchEm">author</span>,{" "}
                <span className="searchEm">genre</span>, or <span className="searchEm">fandom</span>.
              </div>
            </div>
          ) : (
            <div className="searchResultsList" aria-label="Results list">
              {filtered.map((w) => (
                <div
                  key={w.id}
                  className="searchResultCard"
                  aria-label={`Result: ${w.title || "Title"}`}
                >
                  <div className="searchResultLeft">
                    <div className="searchResultTitle">{w.title || "Title"}</div>
                    <div className="searchResultAuthor">{w.author || "Author"}</div>
                  </div>

                  <div className="searchResultRight" aria-label="Work metadata">
                    <div className="searchMetaRow">
                      <div className="searchMetaLabel">Language:</div>
                      <div className="searchMetaValue">{w.language || "—"}</div>
                    </div>
                    <div className="searchMetaRow">
                      <div className="searchMetaLabel">Word Count:</div>
                      <div className="searchMetaValue">{w.wordCount || "—"}</div>
                    </div>
                    <div className="searchMetaRow">
                      <div className="searchMetaLabel">Views:</div>
                      <div className="searchMetaValue">{w.views || "—"}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}







