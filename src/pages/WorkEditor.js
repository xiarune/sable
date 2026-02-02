import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./DraftEditor.css";

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

export default function WorkEditor() {
  const navigate = useNavigate();
  const { workId } = useParams();

  const [title, setTitle] = React.useState("Untitled");
  const [body, setBody] = React.useState("");

  React.useEffect(() => {
    const works = loadAll(WORKS_KEY);
    const found = works.find((w) => String(w.id) === String(workId));

    if (!found) {
      navigate("/works", { replace: true });
      return;
    }

    setTitle(found.title || "Untitled");
    setBody(found.body || "");
  }, [workId, navigate]);

  function upsertWork(next = {}) {
    const works = loadAll(WORKS_KEY);
    const idx = works.findIndex((w) => String(w.id) === String(workId));

    if (idx < 0) {
      navigate("/works", { replace: true });
      return;
    }

    const updated = {
      ...works[idx],
      title: String(next.title ?? title ?? "Untitled"),
      body: String(next.body ?? body ?? ""),
      updatedAt: nowIso(),
    };

    const nextArr = [...works];
    nextArr[idx] = updated;
    saveAll(WORKS_KEY, nextArr);
  }

  function handleSave() {
    upsertWork();
  }

  return (
    <div className="de-page">
      <div className="de-shell">
        <div className="de-top">
          <h1 className="de-title">Edit Work</h1>

          <button type="button" className="de-back" onClick={() => navigate("/works")} aria-label="Back to works">
            Back
          </button>
        </div>

        <section className="de-card" aria-label="Work editor">
          <label className="de-label" htmlFor="work-title">
            Work Title
          </label>
          <input
            id="work-title"
            className="de-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Work title"
          />

          <div className="de-label de-label--spaced">Work Body</div>
          <textarea
            className="de-textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            aria-label="Work body"
          />

          <div className="de-actions" aria-label="Work actions">
            <button type="button" className="de-btn" onClick={handleSave}>
              Save
            </button>
            <button type="button" className="de-btn de-btn--light" onClick={() => navigate("/works")}>
              Done
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
