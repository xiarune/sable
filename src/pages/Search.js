// src/pages/Search.js
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { works } from "../data/libraryWorks";
import "./Search.css";

function useQueryParam(name) {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search).get(name) || "", [search, name]);
}

function normalize(s) {
  return String(s || "").trim().toLowerCase();
}

function includesLoose(haystack, needle) {
  const h = normalize(haystack);
  const n = normalize(needle);
  if (!n) return true;
  return h.includes(n);
}

// Front-end-only mock metadata to make cards feel “real”
function mockMetaFor(work) {
  const base = normalize(work.title || "");
  const seed = Array.from(base).reduce((acc, ch) => acc + ch.charCodeAt(0), 0) || 123;

  // Stable-ish values per title (no backend)
  const languages = ["English", "Latin", "Japanese", "French", "Spanish"];
  const language = languages[seed % languages.length];

  const wordCount = 1200 + (seed % 95000); // 1.2k – 96.2k
  const views = 50 + (seed % 250000); // 50 – 250,050

  return {
    language,
    wordCount,
    views,
  };
}

export default function Search() {
  const navigate = useNavigate();

  // URL: /search?q=...
  const q = useQueryParam("q");
  const [input, setInput] = React.useState(q);

  // Keep input synced if user navigates back/forward
  React.useEffect(() => {
    setInput(q);
  }, [q]);

  const results = React.useMemo(() => {
    const term = normalize(q);
    if (!term) return [];

    // Match across title, author, genre, fandom
    return works
      .filter((w) => {
        return (
          includesLoose(w.title, term) ||
          includesLoose(w.author, term) ||
          includesLoose(w.genre, term) ||
          includesLoose(w.fandom, term)
        );
      })
      .slice()
      .sort((a, b) => (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" }));
  }, [q]);

  function submitSearch(e) {
    e.preventDefault();
    const next = (input || "").trim();
    navigate(next ? `/search?q=${encodeURIComponent(next)}` : "/search");
  }

  return (
    <div className="searchPage">
      <div className="searchWrap">
        <header className="searchHeader">
          <div className="searchTitleBlock">
            <h1 className="searchTitle">Search Results for:</h1>
            <div className="searchQuery">{q ? q : "—"}</div>
          </div>

          {/* Front-end-only search bar on the page (optional but useful) */}
          <form className="searchBar" onSubmit={submitSearch} aria-label="Search">
            <input
              className="searchInput"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search by title, author, genre, fandom..."
              aria-label="Search query"
            />
            <button className="searchBtn" type="submit">
              Search
            </button>
          </form>
        </header>

        <main className="searchMain" aria-label="Search results">
          {!q ? (
            <div className="searchEmptyState">
              <div className="searchEmptyTitle">Type something to search.</div>
              <div className="searchEmptySub">
                Try a title (e.g. <span className="searchEm">Aetherfall</span>) or a fandom (e.g.{" "}
                <span className="searchEm">Anime</span>).
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="searchEmptyState">
              <div className="searchEmptyTitle">No results found.</div>
              <div className="searchEmptySub">
                Try a different keyword, or search by <span className="searchEm">author</span>,{" "}
                <span className="searchEm">genre</span>, or <span className="searchEm">fandom</span>.
              </div>
            </div>
          ) : (
            <section className="searchResultsList" aria-label="Results list">
              {results.map((w) => {
                const meta = mockMetaFor(w);
                return (
                  <button
                    key={w.id}
                    type="button"
                    className="searchResultCard"
                    onClick={() => {
                      // front-end only: later route to /works/:id or open modal
                      // for now, just no-op or console
                      // console.log("Open work", w.id);
                    }}
                    aria-label={`Open ${w.title} by ${w.author}`}
                  >
                    <div className="searchResultLeft">
                      <div className="searchResultTitle">{w.title}</div>
                      <div className="searchResultAuthor">{w.author}</div>
                    </div>

                    <div className="searchResultRight" aria-label="Work metadata">
                      <div className="searchMetaRow">
                        <span className="searchMetaLabel">Language:</span>
                        <span className="searchMetaValue">{meta.language}</span>
                      </div>
                      <div className="searchMetaRow">
                        <span className="searchMetaLabel">Word Count:</span>
                        <span className="searchMetaValue">{meta.wordCount.toLocaleString()}</span>
                      </div>
                      <div className="searchMetaRow">
                        <span className="searchMetaLabel">Views:</span>
                        <span className="searchMetaValue">{meta.views.toLocaleString()}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

