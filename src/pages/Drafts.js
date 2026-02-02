import React from "react";
import { useNavigate } from "react-router-dom";
import "./YourWorks.css";

const DRAFTS_KEY = "sable_drafts_v1";

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function loadArray(key) {
  const raw = localStorage.getItem(key);
  const parsed = safeParse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

function saveArray(key, arr) {
  try {
    localStorage.setItem(key, JSON.stringify(arr));
  } catch {
    // front-end only
  }
}

function seedDraftsIfEmpty() {
  const existing = loadArray(DRAFTS_KEY);
  if (existing.length >= 5) return existing;

  const seeded = Array.from({ length: 5 }).map((_, i) => ({
    id: `d-seed-${i + 1}`,
    title: `Draft ${i + 1}`,
    body: "",
    updatedAt: new Date().toISOString(),
  }));

  saveArray(DRAFTS_KEY, seeded);
  return seeded;
}

export default function Drafts() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = React.useState([]);

  React.useEffect(() => {
    const seeded = seedDraftsIfEmpty();
    setDrafts(seeded);
  }, []);

  function handleEdit(draftId) {
    navigate(`/drafts/edit/${encodeURIComponent(draftId)}`);
  }

  return (
    <div className="yw-page">
      <div className="yw-shell">
        <header className="yw-head">
          <div className="yw-headLeft">
            <h1 className="yw-title">Your Drafts</h1>
            <p className="yw-subtitle">Unpublished drafts. Edit them any time.</p>
          </div>

          <div className="yw-headRight">
            <button type="button" className="yw-topBtn" onClick={() => navigate("/profile")}>
              Back to Profile
            </button>
          </div>
        </header>

        <section className="yw-gridWrap" aria-label="Draft list">
          <div className="yw-grid">
            {drafts.slice(0, 5).map((d) => (
              <article key={String(d.id)} className="yw-card">
                <div className="yw-poster" aria-hidden="true" />
                <h2 className="yw-cardTitle">{d.title || "Untitled"}</h2>
                <div className="yw-cardMeta">unpublished</div>

                <button type="button" className="yw-cardBtn" onClick={() => handleEdit(d.id)}>
                  Edit
                </button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}




