import React from "react";
import { useNavigate } from "react-router-dom";
import { draftsApi } from "../api";
import "./YourWorks.css";

export default function Drafts() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [limits, setLimits] = React.useState({ maxDrafts: 5, currentCount: 0 });

  React.useEffect(() => {
    loadDrafts();
  }, []);

  async function loadDrafts() {
    try {
      setLoading(true);
      setError(null);
      const data = await draftsApi.list();
      setDrafts(data.drafts || []);
      if (data.limits) setLimits(data.limits);
    } catch (err) {
      setError(err.message || "Failed to load drafts");
    } finally {
      setLoading(false);
    }
  }

  async function handleNewDraft() {
    try {
      const data = await draftsApi.create({ title: "Untitled" });
      navigate(`/drafts/edit/${encodeURIComponent(data.draft._id)}`);
    } catch (err) {
      setError(err.message || "Failed to create draft");
    }
  }

  function handleEdit(draftId) {
    navigate(`/drafts/edit/${encodeURIComponent(draftId)}`);
  }

  if (loading) {
    return (
      <div className="yw-page">
        <div className="yw-shell">
          <p>Loading drafts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="yw-page">
      <div className="yw-shell">
        <header className="yw-head">
          <div className="yw-headLeft">
            <h1 className="yw-title">Your Drafts</h1>
            <p className="yw-subtitle">
              Unpublished drafts ({limits.currentCount}/{limits.maxDrafts})
            </p>
          </div>

          <div className="yw-headRight">
            <button
              type="button"
              className="yw-topBtn"
              onClick={handleNewDraft}
              disabled={limits.currentCount >= limits.maxDrafts}
            >
              New Draft
            </button>
            <button type="button" className="yw-topBtn" onClick={() => navigate("/profile")}>
              Back to Profile
            </button>
          </div>
        </header>

        {error && <p className="yw-error" style={{ color: "red", marginBottom: "1rem" }}>{error}</p>}

        <section className="yw-gridWrap" aria-label="Draft list">
          <div className="yw-grid">
            {drafts.length === 0 ? (
              <p>No drafts yet. Create your first draft!</p>
            ) : (
              drafts.map((d) => (
                <article key={String(d._id)} className="yw-card">
                  <div className="yw-poster" aria-hidden="true" />
                  <h2 className="yw-cardTitle">{d.title || "Untitled"}</h2>
                  <div className="yw-cardMeta">
                    {d.chapterCount || 0} chapter{d.chapterCount !== 1 ? "s" : ""} &middot;{" "}
                    {d.wordCount || 0} words
                  </div>

                  <button type="button" className="yw-cardBtn" onClick={() => handleEdit(d._id)}>
                    Edit
                  </button>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
