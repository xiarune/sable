import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { worksApi } from "../api";
import "./YourWorks.css";
import defaultCover from "../assets/images/sable_default_cover.png";

export default function YourWorks() {
  const navigate = useNavigate();
  const [works, setWorks] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    loadWorks();
  }, []);

  async function loadWorks() {
    try {
      setLoading(true);
      setError(null);
      const data = await worksApi.mine();
      setWorks(data.works || []);
    } catch (err) {
      setError(err.message || "Failed to load works");
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(workId) {
    navigate(`/works/edit/${encodeURIComponent(workId)}`);
  }

  async function handleDelete(workId, title) {
    if (!window.confirm(`Are you sure you want to delete "${title || 'this work'}"? This cannot be undone.`)) {
      return;
    }
    try {
      await worksApi.delete(workId);
      setWorks((prev) => prev.filter((w) => w._id !== workId));
    } catch (err) {
      alert(err.message || "Failed to delete work");
    }
  }

  if (loading) {
    return (
      <div className="yw-page">
        <div className="yw-shell">
          <p>Loading works...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="yw-page">
      <div className="yw-shell">
        <header className="yw-head">
          <div className="yw-headLeft">
            <h1 className="yw-title">Your Works</h1>
            <p className="yw-subtitle">Published works you can edit individually.</p>
          </div>

          <div className="yw-headRight">
            <button type="button" className="yw-topBtn" onClick={() => navigate("/drafts")}>
              View Drafts
            </button>
            <button type="button" className="yw-topBtn" onClick={() => navigate("/profile")}>
              Back to Profile
            </button>
          </div>
        </header>

        {error && <p style={{ color: "red", marginBottom: "1rem" }}>{error}</p>}

        <section className="yw-gridWrap" aria-label="Published works list">
          <div className="yw-grid">
            {works.length === 0 ? (
              <p>No published works yet. Create a draft and publish it!</p>
            ) : (
              works.map((w) => (
                <article key={String(w._id)} className="yw-card">
                  <div
                    className="yw-poster"
                    aria-hidden="true"
                    style={{
                      backgroundImage: `url(${w.coverImageUrl || defaultCover})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />

                  <h2 className="yw-cardTitle">
                    <Link
                      to={`/works/${encodeURIComponent(w._id)}`}
                      style={{ color: "inherit", textDecoration: "none" }}
                      aria-label={`Open work: ${w.title || "Untitled"}`}
                    >
                      {w.title || "Untitled"}
                    </Link>
                  </h2>

                  <div className="yw-cardMeta">
                    {w.wordCount || 0} words &middot; {w.views || 0} views
                  </div>

                  <div className="yw-cardActions">
                    <button type="button" className="yw-cardBtn" onClick={() => handleEdit(w._id)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="yw-cardBtn yw-cardBtn--delete"
                      onClick={() => handleDelete(w._id, w.title)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
