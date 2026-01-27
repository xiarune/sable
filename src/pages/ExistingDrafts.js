import React from "react";
import { useNavigate } from "react-router-dom";
import "./ExistingDrafts.css";

const STORAGE_KEY = "sable_drafts_v1";

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function loadDrafts() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const parsed = safeParse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed;
}

export default function ExistingDrafts() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = React.useState([]);

  React.useEffect(() => {
    setDrafts(loadDrafts());
  }, []);

  function openDraft(draftId) {
    navigate(`/new-draft?draft=${encodeURIComponent(draftId)}`);
  }

  return (
    <div className="ed-page">
      <h1 className="ed-title">Existing Drafts</h1>

      <section className="ed-shelf" aria-label="Existing drafts list">
        <div className="ed-scroll">
          {drafts.length === 0 ? (
            <div className="ed-empty">
              No saved drafts yet.
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
                <button
                  key={d.id}
                  type="button"
                  className="ed-card"
                  onClick={() => openDraft(d.id)}
                  aria-label={`Open draft ${d.title || "Untitled"}`}
                >
                  <div className="ed-cover" />
                  <div className="ed-cardTitle">{d.title || "Untitled"}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ed-footer">
          <button type="button" className="ed-backBtn" onClick={() => navigate(-1)}>
            Back
          </button>
        </div>
      </section>
    </div>
  );
}



