import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { discoveryApi } from "../api";
import "./Library.css";
import defaultCover from "../assets/images/sable_default_cover.png";

export default function TagDetail() {
  const navigate = useNavigate();
  const { tagSlug } = useParams();

  const [tag, setTag] = React.useState(null);
  const [works, setWorks] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [sort, setSort] = React.useState("recent");
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    async function loadTag() {
      setLoading(true);
      setError(null);
      try {
        const data = await discoveryApi.tag(tagSlug, 1, 100, sort);
        setTag(data.tag);
        setWorks(data.works || []);
      } catch (err) {
        console.error("Failed to load tag:", err);
        setError(err.message || "Failed to load tag");
      } finally {
        setLoading(false);
      }
    }
    loadTag();
  }, [tagSlug, sort]);

  // Filter works by search
  const filteredWorks = React.useMemo(() => {
    if (!search.trim()) return works;
    const q = search.toLowerCase();
    return works.filter(
      (w) =>
        w.title?.toLowerCase().includes(q) ||
        w.authorUsername?.toLowerCase().includes(q)
    );
  }, [works, search]);

  if (loading) {
    return (
      <div className="shelfPage">
        <div className="shelfBanner">
          <h1 className="shelfTitle">Loading...</h1>
        </div>
        <div className="shelfBody">
          <p>Loading tag...</p>
        </div>
      </div>
    );
  }

  if (error || !tag) {
    return (
      <div className="shelfPage">
        <div className="shelfBanner">
          <h1 className="shelfTitle">Tag Not Found</h1>
        </div>
        <div className="shelfBody">
          <p>{error || "This tag doesn't exist."}</p>
          <button
            type="button"
            className="workPill"
            onClick={() => navigate("/tags")}
          >
            ← Back to Tags
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="shelfPage">
      <div className="shelfBanner">
        <h1 className="shelfTitle">#{tag.name}</h1>
        <p className="shelfSubtitle">{tag.usageCount || 0} works with this tag</p>
      </div>

      <div className="shelfBody shelfBody--withSidebar">
        <aside className="leftFilters" aria-label="Filters">
          <div className="filterSearchWrap">
            <input
              className="filterSearch"
              placeholder="Search works..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filterSection">
            <div className="filterLabel">Sort By</div>
            <label className="filterRow">
              <input
                type="radio"
                name="sort"
                checked={sort === "recent"}
                onChange={() => setSort("recent")}
              />
              <span>Newest</span>
            </label>
            <label className="filterRow">
              <input
                type="radio"
                name="sort"
                checked={sort === "popular"}
                onChange={() => setSort("popular")}
              />
              <span>Most Popular</span>
            </label>
          </div>
        </aside>

        <section className="shelfMain">
          {filteredWorks.length === 0 ? (
            <div className="emptyNote">
              {search
                ? `No works found matching "${search}"`
                : "No works found with this tag yet."}
            </div>
          ) : (
            <div className="worksGrid">
              {filteredWorks.map((w) => (
                <Link
                  key={w._id}
                  to={`/works/${w._id}`}
                  className="workCard"
                >
                  <div className="workCardCover">
                    <img
                      src={w.coverImageUrl || defaultCover}
                      alt=""
                      className="workCardCoverImg"
                    />
                  </div>
                  <div className="workCardInfo">
                    <div className="workCardTitle">{w.title || "Untitled"}</div>
                    <div className="workCardAuthor">
                      by {w.authorUsername || "Unknown"}
                    </div>
                    <div className="workCardMeta">
                      {w.views || 0} views
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
