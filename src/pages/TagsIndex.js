import React from "react";
import { useNavigate } from "react-router-dom";
import "./Library.css";

// trending tags
const TRENDING_TAGS = [
  "Hurt/Comfort",
  "Enemies to Lovers",
  "Slow Burn",
  "Canon Divergence",
  "Found Family",
  "Alternate Universe",
  "Canon Universe",
  "Redemption Arc",
  "Major Character Death",
  "Mutual Pining",
  "Forbidden Romance",
  "Post-Canon Relationship",
  "Reincarnation",
  "Violence",
  "Trauma",
  "Blood and Injury",
  "Domestic",
  "Emotional Healing",
  "Time Loop",
  "Amnesia",
  "Fluff",
  "One Shot",
  "Miscommunication",
  "Friendship",
];

function groupByFirstLetter(items) {
  const map = new Map();

  for (const t of items) {
    const s = (t || "").trim();
    const letter = s ? s[0].toUpperCase() : "#";
    const key = /[A-Z]/.test(letter) ? letter : "#";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
  }

  const groups = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  return groups.map(([letter, list]) => ({
    letter,
    items: Array.from(new Set(list)).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    ),
  }));
}

export default function TagsIndex() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");

  const filteredTags = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return TRENDING_TAGS;
    return TRENDING_TAGS.filter((t) => t.toLowerCase().includes(q));
  }, [search]);

  const grouped = React.useMemo(() => groupByFirstLetter(filteredTags), [filteredTags]);

  function openTag(tag) {
    // Sends user to Search page and queries the tag
    navigate(`/search?q=${encodeURIComponent(tag)}`);
  }

  return (
    <div className="shelfPage">
      <div className="shelfBanner">
        <h1 className="shelfTitle">Tags</h1>
      </div>

      <div className="shelfBody shelfBody--withSidebar">
        <aside className="leftFilters" aria-label="Filters">
          <div className="filterSearchWrap">
            <input
              className="filterSearch"
              placeholder="Search Tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search tags"
            />
          </div>

          {/* Visual only filters to match genre/fandom */}
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
          <h2 className="letterHeading" style={{ marginTop: 0 }}>
            Trending Tags
          </h2>

          <div className="workPills" style={{ marginBottom: 22 }}>
            {filteredTags.map((tag) => (
              <button key={tag} type="button" className="workPill" onClick={() => openTag(tag)}>
                {tag}
              </button>
            ))}
          </div>

          {/* Optional: letter-group view under the trending block (keeps consistency w/ Romance layout) */}
          {grouped.map((g) => (
            <div key={g.letter} className="letterBlock">
              <div className="letterHeading">{g.letter}</div>

              <div className="workPills">
                {g.items.map((tag) => (
                  <button key={tag} type="button" className="workPill" onClick={() => openTag(tag)}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}


