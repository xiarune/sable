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

export default function FandomIndex() {
  const navigate = useNavigate();

  const fandoms = React.useMemo(() => {
    const set = new Set();
    for (const w of works) set.add((w.fandom || "Other").trim() || "Other");
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, []);

  return (
    <div className="shelfPage">
      <div className="shelfBanner">
        <h1 className="shelfTitle">Fandom</h1>
      </div>

      <div className="shelfBody">
        <div className="cardGrid">
          {fandoms.map((f) => (
            <button
              key={f}
              type="button"
              className="topicCard"
              onClick={() => navigate(`/library/fandom/${slugify(f)}`)}
            >
              <div className="topicCardText">{f}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
