import React from "react";
import { Link } from "react-router-dom";
import { works } from "../data/libraryWorks";
import "./Library.css";

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function FandomIndex() {
  const fandoms = React.useMemo(() => {
    const set = new Set();
    works.forEach((w) => {
      const f = (w.fandom || "").trim();
      if (f) set.add(f);
    });
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
            <Link key={f} className="topicCard" to={`/fandoms/${slugify(f)}`}>
              <div className="topicCardText">{f}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}


