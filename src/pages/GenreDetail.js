import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { works } from "../data/libraryWorks";
import "./Library.css";

function slugify(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function groupByFirstLetter(items) {
  const map = new Map();

  for (const w of items) {
    const t = (w.title || "").trim();
    const letter = t ? t[0].toUpperCase() : "#";
    const key = /[A-Z]/.test(letter) ? letter : "#";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(w);
  }

  const groups = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  return groups.map(([letter, list]) => ({
    letter,
    items: list.slice().sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" })),
  }));
}

export default function GenreDetail() {
  const navigate = useNavigate();
  const { genreSlug } = useParams();

  const genreName = React.useMemo(() => {
    const allGenres = Array.from(new Set(works.map((w) => (w.genre || "Other").trim() || "Other")));
    const found = allGenres.find((g) => slugify(g) === genreSlug);
    return found || "Genre";
  }, [genreSlug]);

  const filtered = React.useMemo(() => {
    return works.filter((w) => slugify((w.genre || "Other").trim() || "Other") === genreSlug);
  }, [genreSlug]);

  const grouped = React.useMemo(() => groupByFirstLetter(filtered), [filtered]);

  function openWork(w) {
    if (!w?.id) return;
    navigate(`/works/${encodeURIComponent(w.id)}`);
  }

  return (
    <div className="shelfPage">
      <div className="shelfBanner">
        <h1 className="shelfTitle">{genreName}</h1>
      </div>

      <div className="shelfBody shelfBody--withSidebar">
        <aside className="leftFilters" aria-label="Filters">
          <div className="filterSearchWrap">
            <input className="filterSearch" placeholder={`Search ${genreName}...`} />
          </div>

          <label className="filterRow">
            <input type="checkbox" defaultChecked />
            <span>Trending</span>
          </label>
          <label className="filterRow">
            <input type="checkbox" defaultChecked />
            <span>Newest</span>
          </label>
          <label className="filterRow">
            <input type="checkbox" defaultChecked />
            <span>Oldest</span>
          </label>
          <label className="filterRow">
            <input type="checkbox" defaultChecked />
            <span>Text Only</span>
          </label>
          <label className="filterRow">
            <input type="checkbox" defaultChecked />
            <span>Completed</span>
          </label>
        </aside>

        <section className="shelfMain">
          {grouped.length === 0 ? (
            <div className="emptyNote">No works found in this genre yet.</div>
          ) : (
            grouped.map((g) => (
              <div key={g.letter} className="letterBlock">
                <div className="letterHeading">{g.letter}</div>

                <div className="workPills">
                  {g.items.map((w) => (
                    <button key={w.id} type="button" className="workPill" onClick={() => openWork(w)}>
                      {w.title}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}

