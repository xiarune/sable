import React from "react";
import { useNavigate } from "react-router-dom";
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

export default function GenreIndex() {
  const navigate = useNavigate();

  const genres = React.useMemo(() => {
    const set = new Set();
    for (const w of works) set.add((w.genre || "Other").trim() || "Other");
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, []);

  return (
    <div className="shelfPage">
      <div className="shelfBanner">
        <h1 className="shelfTitle">Genre</h1>
      </div>

      <div className="shelfBody">
        <div className="cardGrid">
          {genres.map((g) => (
            <button
              key={g}
              type="button"
              className="topicCard"
              onClick={() => navigate(`/library/genre/${slugify(g)}`)}
            >
              <div className="topicCardText">{g}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
