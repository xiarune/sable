
import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./NewDraft.css";

import chapterIcon from "../assets/images/chapter_icon.png";
import importIcon from "../assets/images/import_icon.png";
import tagsIcon from "../assets/images/tags_icon.png";
import skinsIcon from "../assets/images/skins_icon.png";
import privacyIcon from "../assets/images/privacy_icon.png";
import langIcon from "../assets/images/lang_icon.png";
import imageIcon from "../assets/images/image_icon.png";
import previewIcon from "../assets/images/preview_icon.png";

const STORAGE_KEY = "sable_drafts_v1";
const WORKS_KEY = "sable_published_v1";

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

function loadAll(key) {
  const raw = localStorage.getItem(key);
  const parsed = safeParse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

function saveAll(key, next) {
  localStorage.setItem(key, JSON.stringify(next));
}

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix = "d") {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function makeDefaultChapter() {
  return { id: makeId("ch"), title: "Chapter 1", body: "" };
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("File read failed."));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
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

function renderBodyWithImages(text) {
  const src = String(text || "");
  const re = /!\[([^\]]*)\]\(([^)]+)\)/g;

  const out = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = re.exec(src)) !== null) {
    const [full, altRaw, urlRaw] = match;
    const start = match.index;
    const end = start + full.length;

    if (start > lastIndex) {
      out.push({ type: "text", value: src.slice(lastIndex, start), key: `t_${key++}` });
    }

    out.push({
      type: "image",
      alt: altRaw || "image",
      url: urlRaw,
      key: `i_${key++}`,
    });

    lastIndex = end;
  }

  if (lastIndex < src.length) {
    out.push({ type: "text", value: src.slice(lastIndex), key: `t_${key++}` });
  }

  return out.map((node) => {
    if (node.type === "image") {
      return (
        <div key={node.key} style={{ margin: "12px 0" }}>
          <img
            src={node.url}
            alt={node.alt}
            style={{
              maxWidth: "100%",
              height: "auto",
              display: "block",
              borderRadius: 12,
              boxShadow: "0 10px 18px rgba(0,0,0,0.10)",
            }}
          />
        </div>
      );
    }

    const lines = String(node.value).split("\n");
    return (
      <span key={node.key}>
        {lines.map((line, idx) => (
          <React.Fragment key={`${node.key}_${idx}`}>
            {line}
            {idx < lines.length - 1 ? <br /> : null}
          </React.Fragment>
        ))}
      </span>
    );
  });
}

export default function NewDraft() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const draftId = params.get("draft") || "";

  const [title, setTitle] = React.useState("");
  const [chapters, setChapters] = React.useState(() => {
    const ch = makeDefaultChapter();
    return [ch];
  });
  const [activeChapterId, setActiveChapterId] = React.useState("");

  React.useEffect(() => {
    if (!activeChapterId && chapters.length > 0) {
      setActiveChapterId(chapters[0].id);
    }
  }, [activeChapterId, chapters]);

  const activeChapter = chapters.find((c) => c.id === activeChapterId) || chapters[0] || null;
  const body = activeChapter?.body || "";

  function setBody(newBody) {
    setChapters((prev) =>
      prev.map((ch) =>
        ch.id === activeChapterId
          ? { ...ch, body: typeof newBody === "function" ? newBody(ch.body) : newBody }
          : ch
      )
    );
  }

  function addChapter() {
    const newCh = { id: makeId("ch"), title: `Chapter ${chapters.length + 1}`, body: "" };
    setChapters((prev) => [...prev, newCh]);
    setActiveChapterId(newCh.id);
  }

  function renameChapter(chId, newTitle) {
    setChapters((prev) => prev.map((ch) => (ch.id === chId ? { ...ch, title: newTitle } : ch)));
  }

  function deleteChapter(chId) {
    if (chapters.length <= 1) return;
    setChapters((prev) => {
      const next = prev.filter((ch) => ch.id !== chId);
      if (activeChapterId === chId && next.length > 0) {
        setActiveChapterId(next[0].id);
      }
      return next;
    });
  }

  function moveChapter(chId, direction) {
    setChapters((prev) => {
      const idx = prev.findIndex((ch) => ch.id === chId);
      if (idx < 0) return prev;
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  }

  const [tags, setTags] = React.useState([]);
  const [skin, setSkin] = React.useState("Default");
  const [privacy, setPrivacy] = React.useState("Public");
  const [language, setLanguage] = React.useState("English");

  const [audio, setAudio] = React.useState(null);
  const [images, setImages] = React.useState([]);

  const [activeTool, setActiveTool] = React.useState("");
  const [tagInput, setTagInput] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [previewOn, setPreviewOn] = React.useState(false);

  const bodyRef = React.useRef(null);

  function toggleTool(tool) {
    setActiveTool((prev) => (prev === tool ? "" : tool));
  }

  function insertIntoBody(text) {
    const el = bodyRef.current;
    if (!el) {
      setBody((prev) => `${prev}${prev ? "\n" : ""}${text}`);
      return;
    }

    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;

    const before = body.slice(0, start);
    const after = body.slice(end);

    const next = `${before}${text}${after}`;
    setBody(next);

    requestAnimationFrame(() => {
      try {
        el.focus();
        const pos = start + text.length;
        el.setSelectionRange(pos, pos);
      } catch {
        // ignore
      }
    });
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

  React.useEffect(() => {
    if (!draftId) return;

    const drafts = loadAll(STORAGE_KEY);
    const found = drafts.find((d) => d.id === draftId);
    if (!found) return;

    setTitle(found.title || "");
    if (Array.isArray(found.chapters) && found.chapters.length > 0) {
      setChapters(found.chapters);
      setActiveChapterId(found.chapters[0].id);
    } else if (found.body) {
      const migratedCh = { id: makeId("ch"), title: "Chapter 1", body: found.body };
      setChapters([migratedCh]);
      setActiveChapterId(migratedCh.id);
    }
    setTags(Array.isArray(found.tags) ? found.tags : []);
    setSkin(found.skin || "Default");
    setPrivacy(found.privacy || "Public");
    setLanguage(found.language || "English");
    setAudio(found.audio || null);
    setImages(Array.isArray(found.images) ? found.images : []);
  }, [draftId]);

  function upsertDraft() {
    const drafts = loadAll(STORAGE_KEY);
    const now = nowIso();

    const payload = {
      title: title.trim() || "Untitled",
      chapters,
      tags,
      skin,
      privacy,
      language,
      audio,
      images,
      updatedAt: now,
    };

    if (draftId) {
      const idx = drafts.findIndex((d) => d.id === draftId);
      if (idx >= 0) {
        const next = [...drafts];
        next[idx] = { ...next[idx], ...payload };
        saveAll(STORAGE_KEY, next);
        return draftId;
      }
    }

    const id = makeId("d");
    saveAll(STORAGE_KEY, [{ id, createdAt: now, ...payload }, ...drafts]);
    return id;
  }

  function upsertPublishedFromDraft(savedDraftId) {
    const drafts = loadAll(STORAGE_KEY);
    const found = drafts.find((d) => String(d.id) === String(savedDraftId));
    if (!found) return null;

    const works = loadAll(WORKS_KEY);
    const now = nowIso();
    const workId = `w_${found.id}`;

    const payload = {
      id: workId,
      title: found.title || "Untitled",
      chapters: found.chapters || [],
      tags: found.tags || [],
      skin: found.skin || "Default",
      privacy: found.privacy || "Public",
      language: found.language || "English",
      audio: found.audio || null,
      images: found.images || [],
      sourceDraftId: found.id,
      updatedAt: now,
    };

    const idx = works.findIndex((w) => String(w.id) === String(workId));
    if (idx >= 0) {
      const next = [...works];
      next[idx] = { ...next[idx], ...payload };
      saveAll(WORKS_KEY, next);
    } else {
      saveAll(WORKS_KEY, [{ ...payload, createdAt: now }, ...works]);
    }

    return workId;
  }

  function handleSaveDraft() {
    upsertDraft();
    navigate("/drafts");
  }

  function handlePost() {
    const savedDraftId = upsertDraft();
    const workId = upsertPublishedFromDraft(savedDraftId);
    if (workId) {
      navigate(`/works/edit/${encodeURIComponent(workId)}`);
    } else {
      navigate("/works");
    }
  }

  async function handleAudioUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      setStatus("Uploading audio…");
      const dataUrl = await readFileAsDataURL(file);
      setAudio({
        name: file.name,
        type: file.type || "audio/*",
        size: file.size || 0,
        dataUrl,
      });
      setStatus("Audio attached.");
    } catch {
      setStatus("Audio upload failed.");
    } finally {
      e.target.value = "";
      setTimeout(() => setStatus(""), 1200);
    }
  }

  async function handleImageUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      setStatus("Uploading image…");
      const dataUrl = await readFileAsDataURL(file);

      const img = {
        id: makeId("img"),
        name: file.name,
        type: file.type || "image/*",
        size: file.size || 0,
        dataUrl,
      };

      setImages((prev) => [img, ...prev]);

      const safeAlt = (file.name || "image").replace(/\.[^/.]+$/, "");
      const snippet = `\n\n![${safeAlt}](${dataUrl})\n\n`;
      insertIntoBody(snippet);

      setStatus("Image inserted into body.");
    } catch {
      setStatus("Image upload failed.");
    } finally {
      e.target.value = "";
      setTimeout(() => setStatus(""), 1200);
    }
  }

  const IconImg = ({ src, alt }) => (
    <img
      src={src}
      alt={alt}
      width={18}
      height={18}
      style={{ display: "block", width: 18, height: 18, objectFit: "contain" }}
      draggable={false}
    />
  );

  return (
    <div className="nd-page">
      <div className="nd-shell">
        <h1 className="nd-title">{draftId ? "Edit Draft" : "New Draft"}</h1>

        <section className="nd-card">
          <div className="nd-pillRow">
            <ActionPill
              icon={<IconImg src={chapterIcon} alt="Chapters" />}
              label="Chapters"
              subLabel={`${chapters.length}`}
              onClick={() => toggleTool("chapters")}
              active={activeTool === "chapters"}
            />
            <ActionPill
              icon={<IconImg src={importIcon} alt="Import" />}
              label="Import"
              subLabel="Soon"
              onClick={() => toggleTool("import")}
              active={activeTool === "import"}
            />
            <ActionPill
              icon={<IconImg src={tagsIcon} alt="Tags" />}
              label="Tags"
              subLabel={tags.length ? `${tags.length}` : ""}
              onClick={() => toggleTool("tags")}
              active={activeTool === "tags"}
            />
            <ActionPill
              icon={<IconImg src={skinsIcon} alt="Skin" />}
              label="Skin"
              subLabel={skin}
              onClick={() => toggleTool("skin")}
              active={activeTool === "skin"}
            />
            <ActionPill
              icon={<IconImg src={privacyIcon} alt="Privacy" />}
              label="Privacy"
              subLabel={privacy}
              onClick={() => toggleTool("privacy")}
              active={activeTool === "privacy"}
            />
            <ActionPill
              icon={<IconImg src={langIcon} alt="Language" />}
              label="Language"
              subLabel={language}
              onClick={() => toggleTool("language")}
              active={activeTool === "language"}
            />
            <ActionPill
              icon="🎧"
              label="Audio"
              subLabel={audio?.name ? "Attached" : "None"}
              onClick={() => toggleTool("audio")}
              active={activeTool === "audio"}
            />
            <ActionPill
              icon={<IconImg src={imageIcon} alt="Images" />}
              label="Images"
              subLabel={images.length ? `${images.length}` : "0"}
              onClick={() => toggleTool("images")}
              active={activeTool === "images"}
            />
            <ActionPill
              icon={<IconImg src={previewIcon} alt="Preview" />}
              label="Preview"
              subLabel={previewOn ? "On" : "Off"}
              onClick={() => setPreviewOn((v) => !v)}
              active={previewOn}
            />
          </div>

          {activeTool === "chapters" && (
            <div className="nd-toolPanel">
              <div className="nd-toolTitle">Chapters</div>
              <div className="nd-chapterList">
                {chapters.map((ch, idx) => (
                  <div key={ch.id} className={`nd-chapterItem ${ch.id === activeChapterId ? "nd-chapterItem--active" : ""}`}>
                    <button type="button" className="nd-chapterSelect" onClick={() => setActiveChapterId(ch.id)}>
                      <input
                        className="nd-chapterTitleInput"
                        value={ch.title}
                        onChange={(e) => renameChapter(ch.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </button>
                    <div className="nd-chapterActions">
                      <button type="button" className="nd-chapterBtn" onClick={() => moveChapter(ch.id, -1)} disabled={idx === 0} title="Move up">
                        ↑
                      </button>
                      <button
                        type="button"
                        className="nd-chapterBtn"
                        onClick={() => moveChapter(ch.id, 1)}
                        disabled={idx === chapters.length - 1}
                        title="Move down"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="nd-chapterBtn nd-chapterBtn--delete"
                        onClick={() => deleteChapter(ch.id)}
                        disabled={chapters.length <= 1}
                        title="Delete chapter"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" className="nd-ornateBtn nd-ornateBtn--small" onClick={addChapter}>
                + Add Chapter
              </button>
            </div>
          )}

          {activeTool === "tags" && (
            <div className="nd-toolPanel">
              <div className="nd-toolTitle">Tags</div>

              <div style={{ display: "flex", gap: 8 }}>
                <input className="nd-toolInput" placeholder="Add a tag" value={tagInput} onChange={(e) => setTagInput(e.target.value)} />
                <button type="button" className="nd-ornateBtn nd-ornateBtn--small" onClick={addTag}>
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

          {activeTool === "audio" && (
            <div className="nd-toolPanel">
              <div className="nd-toolTitle">Audio Upload</div>
              <input className="nd-toolInput" type="file" accept="audio/*" onChange={handleAudioUpload} />
              <div className="nd-toolHint">
                {audio?.name ? `Attached: ${audio.name}` : "Upload an audio file to attach it to this draft."}
              </div>
            </div>
          )}

          {activeTool === "images" && (
            <div className="nd-toolPanel">
              <div className="nd-toolTitle">Insert Image Into Body</div>
              <input className="nd-toolInput" type="file" accept="image/*" onChange={handleImageUpload} />
              <div className="nd-toolHint">Upload an image and it will be inserted into the work body at your cursor position.</div>
            </div>
          )}

          {!previewOn ? (
            <>
              <div className="nd-bodyLabel">Title</div>
              <input className="nd-textarea" style={{ minHeight: 44 }} value={title} onChange={(e) => setTitle(e.target.value)} />

              <div className="nd-chapterSelector">
                <label className="nd-chapterSelectorLabel">Currently Editing:</label>
                <select
                  className="nd-chapterDropdown"
                  value={activeChapterId}
                  onChange={(e) => setActiveChapterId(e.target.value)}
                >
                  {chapters.map((ch, idx) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.title || `Chapter ${idx + 1}`}
                    </option>
                  ))}
                </select>
                <span className="nd-chapterCount">
                  ({chapters.findIndex((c) => c.id === activeChapterId) + 1} of {chapters.length})
                </span>
              </div>

              <div className="nd-bodyLabel" style={{ marginTop: 8 }}>
                Chapter Content
              </div>
              <textarea ref={bodyRef} className="nd-textarea" value={body} onChange={(e) => setBody(e.target.value)} />
            </>
          ) : (
            <div className="nd-toolPanel" style={{ marginTop: 12 }}>
              <div className="nd-toolTitle">Preview</div>

              <div className="nd-bodyLabel" style={{ marginTop: 6 }}>
                Title
              </div>
              <div
                style={{
                  background: "rgba(255,255,255,0.92)",
                  border: "1px solid rgba(0,0,0,0.10)",
                  borderRadius: 12,
                  padding: 12,
                  fontFamily: '"Libre Baskerville", serif',
                  fontSize: 15,
                  lineHeight: 1.7,
                  color: "rgba(0,0,0,0.82)",
                }}
              >
                {title?.trim() ? title : "Untitled"}
              </div>

              {audio?.dataUrl ? (
                <>
                  <div className="nd-bodyLabel" style={{ marginTop: 14 }}>
                    Audio
                  </div>
                  <audio controls src={audio.dataUrl} style={{ width: "100%" }} />
                </>
              ) : null}

              <div className="nd-bodyLabel" style={{ marginTop: 14 }}>
                {activeChapter ? activeChapter.title : "Chapter"} Body
              </div>
              <div
                style={{
                  background: "rgba(255,255,255,0.92)",
                  border: "1px solid rgba(0,0,0,0.10)",
                  borderRadius: 12,
                  padding: 12,
                  fontFamily: '"Libre Baskerville", serif',
                  fontSize: 15,
                  lineHeight: 1.7,
                  color: "rgba(0,0,0,0.82)",
                  whiteSpace: "normal",
                }}
              >
                {renderBodyWithImages(body)}
              </div>
            </div>
          )}

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











