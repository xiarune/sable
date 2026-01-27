import React from "react";
import { useParams } from "react-router-dom";
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

export default function FandomDetail() {
  const { fandomSlug } = useParams();

  const fandomName = React.useMemo(() => {
    const all = Array.from(new Set(works.map((w) => (w.fandom || "Other").trim() || "Other")));
    const found = all.find((f) => slugify(f) === fandomSlug);
    return found || "Fandom";
  }, [fandomSlug]);

  const filtered = React.useMemo(() => {
    return works.filter((w) => slugify((w.fandom || "Other").trim() || "Other") === fandomSlug);
  }, [fandomSlug]);

  const grouped = React.useMemo(() => groupByFirstLetter(filtered), [filtered]);

  return (
    <div className="shelfPage">
      <div className="shelfBanner">
        <h1 className="shelfTitle">{fandomName}</h1>
      </div>

      <div className="shelfBody shelfBody--withSidebar">
        <aside className="leftFilters" aria-label="Filters">
          <div className="filterSearchWrap">
            <input className="filterSearch" placeholder={`Search ${fandomName}...`} />
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
            <div className="emptyNote">No works found in this fandom yet.</div>
          ) : (
            grouped.map((g) => (
              <div key={g.letter} className="letterBlock">
                <div className="letterHeading">{g.letter}</div>

                <div className="workPills">
                  {g.items.map((w) => (
                    <button key={w.id} type="button" className="workPill">
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
