import React from "react";
import { useNavigate } from "react-router-dom";
import { discoveryApi } from "../api";
import { SableLoader, DropCapTitle, BrowseOrnament } from "../components";
import "./Library.css";

function groupByFirstLetter(items) {
  const map = new Map();

  for (const t of items) {
    const name = t.name || t;
    const s = (name || "").trim();
    const letter = s ? s[0].toUpperCase() : "#";
    const key = /[A-Z]/.test(letter) ? letter : "#";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(t);
  }

  const groups = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  return groups.map(([letter, list]) => ({
    letter,
    items: list.sort((a, b) => {
      const nameA = a.name || a;
      const nameB = b.name || b;
      return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
    }),
  }));
}

export default function TagsIndex() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [tags, setTags] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadTags() {
      try {
        const data = await discoveryApi.tags(search || null);
        setTags(data.tags || []);
      } catch (err) {
        console.error("Failed to load tags:", err);
      } finally {
        setLoading(false);
      }
    }
    loadTags();
  }, [search]);

  const grouped = React.useMemo(() => groupByFirstLetter(tags), [tags]);

  function openTag(tag) {
    const slug = tag.slug || tag.name || tag;
    navigate(`/tags/${encodeURIComponent(slug)}`);
  }

  if (loading) {
    return (
      <div className="shelfPage">
        <div className="shelfBanner">
          <BrowseOrnament />
          <DropCapTitle title="Tags" variant="banner" />
        </div>
        <SableLoader />
      </div>
    );
  }

  return (
    <div className="shelfPage">
      <div className="shelfBanner">
        <BrowseOrnament />
        <DropCapTitle title="Tags" variant="banner" />
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
            <span>Most Used</span>
          </label>
          <label className="filterRow">
            <input type="checkbox" />
            <span>Newest</span>
          </label>
        </aside>

        <section className="shelfMain">
          {tags.length === 0 ? (
            <p className="emptyNote">No tags yet. Publish a work with tags to create the first ones.</p>
          ) : (
            <>
              <h2 className="letterHeading" style={{ marginTop: 0 }}>
                Popular Tags
              </h2>

              <div className="workPills" style={{ marginBottom: 22 }}>
                {tags.slice(0, 20).map((tag) => (
                  <button key={tag.slug || tag.name} type="button" className="workPill" onClick={() => openTag(tag)}>
                    {tag.name} ({tag.usageCount || 0})
                  </button>
                ))}
              </div>

              {/* Letter-group view */}
              {grouped.map((g) => (
                <div key={g.letter} className="letterBlock">
                  <div className="letterHeading">{g.letter}</div>

                  <div className="workPills">
                    {g.items.map((tag) => (
                      <button key={tag.slug || tag.name} type="button" className="workPill" onClick={() => openTag(tag)}>
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
