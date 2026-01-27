import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./DraftEditor.css";

const STORAGE_KEY = "sable_drafts_v1";

function nowIso() {
  return new Date().toISOString();
}

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveAll(arr) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // front-end only
  }
}

export default function DraftEditor() {
  const navigate = useNavigate();
  const { draftId } = useParams();

  const isNew = !draftId || draftId === "new";

  const [id, setId] = React.useState(() => (isNew ? `d-${Date.now()}` : draftId));
  const [title, setTitle] = React.useState("Untitled");
  const [body, setBody] = React.useState("");

  React.useEffect(() => {
    if (isNew) return;

    const all = loadAll();
    const found = all.find((d) => String(d.id) === String(draftId));
    if (found) {
      setId(found.id);
      setTitle(found.title || "Untitled");
      setBody(found.body || "");
      return;
    }

    // If draft doesn't exist, bounce back to drafts list
    navigate("/drafts", { replace: true });
  }, [draftId, isNew, navigate]);

  function upsertDraft(next = {}) {
    const all = loadAll();
    const updated = {
      id,
      title: String(next.title ?? title ?? "Untitled"),
      body: String(next.body ?? body ?? ""),
      updatedAt: nowIso(),
    };

    const idx = all.findIndex((d) => String(d.id) === String(id));
    if (idx >= 0) {
      all[idx] = updated;
    } else {
      all.unshift(updated);
    }
    saveAll(all);
  }

  function handleSave() {
    upsertDraft();
  }

  function handlePost() {
    // Placeholder: in real app, this would publish
    upsertDraft();
    navigate("/drafts");
  }

  return (
    <div className="de-page">
      <div className="de-shell">
        <div className="de-top">
          <h1 className="de-title">{isNew ? "New Draft" : "Edit Draft"}</h1>

          <button type="button" className="de-back" onClick={() => navigate("/drafts")} aria-label="Back to drafts">
            Back
          </button>
        </div>

        <section className="de-card" aria-label="Draft editor">
          <label className="de-label" htmlFor="draft-title">
            Draft Title
          </label>
          <input
            id="draft-title"
            className="de-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Draft title"
          />

          <div className="de-label de-label--spaced">Work Body</div>
          <textarea
            className="de-textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            aria-label="Work body"
          />

          <div className="de-actions" aria-label="Draft actions">
            <button type="button" className="de-btn" onClick={handlePost}>
              Post
            </button>
            <button type="button" className="de-btn de-btn--light" onClick={handleSave}>
              Save Draft
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
