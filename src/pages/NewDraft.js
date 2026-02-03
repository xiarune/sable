// NewDraft.js
import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./NewDraft.css";

const STORAGE_KEY = "sable_drafts_v1";

const SKIN_OPTIONS = ["Default", "Emerald", "Ivory", "Midnight"];
const PRIVACY_OPTIONS = ["Public", "Following", "Private"];
const LANGUAGE_OPTIONS = ["English", "Vietnamese", "Japanese", "French", "Spanish"];

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
  return Array.isArray(parsed) ? parsed : [];
}

function saveDrafts(next) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function makeId() {
  return `d_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function ActionPill({ icon, label, subLabel, active, onClick }) {
  return (
    <button
      type="button"
      className={active ? "nd-pill nd-pill--active" : "nd-pill"}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <span className="nd-pillIcon" aria-hidden="true">
        {icon}
      </span>

      <span className="nd-pillText">
        <span className="nd-pillLabel">{label}</span>
        {subLabel ? <span className="nd-pillSub">{subLabel}</span> : null}
      </span>
    </button>
  );
}

export default function NewDraft() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const draftId = params.get("draft") || "";

  // Core fields
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");

  // Metadata
  const [tags, setTags] = React.useState([]);
  const [skin, setSkin] = React.useState("Default");
  const [privacy, setPrivacy] = React.useState("Public");
  const [language, setLanguage] = React.useState("English");
  const [audioEnabled, setAudioEnabled] = React.useState(false);

  // UI state
  const [activeTool, setActiveTool] = React.useState("");
  const [tagInput, setTagInput] = React.useState("");
  const [status, setStatus] = React.useState("");

  // Load existing draft
  React.useEffect(() => {
    if (!draftId) return;

    const drafts = loadDrafts();
    const found = drafts.find((d) => d.id === draftId);
    if (!found) return;

    setTitle(found.title || "");
    setBody(found.body || "");
    setTags(found.tags || []);
    setSkin(found.skin || "Default");
    setPrivacy(found.privacy || "Public");
    setLanguage(found.language || "English");
    setAudioEnabled(Boolean(found.audioEnabled));
  }, [draftId]);

  function upsertDraft() {
    const drafts = loadDrafts();
    const now = new Date().toISOString();

    const payload = {
      title: title.trim() || "Untitled",
      body,
      tags,
      skin,
      privacy,
      language,
      audioEnabled,
      updatedAt: now,
    };

    if (draftId) {
      const idx = drafts.findIndex((d) => d.id === draftId);
      if (idx >= 0) {
        const next = [...drafts];
        next[idx] = { ...next[idx], ...payload };
        saveDrafts(next);
        return;
      }
    }

    saveDrafts([{ id: makeId(), createdAt: now, ...payload }, ...drafts]);
  }

  function handleSaveDraft() {
    upsertDraft();
    navigate("/drafts");
  }

  function handlePost() {
    upsertDraft();
    navigate("/works");
  }

  function toggleTool(tool) {
    setActiveTool((prev) => (prev === tool ? "" : tool));
  }

  function addTag() {
    const cleaned = tagInput.trim().replace(/^#/, "");
    if (!cleaned) return;
    if (tags.includes(cleaned)) return;

    setTags((prev) => [...prev, cleaned]);
    setTagInput("");
  }

  function removeTag(tag) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  return (
    <div className="nd-page">
      <div className="nd-shell">
        <h1 className="nd-title">{draftId ? "Edit Draft" : "New Draft"}</h1>

        <section className="nd-card">
          {/* Toolbar */}
          <div className="nd-pillRow">
            <ActionPill icon="☁︎" label="Import" subLabel="Soon" onClick={() => toggleTool("import")} active={activeTool === "import"} />
            <ActionPill icon="🏷" label="Tags" subLabel={tags.length ? `${tags.length}` : ""} onClick={() => toggleTool("tags")} active={activeTool === "tags"} />
            <ActionPill icon="★" label="Skin" subLabel={skin} onClick={() => toggleTool("skin")} active={activeTool === "skin"} />
            <ActionPill icon="🌐" label="Privacy" subLabel={privacy} onClick={() => toggleTool("privacy")} active={activeTool === "privacy"} />
            <ActionPill icon="🗨" label="Language" subLabel={language} onClick={() => toggleTool("language")} active={activeTool === "language"} />
            <ActionPill
              icon="🎧"
              label="Audio"
              subLabel={audioEnabled ? "On" : "Off"}
              onClick={() => setAudioEnabled((v) => !v)}
            />
          </div>

          {/* Tool panels */}
          {activeTool === "tags" && (
            <div className="nd-toolPanel">
              <div className="nd-toolTitle">Tags</div>

              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className="nd-toolInput"
                  placeholder="Add a tag"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                />
               <button
  type="button"
  className="nd-ornateBtn nd-ornateBtn--small"
  onClick={addTag}
>
  Add
</button>
              </div>

              {tags.length > 0 && (
                <div className="nd-tags">
                  {tags.map((t) => (
                    <button key={t} className="nd-tag" onClick={() => removeTag(t)}>
                      #{t} ×
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTool === "skin" && (
            <div className="nd-toolPanel">
              <div className="nd-toolTitle">Skin</div>
              <div className="nd-choiceRow">
                {SKIN_OPTIONS.map((opt) => (
                  <label key={opt} className="nd-choice">
                    <input type="radio" checked={skin === opt} onChange={() => setSkin(opt)} />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {activeTool === "privacy" && (
            <div className="nd-toolPanel">
              <div className="nd-toolTitle">Privacy</div>
              <div className="nd-choiceRow">
                {PRIVACY_OPTIONS.map((opt) => (
                  <label key={opt} className="nd-choice">
                    <input type="radio" checked={privacy === opt} onChange={() => setPrivacy(opt)} />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {activeTool === "language" && (
            <div className="nd-toolPanel">
              <div className="nd-toolTitle">Language</div>
              <select className="nd-toolSelect" value={language} onChange={(e) => setLanguage(e.target.value)}>
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
            </div>
          )}

          {/* Editor */}
          <div className="nd-bodyLabel">Title</div>
          <input className="nd-textarea" style={{ minHeight: 44 }} value={title} onChange={(e) => setTitle(e.target.value)} />

          <div className="nd-bodyLabel" style={{ marginTop: 14 }}>
            Work Body
          </div>
          <textarea className="nd-textarea" value={body} onChange={(e) => setBody(e.target.value)} />

          {status && <div className="nd-status">{status}</div>}

          <div className="nd-actions">
            <button className="nd-ornateBtn nd-ornateBtn--primary" onClick={handlePost}>
              Post
            </button>
            <button className="nd-ornateBtn" onClick={handleSaveDraft}>
              Save Draft
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}









