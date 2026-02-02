import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./DraftEditor.css";

const DRAFTS_KEY = "sable_drafts_v1";
const WORKS_KEY = "sable_published_v1";

function nowIso() {
  return new Date().toISOString();
}

function loadAll(key) {
  try {
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveAll(key, arr) {
  try {
    localStorage.setItem(key, JSON.stringify(arr));
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

    const all = loadAll(DRAFTS_KEY);
    const found = all.find((d) => String(d.id) === String(draftId));
    if (found) {
      setId(found.id);
      setTitle(found.title || "Untitled");
      setBody(found.body || "");
      return;
    }

    // If draft doesn't exist, bounce back to Works page
    navigate("/works", { replace: true });
  }, [draftId, isNew, navigate]);

  function upsertDraft(next = {}) {
    const all = loadAll(DRAFTS_KEY);
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
    saveAll(DRAFTS_KEY, all);
    return updated;
  }

  function upsertPublishedFromDraft(draft) {
    const works = loadAll(WORKS_KEY);
    const now = nowIso();
    const workId = `w_${draft.id}`;

    const payload = {
      id: workId,
      title: draft.title || "Untitled",
      body: draft.body || "",
      sourceDraftId: draft.id,
      updatedAt: now,
    };

    const idx = works.findIndex((w) => String(w.id) === String(workId));
    if (idx >= 0) {
      works[idx] = { ...works[idx], ...payload };
    } else {
      works.unshift({ ...payload, createdAt: now });
    }
    saveAll(WORKS_KEY, works);
    return workId;
  }

  function handleSave() {
    upsertDraft();
  }

  function handlePost() {
    const saved = upsertDraft();
    const workId = upsertPublishedFromDraft(saved);
    navigate(`/works/edit/${encodeURIComponent(workId)}`);
  }

  return (
    <div className="de-page">
      <div className="de-shell">
        <div className="de-top">
          <h1 className="de-title">{isNew ? "New Draft" : "Edit Draft"}</h1>

          <button type="button" className="de-back" onClick={() => navigate("/works")} aria-label="Back to works">
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

