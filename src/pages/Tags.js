import React from "react";
import { useNavigate } from "react-router-dom";
import "./Tags.css";

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

export default function Tags() {
  const navigate = useNavigate();

  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState("trending"); // trending | newest | oldest
  const [textOnly, setTextOnly] = React.useState(false);
  const [completed, setCompleted] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    const base = q ? TRENDING_TAGS.filter((t) => t.toLowerCase().includes(q)) : TRENDING_TAGS.slice();

    if (sort === "newest") return base.slice().reverse();
    if (sort === "oldest") return base.slice();
    return base;
  }, [search, sort]);

  function openTag(tag) {
    navigate(`/search?q=${encodeURIComponent(tag)}`);
  }

  return (
    <div className="tg">
      <header className="tg-banner" aria-label="Tags header">
        <div className="tg-bannerInner">
          <span className="tg-orn tg-orn--left" aria-hidden="true">❦</span>
          <h1 className="tg-bannerTitle">Tags</h1>
          <span className="tg-orn tg-orn--right" aria-hidden="true">❦</span>
        </div>
      </header>

      <div className="tg-shell">
        <div className="tg-grid">
          <aside className="tg-left" aria-label="Tag filters">
            <div className="tg-leftCard">
              <input
                className="tg-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Tags..."
                aria-label="Search tags"
              />

              <div className="tg-filters" aria-label="Filters">
                <label className="tg-check">
                  <input type="checkbox" checked={sort === "trending"} onChange={() => setSort("trending")} />
                  <span>Trending</span>
                </label>

                <label className="tg-check">
                  <input type="checkbox" checked={sort === "newest"} onChange={() => setSort("newest")} />
                  <span>Newest</span>
                </label>

                <label className="tg-check">
                  <input type="checkbox" checked={sort === "oldest"} onChange={() => setSort("oldest")} />
                  <span>Oldest</span>
                </label>

                <label className="tg-check">
                  <input type="checkbox" checked={textOnly} onChange={() => setTextOnly((v) => !v)} />
                  <span>Text Only</span>
                </label>

                <label className="tg-check">
                  <input type="checkbox" checked={completed} onChange={() => setCompleted((v) => !v)} />
                  <span>Completed</span>
                </label>

                <div className="tg-leftNote">Filters are UI-only placeholders for now.</div>
              </div>
            </div>
          </aside>

          <main className="tg-main" aria-label="Trending tags">
            <h2 className="tg-sectionTitle">TRENDING TAGS</h2>

            {filtered.length === 0 ? (
              <div className="tg-empty" role="status">
                No tags found for <span className="tg-em">{search}</span>.
              </div>
            ) : (
              <div className="tg-tagsGrid" role="list" aria-label="Tag list">
                {filtered.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="tg-pill"
                    onClick={() => openTag(tag)}
                    role="listitem"
                    aria-label={`Open tag ${tag}`}
                    title={`Search: ${tag}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

