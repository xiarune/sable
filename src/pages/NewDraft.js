
import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./NewDraft.css";
import { draftsApi } from "../api/drafts";
import { uploadsApi } from "../api/uploads";
import importApi from "../api/import";

import chapterIcon from "../assets/images/chapter_icon.png";
import importIcon from "../assets/images/import_icon.png";
import tagsIcon from "../assets/images/tags_icon.png";
import skinsIcon from "../assets/images/skins_icon.png";
import privacyIcon from "../assets/images/privacy_icon.png";
import langIcon from "../assets/images/lang_icon.png";
import imageIcon from "../assets/images/image_icon.png";
import previewIcon from "../assets/images/preview_icon.png";

const SKIN_OPTIONS = ["Default", "Parchment"];
const PRIVACY_OPTIONS = ["Public", "Following", "Private"];
const LANGUAGE_OPTIONS = ["English", "Vietnamese", "Japanese", "French", "Spanish"];

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
  return { id: makeId("ch"), title: "Chapter 1", body: "", order: 0, audioUrl: "" };
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
  const chapterAudioUrl = activeChapter?.audioUrl || "";

  function setBody(newBody) {
    setChapters((prev) =>
      prev.map((ch) =>
        ch.id === activeChapterId
          ? { ...ch, body: typeof newBody === "function" ? newBody(ch.body) : newBody }
          : ch
      )
    );
  }

  function setChapterAudio(url) {
    setChapters((prev) =>
      prev.map((ch) =>
        ch.id === activeChapterId
          ? { ...ch, audioUrl: url }
          : ch
      )
    );
  }

  function addChapter() {
    const newCh = { id: makeId("ch"), title: `Chapter ${chapters.length + 1}`, body: "", order: chapters.length, audioUrl: "" };
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
      return next.map((ch, idx) => ({ ...ch, order: idx }));
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
      return next.map((ch, i) => ({ ...ch, order: i }));
    });
  }

  const [tags, setTags] = React.useState([]);
  const [skin, setSkin] = React.useState("Default");
  const [privacy, setPrivacy] = React.useState("Public");
  const [language, setLanguage] = React.useState("English");
  const [genre, setGenre] = React.useState("");
  const [fandom, setFandom] = React.useState("");
  const [coverImageUrl, setCoverImageUrl] = React.useState("");

  const [audioUrl, setAudioUrl] = React.useState("");
  const [imageUrls, setImageUrls] = React.useState([]);

  const [activeTool, setActiveTool] = React.useState("");
  const [tagInput, setTagInput] = React.useState("");
  const [genreInput, setGenreInput] = React.useState("");
  const [fandomInput, setFandomInput] = React.useState("");
  const [importUrl, setImportUrl] = React.useState("");
  const [importLoading, setImportLoading] = React.useState(false);
  const [status, setStatus] = React.useState("");
  const [previewOn, setPreviewOn] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [loadingDraft, setLoadingDraft] = React.useState(false);

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

  // Load existing draft from backend
  React.useEffect(() => {
    if (!draftId) return;

    async function loadDraft() {
      setLoadingDraft(true);
      try {
        const response = await draftsApi.get(draftId);
        const draft = response.draft;

        setTitle(draft.title || "");
        if (Array.isArray(draft.chapters) && draft.chapters.length > 0) {
          setChapters(draft.chapters);
          setActiveChapterId(draft.chapters[0].id);
        }
        setTags(Array.isArray(draft.tags) ? draft.tags : []);
        setSkin(draft.skin || "Default");
        setPrivacy(draft.privacy || "Public");
        setLanguage(draft.language || "English");
        setGenre(draft.genre || "");
        setFandom(draft.fandom || "");
        setCoverImageUrl(draft.coverImageUrl || "");
        setAudioUrl(draft.audioUrl || "");
        setImageUrls(Array.isArray(draft.imageUrls) ? draft.imageUrls : []);
      } catch (err) {
        console.error("Failed to load draft:", err);
        setStatus("Failed to load draft. It may have been deleted.");
      } finally {
        setLoadingDraft(false);
      }
    }

    loadDraft();
  }, [draftId]);

  async function saveDraft() {
    const payload = {
      title: title.trim() || "Untitled",
      chapters: chapters.map((ch, idx) => ({
        id: ch.id,
        title: ch.title,
        body: ch.body,
        order: idx,
        audioUrl: ch.audioUrl || "",
      })),
      tags,
      skin,
      privacy,
      language,
      genre: genre.trim() || "",
      fandom: fandom.trim() || "Original Work",
      coverImageUrl,
      audioUrl,
      imageUrls,
    };

    if (draftId) {
      // Update existing draft
      const response = await draftsApi.update(draftId, payload);
      return response.draft._id;
    } else {
      // Create new draft
      const response = await draftsApi.create({ title: payload.title });
      const newId = response.draft._id;
      // Update with full data
      await draftsApi.update(newId, payload);
      return newId;
    }
  }

  async function handleSaveDraft() {
    if (!genre.trim()) {
      setStatus("Genre is required.");
      setTimeout(() => setStatus(""), 3000);
      return;
    }

    setLoading(true);
    setStatus("Saving draft...");
    try {
      await saveDraft();
      setStatus("Draft saved!");
      setTimeout(() => navigate("/drafts"), 500);
    } catch (err) {
      console.error("Failed to save draft:", err);
      setStatus(err.message || "Failed to save draft.");
    } finally {
      setLoading(false);
      setTimeout(() => setStatus(""), 3000);
    }
  }

  async function handlePost() {
    if (!genre.trim()) {
      setStatus("Genre is required before publishing.");
      setTimeout(() => setStatus(""), 3000);
      return;
    }

    setLoading(true);
    setStatus("Publishing...");
    try {
      const savedDraftId = await saveDraft();
      const response = await draftsApi.publish(savedDraftId);
      const workId = response.work._id;
      setStatus("Published!");
      setTimeout(() => navigate(`/works/${encodeURIComponent(workId)}`), 500);
    } catch (err) {
      console.error("Failed to publish:", err);
      setStatus(err.message || "Failed to publish.");
    } finally {
      setLoading(false);
      setTimeout(() => setStatus(""), 3000);
    }
  }

  async function handleCoverUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      setStatus("Uploading cover image...");
      const response = await uploadsApi.upload(file, "covers");
      setCoverImageUrl(response.url);
      setStatus("Cover image uploaded.");
    } catch (err) {
      console.error("Cover upload failed:", err);
      setStatus("Cover upload failed.");
    } finally {
      e.target.value = "";
      setTimeout(() => setStatus(""), 2000);
    }
  }

  async function handleAudioUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      setStatus("Uploading audio...");
      const response = await uploadsApi.upload(file, "audio");
      setChapterAudio(response.url);
      setStatus("Audio uploaded for this chapter.");
    } catch (err) {
      console.error("Audio upload failed:", err);
      setStatus("Audio upload failed.");
    } finally {
      e.target.value = "";
      setTimeout(() => setStatus(""), 2000);
    }
  }

  async function handleImageUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      setStatus("Uploading image...");
      const response = await uploadsApi.upload(file, "images");
      const url = response.url;

      setImageUrls((prev) => [url, ...prev]);

      const safeAlt = (file.name || "image").replace(/\.[^/.]+$/, "");
      const snippet = `\n\n![${safeAlt}](${url})\n\n`;
      insertIntoBody(snippet);

      setStatus("Image inserted into body.");
    } catch (err) {
      console.error("Image upload failed:", err);
      setStatus("Image upload failed.");
    } finally {
      e.target.value = "";
      setTimeout(() => setStatus(""), 2000);
    }
  }

  async function handleImportUrl() {
    if (!importUrl.trim()) {
      setStatus("Please enter a URL to import");
      setTimeout(() => setStatus(""), 3000);
      return;
    }

    setImportLoading(true);
    setStatus("Importing content...");
    try {
      const response = await importApi.fromUrl(importUrl.trim());

      // Set the imported content as the body of the current chapter
      if (response.content) {
        setBody(response.content);
      }

      // Set title if we got one and current title is empty
      if (response.title && !title.trim()) {
        setTitle(response.title);
      }

      setStatus(`Imported ${response.wordCount || 0} words successfully!`);
      setImportUrl("");
    } catch (err) {
      console.error("Import failed:", err);
      setStatus(err.message || "Failed to import content.");
    } finally {
      setImportLoading(false);
      setTimeout(() => setStatus(""), 3000);
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

  if (loadingDraft) {
    return (
      <div className="nd-page">
        <div className="nd-shell">
          <h1 className="nd-title">Loading Draft...</h1>
        </div>
      </div>
    );
  }

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
              icon="📚"
              label="Genre"
              subLabel={genre || "Required"}
              onClick={() => toggleTool("genre")}
              active={activeTool === "genre"}
            />
            <ActionPill
              icon="🌍"
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
              icon={<IconImg src={langIcon} alt="Language" />}
              label="Language"
              subLabel={language}
              onClick={() => toggleTool("language")}
              active={activeTool === "language"}
            />
            <ActionPill
              icon="🖼️"
              label="Cover"
              subLabel={coverImageUrl ? "Set" : "None"}
              onClick={() => toggleTool("cover")}
              active={activeTool === "cover"}
            />
            <ActionPill
              icon="🎧"
              label="Audio"
              subLabel={chapterAudioUrl ? "Has Audio" : "None"}
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
              <div className="nd-choiceRow">
                {SKIN_OPTIONS.map((opt) => (
                  <label key={opt} className="nd-choice">
                    <input type="radio" checked={skin === opt} onChange={() => setSkin(opt)} />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
              <div className="nd-toolHint">
                Choose a reading skin for your work. Readers will see this theme when viewing.
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
              <div className="nd-toolHint">
                Public: Anyone can view. Following: Only your followers. Private: Only you.
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
              <div className="nd-toolTitle">Chapter Audio</div>
              <div className="nd-toolHint" style={{ marginBottom: 8, fontWeight: 500 }}>
                Currently editing: {activeChapter?.title || "Chapter"}
              </div>
              <input className="nd-toolInput" type="file" accept="audio/*" onChange={handleAudioUpload} />
              <div className="nd-toolHint">
                {chapterAudioUrl
                  ? "Audio attached to this chapter"
                  : "Upload an audio file for this chapter. Each chapter can have its own audio."}
              </div>
              {chapterAudioUrl && (
                <div style={{ marginTop: 8 }}>
                  <audio controls src={chapterAudioUrl} style={{ width: "100%" }} />
                  <button
                    type="button"
                    className="nd-ornateBtn nd-ornateBtn--small"
                    style={{ marginTop: 8 }}
                    onClick={() => setChapterAudio("")}
                  >
                    Remove Audio
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTool === "images" && (
            <div className="nd-toolPanel">
              <div className="nd-toolTitle">Insert Image Into Body</div>
              <input className="nd-toolInput" type="file" accept="image/*" onChange={handleImageUpload} />
              <div className="nd-toolHint">Upload an image and it will be inserted into the work body at your cursor position.</div>
            </div>
          )}

          {activeTool === "import" && (
            <div className="nd-toolPanel">
              <div className="nd-toolTitle">Import Content</div>

              <div style={{ marginBottom: 12 }}>
                <div className="nd-toolHint" style={{ marginBottom: 8 }}>
                  Import from URL (Google Docs, web pages, etc.)
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="nd-toolInput"
                    placeholder="Paste URL here (e.g., Google Docs link)"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="nd-ornateBtn nd-ornateBtn--small"
                    onClick={handleImportUrl}
                    disabled={importLoading}
                  >
                    {importLoading ? "Importing..." : "Import"}
                  </button>
                </div>
              </div>

              <div className="nd-toolHint" style={{ marginTop: 16 }}>
                <strong>Supported sources:</strong>
                <ul style={{ margin: "8px 0", paddingLeft: 20 }}>
                  <li>Google Docs (public or "anyone with link")</li>
                  <li>Any public web page</li>
                  <li>Plain text URLs</li>
                </ul>
                <p style={{ fontSize: 12, opacity: 0.8 }}>
                  For Word docs, copy-paste the text directly into the editor.
                  For Obsidian/local files, copy-paste or use File {'>'} Export to HTML first.
                </p>
              </div>
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
                  whiteSpace: "normal",
                }}
              >
                {renderBodyWithImages(body)}
              </div>
            </div>
          )}

          {status && <div className="nd-status">{status}</div>}

          <div className="nd-actions">
            <button className="nd-ornateBtn nd-ornateBtn--primary" onClick={handlePost} disabled={loading}>
              {loading ? "Publishing..." : "Post"}
            </button>
            <button className="nd-ornateBtn" onClick={handleSaveDraft} disabled={loading}>
              {loading ? "Saving..." : "Save Draft"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
