import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./NewDraft.css";

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

function saveDrafts(next) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function makeId() {
  return `d_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function ActionPill({ icon, label, onClick }) {
  return (
    <button type="button" className="nd-pill" onClick={onClick} aria-label={label} title={label}>
      <span className="nd-pillIcon" aria-hidden="true">
        {icon}
      </span>
      <span className="nd-pillLabel">{label}</span>
    </button>
  );
}

export default function NewDraft() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const draftId = params.get("draft") || "";

  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [status, setStatus] = React.useState(""); // small UI text only

  React.useEffect(() => {
    if (!draftId) {
      setTitle("");
      setBody("");
      setStatus("");
      return;
    }

    const drafts = loadDrafts();
    const found = drafts.find((d) => d.id === draftId);

    if (!found) {
      setTitle("");
      setBody("");
      setStatus("Draft not found. Starting a new one.");
      return;
    }

    setTitle(found.title || "");
    setBody(found.body || "");
    setStatus("");
  }, [draftId]);

  function handleSave() {
    const drafts = loadDrafts();
    const now = new Date().toISOString();

    if (draftId) {
      const idx = drafts.findIndex((d) => d.id === draftId);
      if (idx === -1) {
        // treat as new if link is stale
        const newId = makeId();
        const next = [
          {
            id: newId,
            title: (title || "").trim() || "Untitled",
            body: body || "",
            createdAt: now,
            updatedAt: now,
          },
          ...drafts,
        ];
        saveDrafts(next);
        setStatus("Saved new draft.");
        navigate(`/new-draft?draft=${encodeURIComponent(newId)}`, { replace: true });
        return;
      }

      const updated = {
        ...drafts[idx],
        title: (title || "").trim() || "Untitled",
        body: body || "",
        updatedAt: now,
      };

      const next = [...drafts];
      next[idx] = updated;
      saveDrafts(next);
      setStatus("Draft saved.");
      return;
    }

    // New draft save
    const newId = makeId();
    const next = [
      {
        id: newId,
        title: (title || "").trim() || "Untitled",
        body: body || "",
        createdAt: now,
        updatedAt: now,
      },
      ...drafts,
    ];
    saveDrafts(next);
    setStatus("Draft saved.");
    navigate(`/new-draft?draft=${encodeURIComponent(newId)}`, { replace: true });
  }

  return (
    <div className="nd-page">
      <h1 className="nd-title">{draftId ? "Edit Draft" : "New Draft"}</h1>

      <section className="nd-card" aria-label="Draft editor">
        <div className="nd-pillRow" aria-label="Draft tools">
          <ActionPill label="Import Work" icon="☁︎" onClick={() => {}} />
          <ActionPill label="Tags" icon="🏷" onClick={() => {}} />
          <ActionPill label="Skin" icon="★" onClick={() => {}} />
          <ActionPill label="Privacy" icon="🌐" onClick={() => {}} />
          <ActionPill label="Language" icon="🗨" onClick={() => {}} />
          <ActionPill label="Audio" icon="🎧" onClick={() => {}} />
        </div>

        {/* Title */}
        <div className="nd-bodyLabel">Title</div>
        <input
          className="nd-textarea"
          style={{ minHeight: 44, height: 44, paddingTop: 10 }}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder=""
          aria-label="Draft title"
        />

        <div className="nd-bodyLabel" style={{ marginTop: 14 }}>
          Work Body
        </div>

        <textarea
          className="nd-textarea"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder=""
          aria-label="Work body"
        />

        {status ? (
          <div
            style={{
              marginTop: 10,
              fontFamily: `"Libre Baskerville", serif`,
              fontSize: 12,
              color: "rgba(0,0,0,0.55)",
            }}
          >
            {status}
          </div>
        ) : null}

        <div className="nd-actions" aria-label="Draft actions">
          <button
            type="button"
            className="nd-ornateBtn"
            onClick={() => {
              // front-end placeholder
              console.log("Post clicked:", { title, body });
            }}
          >
            Post
          </button>

          <button type="button" className="nd-ornateBtn" onClick={handleSave}>
            Save Draft
          </button>

          <button
            type="button"
            className="nd-ornateBtn"
            onClick={() => navigate("/drafts")}
          >
            Existing Drafts
          </button>
        </div>
      </section>
    </div>
  );
}


