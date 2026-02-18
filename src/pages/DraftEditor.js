// DraftEditor.js
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { draftsApi, uploadsApi, skinsApi } from "../api";
import { SableLoader } from "../components";
import "./NewDraft.css";

import chapterIcon from "../assets/images/chapter_icon.png";
import importIcon from "../assets/images/import_icon.png";
import tagsIcon from "../assets/images/tags_icon.png";
import skinsIcon from "../assets/images/skins_icon.png";
import privacyIcon from "../assets/images/privacy_icon.png";
import langIcon from "../assets/images/lang_icon.png";
import imageIcon from "../assets/images/image_icon.png";
import previewIcon from "../assets/images/preview_icon.png";
import genreIcon from "../assets/images/genre_icon.png";
import fandomIcon from "../assets/images/fandom_icon.png";
import coverIcon from "../assets/images/cover_icon.png";

const BUILTIN_SKIN_OPTIONS = ["Default", "Parchment"];
const PRIVACY_OPTIONS = ["Public", "Following", "Private"];
const LANGUAGE_OPTIONS = ["English", "Vietnamese", "Japanese", "French", "Spanish"];
const PROGRESS_STATUS_OPTIONS = [
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "hiatus", label: "On Hiatus" },
  { value: "abandoned", label: "Abandoned" },
];

// Common genres for creative writing
const GENRE_SUGGESTIONS = [
  "Romance", "Fantasy", "Science Fiction", "Mystery", "Thriller", "Horror",
  "Drama", "Comedy", "Action", "Adventure", "Slice of Life", "Angst",
  "Fluff", "Hurt/Comfort", "Historical", "Supernatural", "Dystopian"
];

function makeId(prefix = "ch") {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function makeDefaultChapter() {
  return { id: makeId("ch"), title: "Chapter 1", body: "", order: 0 };
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

export default function DraftEditor() {
  const navigate = useNavigate();
  const { draftId } = useParams();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);

  const [title, setTitle] = React.useState("");
  const [chapters, setChapters] = React.useState(() => [makeDefaultChapter()]);
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
    const newCh = { id: makeId("ch"), title: `Chapter ${chapters.length + 1}`, body: "", order: chapters.length };
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
  const [customSkinId, setCustomSkinId] = React.useState(null);
  const [customSkins, setCustomSkins] = React.useState([]);
  const [privacy, setPrivacy] = React.useState("Public");
  const [language, setLanguage] = React.useState("English");
  const [genre, setGenre] = React.useState("");
  const [fandom, setFandom] = React.useState("");
  const [progressStatus, setProgressStatus] = React.useState("ongoing");
  const [coverImageUrl, setCoverImageUrl] = React.useState("");

  const [audioUrl, setAudioUrl] = React.useState("");
  const [imageUrls, setImageUrls] = React.useState([]);

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

  // Formatting functions for toolbar
  function wrapSelection(before, after) {
    const el = bodyRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selectedText = body.slice(start, end);

    const beforeText = body.slice(0, start);
    const afterText = body.slice(end);

    const newText = `${beforeText}${before}${selectedText}${after}${afterText}`;
    setBody(newText);

    requestAnimationFrame(() => {
      try {
        el.focus();
        el.setSelectionRange(start + before.length, end + before.length);
      } catch {
        // ignore
      }
    });
  }

  function formatBold() {
    wrapSelection("**", "**");
  }

  function formatItalic() {
    wrapSelection("*", "*");
  }

  function formatUnderline() {
    wrapSelection("<u>", "</u>");
  }

  function formatStrike() {
    wrapSelection("~~", "~~");
  }

  function formatHeading() {
    const el = bodyRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const lineStart = body.lastIndexOf("\n", start - 1) + 1;
    const beforeLine = body.slice(0, lineStart);
    const afterLineStart = body.slice(lineStart);

    setBody(`${beforeLine}## ${afterLineStart}`);
  }

  function formatLink() {
    const el = bodyRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selectedText = body.slice(start, end) || "link text";

    const beforeText = body.slice(0, start);
    const afterText = body.slice(end);

    const newText = `${beforeText}[${selectedText}](url)${afterText}`;
    setBody(newText);
  }

  function formatList() {
    const el = bodyRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const lineStart = body.lastIndexOf("\n", start - 1) + 1;
    const beforeLine = body.slice(0, lineStart);
    const afterLineStart = body.slice(lineStart);

    setBody(`${beforeLine}- ${afterLineStart}`);
  }

  function formatQuote() {
    const el = bodyRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const lineStart = body.lastIndexOf("\n", start - 1) + 1;
    const beforeLine = body.slice(0, lineStart);
    const afterLineStart = body.slice(lineStart);

    setBody(`${beforeLine}> ${afterLineStart}`);
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

  // Load draft from API
  React.useEffect(() => {
    if (!draftId) {
      setLoading(false);
      return;
    }

    async function loadDraft() {
      try {
        setLoading(true);
        const data = await draftsApi.get(draftId);
        const draft = data.draft;

        setTitle(draft.title || "");
        if (Array.isArray(draft.chapters) && draft.chapters.length > 0) {
          setChapters(draft.chapters);
          setActiveChapterId(draft.chapters[0].id);
        }
        setTags(Array.isArray(draft.tags) ? draft.tags : []);
        setSkin(draft.skin || "Default");
        setCustomSkinId(draft.customSkinId || null);
        setPrivacy(draft.privacy || "Public");
        setLanguage(draft.language || "English");
        setGenre(draft.genre || "");
        setFandom(draft.fandom || "");
        setProgressStatus(draft.progressStatus || "ongoing");
        setCoverImageUrl(draft.coverImageUrl || "");
        setAudioUrl(draft.audioUrl || "");
        setImageUrls(Array.isArray(draft.imageUrls) ? draft.imageUrls : []);
      } catch (err) {
        setStatus(err.message || "Failed to load draft");
        navigate("/drafts", { replace: true });
      } finally {
        setLoading(false);
      }
    }

    loadDraft();
  }, [draftId, navigate]);

  // Load custom skins
  React.useEffect(() => {
    async function loadCustomSkins() {
      try {
        const data = await skinsApi.list("work");
        setCustomSkins(data.skins || []);
      } catch {
        // Ignore errors
      }
    }
    loadCustomSkins();
  }, []);

  // Save draft to API
  async function handleSaveDraft() {
    try {
      setSaving(true);
      setStatus("Saving...");

      const payload = {
        title: title.trim() || "Untitled",
        chapters: chapters.map((ch, idx) => ({
          id: ch.id,
          title: ch.title,
          body: ch.body,
          order: idx,
        })),
        tags,
        skin,
        customSkinId,
        privacy,
        language,
        genre: genre.trim() || "",
        fandom: fandom.trim() || "Original Work",
        progressStatus,
        coverImageUrl,
        audioUrl,
        imageUrls,
      };

      await draftsApi.update(draftId, payload);
      setStatus("Saved!");
      setTimeout(() => setStatus(""), 1500);
    } catch (err) {
      setStatus(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  // Publish draft via API
  async function handlePost() {
    if (!genre.trim()) {
      setStatus("Genre is required before publishing.");
      setTimeout(() => setStatus(""), 3000);
      return;
    }

    try {
      setPublishing(true);
      setStatus("Publishing...");

      // First save the draft
      const payload = {
        title: title.trim() || "Untitled",
        chapters: chapters.map((ch, idx) => ({
          id: ch.id,
          title: ch.title,
          body: ch.body,
          order: idx,
        })),
        tags,
        skin,
        customSkinId,
        privacy,
        language,
        genre: genre.trim() || "",
        fandom: fandom.trim() || "Original Work",
        progressStatus,
        coverImageUrl,
        audioUrl,
        imageUrls,
      };

      await draftsApi.update(draftId, payload);

      // Then publish
      const data = await draftsApi.publish(draftId);
      const workId = data.work._id;

      navigate(`/works/edit/${encodeURIComponent(workId)}`);
    } catch (err) {
      setStatus(err.message || "Publish failed");
    } finally {
      setPublishing(false);
    }
  }

  // Upload cover image
  async function handleCoverUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      setStatus("Uploading cover...");
      const data = await uploadsApi.image(file);
      setCoverImageUrl(data.url);
      setStatus("Cover uploaded.");
    } catch (err) {
      setStatus(err.message || "Cover upload failed.");
    } finally {
      e.target.value = "";
      setTimeout(() => setStatus(""), 1500);
    }
  }

  // Upload audio to S3
  async function handleAudioUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      setStatus("Uploading audio...");
      const data = await uploadsApi.audio(file);
      setAudioUrl(data.url);
      setStatus("Audio attached.");
    } catch (err) {
      setStatus(err.message || "Audio upload failed.");
    } finally {
      e.target.value = "";
      setTimeout(() => setStatus(""), 1500);
    }
  }

  // Upload image to S3 and insert into body
  async function handleImageUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      setStatus("Uploading image...");
      const data = await uploadsApi.image(file);
      const url = data.url;

      setImageUrls((prev) => [url, ...prev]);

      const safeAlt = (file.name || "image").replace(/\.[^/.]+$/, "");
      const snippet = `\n\n![${safeAlt}](${url})\n\n`;
      insertIntoBody(snippet);

      setStatus("Image inserted.");
    } catch (err) {
      setStatus(err.message || "Image upload failed.");
    } finally {
      e.target.value = "";
      setTimeout(() => setStatus(""), 1500);
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

  if (loading) {
    return (
      <div className="nd-page">
        <SableLoader />
      </div>
    );
  }

  return (
    <div className="nd-page">
      <div className="nd-shell">
        <h1 className="nd-title">Edit Draft</h1>

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
              icon={<IconImg src={genreIcon} alt="Genre" />}
              label="Genre"
              subLabel={genre || "Required"}
              onClick={() => toggleTool("genre")}
              active={activeTool === "genre"}
            />
            <ActionPill
              icon={<IconImg src={fandomIcon} alt="Fandom" />}
              label="Fandom"
              subLabel={fandom || "Original"}
              onClick={() => toggleTool("fandom")}
              active={activeTool === "fandom"}
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
              icon="📊"
              label="Status"
              subLabel={PROGRESS_STATUS_OPTIONS.find(o => o.value === progressStatus)?.label || "Ongoing"}
              onClick={() => toggleTool("progressStatus")}
              active={activeTool === "progressStatus"}
            />
            <ActionPill
              icon={<IconImg src={langIcon} alt="Language" />}
              label="Language"
              subLabel={language}
              onClick={() => toggleTool("language")}
              active={activeTool === "language"}
            />
            <ActionPill
              icon={<IconImg src={coverIcon} alt="Cover" />}
              label="Cover"
              subLabel={coverImageUrl ? "Set" : "None"}
              onClick={() => toggleTool("cover")}
              active={activeTool === "cover"}
            />
            <ActionPill
              icon="🎧"
              label="Audio"
              subLabel={audioUrl ? "Attached" : "None"}
              onClick={() => toggleTool("audio")}
              active={activeTool === "audio"}
            />
            <ActionPill
              icon={<IconImg src={imageIcon} alt="Images" />}
              label="Images"
              subLabel={imageUrls.length ? `${imageUrls.length}` : "0"}
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

          {activeTool === "genre" && (
            <div className="nd-toolPanel">
              <div className="nd-toolTitle">Genre <span style={{ color: "#c44", fontWeight: "normal" }}>(Required)</span></div>
              <input
                className="nd-toolInput"
                placeholder="Enter genre (e.g., Romance, Fantasy)"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
              />
              <div className="nd-toolHint" style={{ marginTop: 8 }}>
                Suggestions:
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                  {GENRE_SUGGESTIONS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      className="nd-tag"
                      style={{ cursor: "pointer" }}
                      onClick={() => setGenre(g)}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTool === "fandom" && (
            <div className="nd-toolPanel">
              <div className="nd-toolTitle">Fandom</div>
              <input
                className="nd-toolInput"
                placeholder="Enter fandom (leave empty for Original Work)"
                value={fandom}
                onChange={(e) => setFandom(e.target.value)}
              />
              <div className="nd-toolHint">
                If your work is not based on an existing property, leave empty or enter "Original Work".
              </div>
            </div>
          )}

          {activeTool === "skin" && (
            <div className="nd-toolPanel">
              <div className="nd-toolTitle">Skin</div>
              <div className="nd-toolSubtitle">Built-in Skins</div>
              <div className="nd-choiceRow">
                {BUILTIN_SKIN_OPTIONS.map((opt) => (
                  <label key={opt} className="nd-choice">
                    <input
                      type="radio"
                      checked={skin === opt && !customSkinId}
                      onChange={() => {
                        setSkin(opt);
                        setCustomSkinId(null);
                      }}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
              {customSkins.length > 0 && (
                <>
                  <div className="nd-toolSubtitle" style={{ marginTop: 12 }}>Custom Skins</div>
                  <div className="nd-choiceRow">
                    {customSkins.map((cs) => (
                      <label key={cs._id} className="nd-choice">
                        <input
                          type="radio"
                          checked={customSkinId === cs._id}
                          onChange={() => {
                            setSkin(cs.name);
                            setCustomSkinId(cs._id);
                          }}
                        />
                        <span>{cs.name}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
              <div className="nd-toolHint">
                Choose a reading skin for your work. Readers will see this theme when viewing.
                {customSkins.length === 0 && (
                  <> Create custom skins in <a href="/settings" style={{ color: "#244b2b" }}>Settings → Skins</a>.</>
                )}
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

          {activeTool === "progressStatus" && (
            <div className="nd-toolPanel">
              <div className="nd-toolTitle">Work Status</div>
              <div className="nd-choiceRow">
                {PROGRESS_STATUS_OPTIONS.map((opt) => (
                  <label key={opt.value} className="nd-choice">
                    <input type="radio" checked={progressStatus === opt.value} onChange={() => setProgressStatus(opt.value)} />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
              <div className="nd-toolHint">
                Let readers know if your work is ongoing, completed, on hiatus, or abandoned.
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

          {activeTool === "cover" && (
            <div className="nd-toolPanel">
              <div className="nd-toolTitle">Cover Image / Thumbnail</div>
              <input className="nd-toolInput" type="file" accept="image/*" onChange={handleCoverUpload} />
              <div className="nd-toolHint">
                Upload a cover image for your work. If not set, a default Sable cover will be used.
              </div>
              {coverImageUrl && (
                <div style={{ marginTop: 12 }}>
                  <img src={coverImageUrl} alt="Cover preview" style={{ maxWidth: 200, borderRadius: 8 }} />
                  <button
                    type="button"
                    className="nd-ornateBtn nd-ornateBtn--small"
                    style={{ marginTop: 8, display: "block" }}
                    onClick={() => setCoverImageUrl("")}
                  >
                    Remove Cover
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTool === "audio" && (
            <div className="nd-toolPanel">
              <div className="nd-toolTitle">Audio Upload</div>
              <input className="nd-toolInput" type="file" accept="audio/*" onChange={handleAudioUpload} />
              <div className="nd-toolHint">{audioUrl ? "Audio attached" : "Upload an audio file to attach it to this draft."}</div>
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

              {/* Formatting Toolbar */}
              <div className="nd-formatToolbar">
                <button type="button" className="nd-formatBtn" onMouseDown={(e) => { e.preventDefault(); formatBold(); }} title="Bold (Ctrl+B)">
                  <strong>B</strong>
                </button>
                <button type="button" className="nd-formatBtn" onMouseDown={(e) => { e.preventDefault(); formatItalic(); }} title="Italic (Ctrl+I)">
                  <em>I</em>
                </button>
                <button type="button" className="nd-formatBtn" onMouseDown={(e) => { e.preventDefault(); formatUnderline(); }} title="Underline">
                  <u>U</u>
                </button>
                <button type="button" className="nd-formatBtn" onMouseDown={(e) => { e.preventDefault(); formatStrike(); }} title="Strikethrough">
                  <s>S</s>
                </button>
                <span className="nd-formatDivider" />
                <button type="button" className="nd-formatBtn" onMouseDown={(e) => { e.preventDefault(); formatHeading(); }} title="Heading">
                  H
                </button>
                <button type="button" className="nd-formatBtn" onMouseDown={(e) => { e.preventDefault(); formatQuote(); }} title="Quote">
                  "
                </button>
                <button type="button" className="nd-formatBtn" onMouseDown={(e) => { e.preventDefault(); formatList(); }} title="List">
                  •
                </button>
                <button type="button" className="nd-formatBtn" onMouseDown={(e) => { e.preventDefault(); formatLink(); }} title="Link">
                  🔗
                </button>
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

              {audioUrl ? (
                <>
                  <div className="nd-bodyLabel" style={{ marginTop: 14 }}>
                    Audio
                  </div>
                  <audio controls src={audioUrl} style={{ width: "100%" }} />
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
                }}
              >
                {renderBodyWithImages(body)}
              </div>
            </div>
          )}

          {status && <div className="nd-status">{status}</div>}

          <div className="nd-actions">
            <button
              className="nd-ornateBtn nd-ornateBtn--primary"
              onClick={handlePost}
              disabled={publishing}
            >
              {publishing ? "Publishing..." : "Post"}
            </button>
            <button
              className="nd-ornateBtn"
              onClick={handleSaveDraft}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Draft"}
            </button>
            <button className="nd-ornateBtn" onClick={() => navigate("/drafts")}>
              Back to Drafts
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
