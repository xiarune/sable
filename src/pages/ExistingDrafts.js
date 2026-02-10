import React from "react";
import { useNavigate } from "react-router-dom";
import { draftsApi } from "../api/drafts";
import "./ExistingDrafts.css";
import defaultCover from "../assets/images/sable_default_cover.png";

export default function ExistingDrafts() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    async function loadDrafts() {
      try {
        const response = await draftsApi.list();
        setDrafts(response.drafts || []);
      } catch (err) {
        console.error("Failed to load drafts:", err);
        setError(err.message || "Failed to load drafts");
      } finally {
        setLoading(false);
      }
    }
    loadDrafts();
  }, []);

  function openDraft(draftId) {
    navigate(`/new-draft?draft=${encodeURIComponent(draftId)}`);
  }

  async function deleteDraft(e, draftId) {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this draft?")) return;

    try {
      await draftsApi.delete(draftId);
      setDrafts((prev) => prev.filter((d) => d._id !== draftId));
    } catch (err) {
      console.error("Failed to delete draft:", err);
      alert("Failed to delete draft");
    }
  }

  if (loading) {
    return (
      <div className="ed-page">
        <h1 className="ed-title">Existing Drafts</h1>
        <section className="ed-shelf">
          <p style={{ padding: 20 }}>Loading drafts...</p>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ed-page">
        <h1 className="ed-title">Existing Drafts</h1>
        <section className="ed-shelf">
          <p style={{ padding: 20, color: "#c44" }}>{error}</p>
          <p style={{ padding: "0 20px" }}>
            <button type="button" className="ed-backBtn" onClick={() => navigate(-1)}>
              Go Back
            </button>
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="ed-page">
      <h1 className="ed-title">Existing Drafts</h1>

      <section className="ed-shelf" aria-label="Existing drafts list">
        <div className="ed-scroll">
          {drafts.length === 0 ? (
            <div className="ed-empty">
              No saved drafts yet.{" "}
              <button
                type="button"
                className="ed-inlineLink"
                onClick={() => navigate("/new-draft")}
              >
                Start a new draft
              </button>
              .
            </div>
          ) : (
            <div className="ed-grid">
              {drafts.map((d) => (
                <div key={d._id} className="ed-cardWrap">
                  <button
                    type="button"
                    className="ed-card"
                    onClick={() => openDraft(d._id)}
                    aria-label={`Open draft ${d.title || "Untitled"}`}
                  >
                    <div
                      className="ed-cover"
                      style={{
                        backgroundImage: `url(${d.coverImageUrl || defaultCover})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    />
                    <div className="ed-cardTitle">{d.title || "Untitled"}</div>
                    <div className="ed-cardMeta">
                      {d.chapterCount || 0} chapters • {d.wordCount || 0} words
                    </div>
                  </button>
                  <button
                    type="button"
                    className="ed-deleteBtn"
                    onClick={(e) => deleteDraft(e, d._id)}
                    aria-label="Delete draft"
                    title="Delete draft"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="ed-footer">
          <button type="button" className="ed-newBtn" onClick={() => navigate("/new-draft")}>
            + New Draft
          </button>
          <button type="button" className="ed-backBtn" onClick={() => navigate(-1)}>
            Back
          </button>
        </div>
      </section>
    </div>
  );
}
