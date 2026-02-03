import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import "./WorkView.css";

import { works as libraryWorks } from "../data/libraryWorks";
import nightWoodsImg from "../assets/images/night_woods.png";

const WORKS_KEY = "sable_published_v1";
const VIEW_PREFS_KEY = "sable_workview_prefs_v1";
const AUDIO_FAVS_KEY = "sable_audio_favs_v1";
const WORK_FAVS_KEY = "sable_work_favs_v1"; // bookmark uses same storage

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function loadJson(key, fallback) {
  const raw = localStorage.getItem(key);
  const parsed = safeParse(raw);
  return parsed ?? fallback;
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function clamp(n, min, max) {
  const num = Number.isFinite(n) ? n : min;
  return Math.max(min, Math.min(max, num));
}

function loadPublishedWorks() {
  const parsed = loadJson(WORKS_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

function savePublishedWorks(arr) {
  saveJson(WORKS_KEY, arr);
}

function findPublishedById(workId) {
  const all = loadPublishedWorks();
  return all.find((w) => String(w.id) === String(workId)) || null;
}

function upsertPublished(work) {
  const all = loadPublishedWorks();
  const idx = all.findIndex((w) => String(w.id) === String(work.id));
  const next = { ...work, updatedAt: new Date().toISOString() };

  if (idx >= 0) all[idx] = { ...all[idx], ...next };
  else all.unshift(next);

  savePublishedWorks(all);
  return next;
}

function makePlaceholderBody(title) {
  const t = (title || "Untitled").trim();
  return [
    t,
    "",
    "This is a front-end mock story viewing page.",
    "Images behave like AO3: they appear only if the author includes them in the body.",
    "",
    "Audio + music controls are styled as real UI so we can wire APIs later.",
  ].join("\n");
}

function openLoginModal() {
  window.dispatchEvent(new Event("sable:open-auth"));
}

function isImageUrl(url) {
  const u = String(url || "");
  return (
    u.startsWith("http") ||
    u.startsWith("data:image/") ||
    u.startsWith("/") ||
    u.includes("/static/") ||
    u.includes("assets/")
  );
}

/**
 * Parses body string into blocks.
 * Supports Markdown-ish image syntax: ![alt](url)
 */
function parseBodyToBlocks(body) {
  const raw = String(body || "");
  const lines = raw.split("\n");

  const blocks = [];
  let buf = [];

  function flushPara() {
    const text = buf.join(" ").replace(/\s+/g, " ").trim();
    if (text) blocks.push({ type: "p", text });
    buf = [];
  }

  const imgRe = /!\[(.*?)\]\((.*?)\)/g;

  for (const line of lines) {
    const trimmed = String(line || "").trim();

    if (!trimmed) {
      flushPara();
      continue;
    }

    let m;
    let lastIdx = 0;
    imgRe.lastIndex = 0;

    while ((m = imgRe.exec(trimmed)) !== null) {
      const before = trimmed.slice(lastIdx, m.index).trim();
      if (before) buf.push(before);
      flushPara();

      const alt = m[1] || "";
      const url = m[2] || "";
      blocks.push({ type: "img", alt, url });

      lastIdx = m.index + m[0].length;
    }

    const after = trimmed.slice(lastIdx).trim();
    if (after) buf.push(after);
  }

  flushPara();
  return blocks;
}

function getChaptersFromWork(work) {
  const w = work || {};
  if (Array.isArray(w.chapters) && w.chapters.length) return w.chapters;

  return [
    { id: "c1", title: "Chapter 1" },
    { id: "c2", title: "Chapter 2" },
    { id: "c3", title: "Chapter 3" },
  ];
}

// Helpers for mock duration
function parseDurationToSeconds(dur) {
  const s = String(dur || "").trim();
  const parts = s.split(":");
  if (parts.length !== 2) return 0;
  const m = Number(parts[0]);
  const sec = Number(parts[1]);
  if (!Number.isFinite(m) || !Number.isFinite(sec)) return 0;
  return Math.max(0, m * 60 + sec);
}

function formatSeconds(secs) {
  const s = Math.max(0, Math.floor(secs || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function getMockAudioTracks(workId, authorHandle) {
  const base = String(workId || "work").slice(0, 6);
  const author = String(authorHandle || "author");
  return [
    { id: `a_${base}_1`, title: "Ambient read-through (draft)", author, duration: "2:11", src: "" },
    { id: `a_${base}_2`, title: "Author notes (why this scene exists)", author, duration: "1:02", src: "" },
    { id: `a_${base}_3`, title: "Character voice test", author, duration: "0:47", src: "" },
  ];
}

export default function WorkView({ isAuthed = false, username = "john.doe" }) {
  const navigate = useNavigate();
  const { workId } = useParams();

  const normalizedUser = (username || "john.doe").trim().toLowerCase();
  const decodedId = decodeURIComponent(workId || "");

  // Modal panel (settings + audio library picker)
  const [panel, setPanel] = React.useState(null); // "settings" | "audioLibrary" | null

  // Chapters
  const [chaptersOpen, setChaptersOpen] = React.useState(true);
  const [activeChapterId, setActiveChapterId] = React.useState("c1");

  // Comments
  const [commentsOpen, setCommentsOpen] = React.useState(false);
  const [commentDraft, setCommentDraft] = React.useState("");
  const [comments, setComments] = React.useState([
    { user: "jane.doe", text: "The atmosphere here is insane. Love the pacing." },
    { user: "amira.salem", text: "That last paragraph… brutal (in a good way)." },
    { user: "xi9283", text: "Are you planning another chapter soon?" },
  ]);

  // View prefs
  const [prefs, setPrefs] = React.useState(() => {
    const all = loadJson(VIEW_PREFS_KEY, {});
    const perUser = all?.[normalizedUser] || {};
    return {
      fontSize: clamp(Number(perUser.fontSize ?? 15), 13, 20),
      lineHeight: clamp(Number(perUser.lineHeight ?? 1.95), 1.6, 2.3),
      width: clamp(Number(perUser.width ?? 760), 560, 900),
      theme: perUser.theme === "dark" ? "dark" : "paper",
    };
  });

  // Audio favorites
  const [audioFavs, setAudioFavs] = React.useState(() => {
    const all = loadJson(AUDIO_FAVS_KEY, {});
    const perUser = all?.[normalizedUser] || {};
    return perUser;
  });

  // Work bookmarks
  const [workFavs, setWorkFavs] = React.useState(() => {
    const all = loadJson(WORK_FAVS_KEY, {});
    const perUser = all?.[normalizedUser] || {};
    return perUser;
  });

  // Audio playback
  const audioRef = React.useRef(null);
  const [nowPlayingId, setNowPlayingId] = React.useState(null);
  const [isPlaying, setIsPlaying] = React.useState(false);

  // Sticky bars open state
  const [audioBarOpen, setAudioBarOpen] = React.useState(false);
  const [musicBarOpen, setMusicBarOpen] = React.useState(false);

  // Audio progress UI (Apple-ish)
  const [audioCurrentSec, setAudioCurrentSec] = React.useState(0);
  const [audioDurationSec, setAudioDurationSec] = React.useState(0);
  const [audioSeeking, setAudioSeeking] = React.useState(false);

  // Music provider state (mock but functional like audio)
  const [musicProvider, setMusicProvider] = React.useState("spotify");
  const [musicQuery, setMusicQuery] = React.useState("");
  const [musicIsPlaying, setMusicIsPlaying] = React.useState(false);
  const [musicCurrentSec, setMusicCurrentSec] = React.useState(0);
  const [musicDurationSec, setMusicDurationSec] = React.useState(210); // 3:30 mock
  const [musicSeeking, setMusicSeeking] = React.useState(false);

  // Work data
  const published = React.useMemo(() => findPublishedById(decodedId), [decodedId]);
  const library = React.useMemo(() => {
    return (libraryWorks || []).find((w) => String(w.id) === String(decodedId)) || null;
  }, [decodedId]);

  const work = published || library;

  const authorHandle = React.useMemo(() => {
    if (published) return normalizedUser; // mock assumption
    return (library?.author || "author").trim();
  }, [published, library, normalizedUser]);

  const canEdit = Boolean(isAuthed && authorHandle && authorHandle.toLowerCase() === normalizedUser);

  const title = work?.title || "Untitled";
  const language = work?.language || "English";
  const views = work?.views || "—";

  const bodyRaw =
    published?.body?.trim()
      ? published.body
      : library?.body?.trim()
      ? library.body
      : makePlaceholderBody(title);

  const wordCount =
    work?.wordCount ||
    (() => {
      const cleaned = String(bodyRaw || "")
        .replace(/!\[.*?\]\(.*?\)/g, "")
        .replace(/\s+/g, " ")
        .trim();
      return cleaned ? String(cleaned.split(" ").length) : "—";
    })();

  const audioTracks = React.useMemo(() => getMockAudioTracks(decodedId, authorHandle), [decodedId, authorHandle]);
  const chapters = React.useMemo(() => getChaptersFromWork(work), [work]);

  const isBookmarked = Boolean(workFavs?.[decodedId]);

  const currentTrack = React.useMemo(() => {
    if (!nowPlayingId) return null;
    return audioTracks.find((t) => t.id === nowPlayingId) || null;
  }, [nowPlayingId, audioTracks]);

  const currentTrackFav = Boolean(currentTrack?.id && audioFavs?.[currentTrack.id]);

  // Parse body
  const baseBlocks = React.useMemo(() => parseBodyToBlocks(bodyRaw), [bodyRaw]);

  // Insert ONLY Night in the Woods image (and only that)
  const bodyBlocks = React.useMemo(() => {
    const blocks = [...baseBlocks];

    if (String(title).trim().toLowerCase() === "night in the woods") {
      const alreadyHasThatImage = blocks.some(
        (b) => b.type === "img" && String(b.url || "").includes("night_woods")
      );

      if (!alreadyHasThatImage) {
        const firstParaIdx = blocks.findIndex((b) => b.type === "p");
        const insertAt = firstParaIdx >= 0 ? firstParaIdx + 1 : 0;

        blocks.splice(insertAt, 0, {
          type: "img",
          alt: "Night in the Woods",
          url: nightWoodsImg,
        });
      }
    }

    return blocks;
  }, [baseBlocks, title]);

  // Current chapter label (centered under author)
  const chapterNumber = React.useMemo(() => {
    const idx = chapters.findIndex((c) => String(c.id) === String(activeChapterId));
    return idx >= 0 ? idx + 1 : 1;
  }, [chapters, activeChapterId]);

  // Persist prefs per-user
  React.useEffect(() => {
    const all = loadJson(VIEW_PREFS_KEY, {});
    const nextAll = { ...(all || {}), [normalizedUser]: prefs };
    saveJson(VIEW_PREFS_KEY, nextAll);
  }, [prefs, normalizedUser]);

  // Persist audio favorites per-user
  React.useEffect(() => {
    const all = loadJson(AUDIO_FAVS_KEY, {});
    const nextAll = { ...(all || {}), [normalizedUser]: audioFavs };
    saveJson(AUDIO_FAVS_KEY, nextAll);
  }, [audioFavs, normalizedUser]);

  // Persist work bookmarks per-user
  React.useEffect(() => {
    const all = loadJson(WORK_FAVS_KEY, {});
    const nextAll = { ...(all || {}), [normalizedUser]: workFavs };
    saveJson(WORK_FAVS_KEY, nextAll);
  }, [workFavs, normalizedUser]);

  // Close panel on ESC
  React.useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") setPanel(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Keep duration in sync whenever track changes
  React.useEffect(() => {
    if (!currentTrack) {
      setAudioDurationSec(0);
      setAudioCurrentSec(0);
      return;
    }
    const dur = currentTrack.src ? 0 : parseDurationToSeconds(currentTrack.duration);
    setAudioDurationSec(dur);
    setAudioCurrentSec(0);
  }, [currentTrack]);

  // Audio element events (real audio)
  React.useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    function onPlay() {
      setIsPlaying(true);
    }
    function onPause() {
      setIsPlaying(false);
    }
    function onEnded() {
      setIsPlaying(false);
      setNowPlayingId(null);
      setAudioCurrentSec(0);
      setAudioBarOpen(false);
    }
    function onTimeUpdate() {
      if (audioSeeking) return;
      setAudioCurrentSec(el.currentTime || 0);
    }
    function onLoadedMeta() {
      if (Number.isFinite(el.duration)) setAudioDurationSec(el.duration);
    }

    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("loadedmetadata", onLoadedMeta);

    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("loadedmetadata", onLoadedMeta);
    };
  }, [audioSeeking]);

  // Mock playback ticker (for tracks without src)
  React.useEffect(() => {
    if (!audioBarOpen) return;
    if (!currentTrack) return;
    if (currentTrack.src) return;
    if (!isPlaying) return;

    const dur = audioDurationSec || parseDurationToSeconds(currentTrack.duration);
    if (!dur) return;

    const t = window.setInterval(() => {
      setAudioCurrentSec((prev) => {
        const next = prev + 1;
        if (next >= dur) {
          setIsPlaying(false);
          setNowPlayingId(null);
          setAudioCurrentSec(0);
          setAudioBarOpen(false);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => window.clearInterval(t);
  }, [audioBarOpen, currentTrack, isPlaying, audioDurationSec]);

  // Music ticker (mock but works like audio)
  React.useEffect(() => {
    if (!musicBarOpen) return;
    if (!musicIsPlaying) return;

    const dur = musicDurationSec || 0;
    if (!dur) return;

    const t = window.setInterval(() => {
      setMusicCurrentSec((prev) => {
        if (musicSeeking) return prev;
        const next = prev + 1;
        if (next >= dur) {
          setMusicIsPlaying(false);
          return dur;
        }
        return next;
      });
    }, 1000);

    return () => window.clearInterval(t);
  }, [musicBarOpen, musicIsPlaying, musicDurationSec, musicSeeking]);

  function handleBack() {
    navigate(-1);
  }

  function handleEdit() {
    if (!work) return;

    if (!published) {
      upsertPublished({
        id: decodedId,
        title: library?.title || "Untitled",
        body: bodyRaw || makePlaceholderBody(library?.title || "Untitled"),
      });
    }

    navigate(`/works/edit/${encodeURIComponent(decodedId)}`);
  }

  function toggleComments() {
    setCommentsOpen((v) => !v);
  }

  function handlePostComment() {
    if (!isAuthed) {
      openLoginModal();
      return;
    }
    const text = commentDraft.trim();
    if (!text) return;
    setComments((prev) => [{ user: normalizedUser || "john.doe", text }, ...prev]);
    setCommentDraft("");
  }

  function openPanel(name) {
    setPanel((prev) => (prev === name ? null : name));
  }

  function toggleAudioFav(trackId) {
    setAudioFavs((prev) => {
      const next = { ...(prev || {}) };
      next[trackId] = !next[trackId];
      return next;
    });
  }

  function stopAndResetAudioElement() {
    const el = audioRef.current;
    if (el) {
      try {
        el.pause();
        el.currentTime = 0;
        el.removeAttribute("src");
        el.load();
      } catch {
        // ignore
      }
    }
  }

  function ensureAudioBarHasDefaultTrack() {
    if (!nowPlayingId && audioTracks.length) setNowPlayingId(audioTracks[0].id);
  }

  function toggleAudioBar() {
    setAudioBarOpen((prev) => {
      const next = !prev;
      if (next) ensureAudioBarHasDefaultTrack();
      return next;
    });
  }

  function selectTrack(track) {
    if (!track) return;

    setAudioBarOpen(true);
    setNowPlayingId(track.id);
    setAudioCurrentSec(0);

    const el = audioRef.current;
    if (!el) return;

    if (!track.src) {
      setIsPlaying(true);
      return;
    }

    el.src = track.src;
    el.play().catch(() => {});
  }

  function toggleAudioPlayPause() {
    const el = audioRef.current;

    if (!currentTrack) {
      ensureAudioBarHasDefaultTrack();
      return;
    }

    if (!el || !currentTrack.src) {
      setIsPlaying((p) => !p);
      return;
    }

    if (el.paused) el.play().catch(() => {});
    else el.pause();
  }

  function closeAudioBarAndStop() {
    stopAndResetAudioElement();
    setIsPlaying(false);
    setAudioCurrentSec(0);
    setNowPlayingId(null);
    setAudioBarOpen(false);
  }

  function seekAudioTo(seconds) {
    const target = clamp(Number(seconds), 0, audioDurationSec || 0);

    const el = audioRef.current;
    if (el && currentTrack?.src) {
      try {
        el.currentTime = target;
      } catch {
        // ignore
      }
    }

    setAudioCurrentSec(target);
  }

  function toggleWorkFavorite() {
    if (!isAuthed) {
      openLoginModal();
      return;
    }
    setWorkFavs((prev) => {
      const next = { ...(prev || {}) };
      next[decodedId] = !next[decodedId];
      return next;
    });
  }

  function selectChapter(chapter) {
    setActiveChapterId(chapter.id);
    // Placeholder for later: scroll to anchor
  }

  // Music bar actions (now functional mock)
  function openMusicBar() {
    setMusicBarOpen(true);
  }

  function closeMusicBar() {
    setMusicIsPlaying(false);
    setMusicCurrentSec(0);
    setMusicBarOpen(false);
  }

  function toggleMusicPlayPause() {
    setMusicIsPlaying((p) => !p);
  }

  function seekMusicTo(seconds) {
    const target = clamp(Number(seconds), 0, musicDurationSec || 0);
    setMusicCurrentSec(target);
  }

  if (!work) {
    return (
      <div className="wv-page">
        <div className="wv-shell">
          <div className="wv-empty">
            <div className="wv-emptyTitle">Work not found.</div>
            <div className="wv-emptySub">That ID doesn’t exist in the mock library or published works yet.</div>

            <button type="button" className="wv-primary" onClick={() => navigate("/browse")}>
              Go to Browse
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pageThemeClass = prefs.theme === "dark" ? "wv-themeDark" : "wv-themePaper";

  const audioHasDuration = (audioDurationSec || 0) > 0;
  const audioProgressPct = audioHasDuration ? (audioCurrentSec / audioDurationSec) * 100 : 0;

  const musicHasDuration = (musicDurationSec || 0) > 0;
  const musicProgressPct = musicHasDuration ? (musicCurrentSec / musicDurationSec) * 100 : 0;

  return (
    <div className={`wv-page ${pageThemeClass}`}>
      <div className="wv-shell">
        <div className="wv-layout">
          {/* LEFT: TOC + sticky bars */}
          <aside className="wv-toc" aria-label="Chapters and players">
            <div className="wv-tocStack">
              <div className="wv-tocCard">
                <div className="wv-tocHeader">
                  <div className="wv-tocTitle">Chapters</div>
                  <button
                    type="button"
                    className="wv-tocCollapse"
                    onClick={() => setChaptersOpen((v) => !v)}
                    aria-label={chaptersOpen ? "Collapse chapters" : "Expand chapters"}
                    title={chaptersOpen ? "Collapse" : "Expand"}
                  >
                    {chaptersOpen ? "▾" : "▸"}
                  </button>
                </div>

                {chaptersOpen ? (
                  <div className="wv-chapterList" aria-label="Chapter list">
                    {chapters.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={`wv-chapterItem ${activeChapterId === c.id ? "wv-chapterItem--active" : ""}`}
                        onClick={() => selectChapter(c)}
                        aria-label={`Go to ${c.title}`}
                        title={c.title}
                      >
                        {c.title}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="wv-tocHint">Choose a chapter to jump (anchor wiring later).</div>
                )}
              </div>

              {/* STICKY AUDIO BAR */}
              {audioBarOpen ? (
                <div className="wv-miniPlayer" aria-label="Audio player">
                  <div className="wv-miniHead">
                    <div className="wv-miniTitle">Audio</div>
                    <button
                      type="button"
                      className="wv-miniClose"
                      onClick={closeAudioBarAndStop}
                      aria-label="Close audio and stop"
                      title="Close"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="wv-miniBody">
                    <div className="wv-miniTrack">
                      <div className="wv-miniTrackTitle">{currentTrack ? currentTrack.title : "Choose a track"}</div>
                      <div className="wv-miniTrackMeta">
                        {currentTrack ? (
                          <>
                            <span>by {currentTrack.author}</span>
                            <span className="wv-dot">•</span>
                            <span>{currentTrack.duration}</span>
                          </>
                        ) : (
                          <span>Select from the library</span>
                        )}
                      </div>
                    </div>

                    <div className="wv-playerRow">
                      <button
                        type="button"
                        className="wv-iconPlay"
                        onClick={toggleAudioPlayPause}
                        aria-label={isPlaying ? "Pause audio" : "Play audio"}
                        title={isPlaying ? "Pause" : "Play"}
                        disabled={!currentTrack}
                      >
                        {isPlaying ? "⏸" : "▶"}
                      </button>

                      <div className="wv-scrubWrap" aria-label="Audio scrubber">
                        <input
                          type="range"
                          className="wv-scrub"
                          min={0}
                          max={audioDurationSec || 0}
                          step={1}
                          value={audioCurrentSec}
                          onMouseDown={() => setAudioSeeking(true)}
                          onMouseUp={() => setAudioSeeking(false)}
                          onTouchStart={() => setAudioSeeking(true)}
                          onTouchEnd={() => setAudioSeeking(false)}
                          onChange={(e) => seekAudioTo(Number(e.target.value))}
                          disabled={!currentTrack || !audioHasDuration}
                          aria-label="Seek"
                          style={{ "--wv-progress": `${audioProgressPct}%` }}
                        />
                        <div className="wv-timeRow">
                          <span className="wv-time">{formatSeconds(audioCurrentSec)}</span>
                          <span className="wv-time">{currentTrack ? currentTrack.duration : "0:00"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="wv-miniControls">
                      <button
                        type="button"
                        className={`wv-miniIcon ${currentTrackFav ? "wv-miniIcon--on" : ""}`}
                        onClick={() => currentTrack && toggleAudioFav(currentTrack.id)}
                        aria-label={currentTrackFav ? "Unbookmark audio" : "Bookmark audio"}
                        title={currentTrackFav ? "Remove bookmark" : "Bookmark"}
                        disabled={!currentTrack}
                      >
                        {currentTrackFav ? "🔖" : "📑"}
                      </button>

                      <button
                        type="button"
                        className="wv-miniBtn wv-miniBtn--ghost"
                        onClick={() => openPanel("audioLibrary")}
                        aria-label="Open audio library"
                        title="Audio library"
                      >
                        Library
                      </button>
                    </div>

                    <audio ref={audioRef} />

                    <div className="wv-miniHint">UI matches a standard mini-player. Audio src/API wiring can be dropped in later.</div>
                  </div>
                </div>
              ) : null}

              {/* STICKY MUSIC BAR (NOW BEHAVES LIKE AUDIO, MOCK) */}
              {musicBarOpen ? (
                <div className="wv-miniPlayer" aria-label="Music player">
                  <div className="wv-miniHead">
                    <div className="wv-miniTitle">Music</div>
                    <button
                      type="button"
                      className="wv-miniClose"
                      onClick={closeMusicBar}
                      aria-label="Close music bar"
                      title="Close"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="wv-miniBody">
                    <div className="wv-playerRow">
                      <button
                        type="button"
                        className="wv-iconPlay"
                        onClick={toggleMusicPlayPause}
                        aria-label={musicIsPlaying ? "Pause music" : "Play music"}
                        title={musicIsPlaying ? "Pause" : "Play"}
                      >
                        {musicIsPlaying ? "⏸" : "▶"}
                      </button>

                      <div className="wv-scrubWrap" aria-label="Music scrubber (mock)">
                        <input
                          type="range"
                          className="wv-scrub"
                          min={0}
                          max={musicDurationSec || 0}
                          step={1}
                          value={musicCurrentSec}
                          onMouseDown={() => setMusicSeeking(true)}
                          onMouseUp={() => setMusicSeeking(false)}
                          onTouchStart={() => setMusicSeeking(true)}
                          onTouchEnd={() => setMusicSeeking(false)}
                          onChange={(e) => seekMusicTo(Number(e.target.value))}
                          disabled={!musicHasDuration}
                          aria-label="Seek music"
                          style={{ "--wv-progress": `${musicProgressPct}%` }}
                        />
                        <div className="wv-timeRow">
                          <span className="wv-time">{formatSeconds(musicCurrentSec)}</span>
                          <span className="wv-time">{formatSeconds(musicDurationSec)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="wv-miniRow">
                      <div className="wv-miniLabel">Provider</div>
                      <div className="wv-miniPills">
                        <button
                          type="button"
                          className={`wv-miniPill ${musicProvider === "spotify" ? "wv-miniPill--active" : ""}`}
                          onClick={() => setMusicProvider("spotify")}
                        >
                          Spotify
                        </button>
                        <button
                          type="button"
                          className={`wv-miniPill ${musicProvider === "apple" ? "wv-miniPill--active" : ""}`}
                          onClick={() => setMusicProvider("apple")}
                        >
                          Apple
                        </button>
                        <button
                          type="button"
                          className={`wv-miniPill ${musicProvider === "youtube" ? "wv-miniPill--active" : ""}`}
                          onClick={() => setMusicProvider("youtube")}
                        >
                          YouTube
                        </button>
                      </div>
                    </div>

                    <div className="wv-miniRow">
                      <input
                        className="wv-miniInput"
                        value={musicQuery}
                        onChange={(e) => setMusicQuery(e.target.value)}
                        placeholder="Search playlist (API later)…"
                        aria-label="Music search"
                      />
                    </div>

                    <div className="wv-miniControls">
                      <button type="button" className="wv-miniBtn" onClick={() => {}} aria-label="Connect provider">
                        Connect
                      </button>
                    </div>

                    <div className="wv-miniHint">This is a functional mock: play/pause + seek + progress. Replace with real embed later.</div>
                  </div>
                </div>
              ) : null}
            </div>
          </aside>

          {/* RIGHT: main reading column */}
          <main className="wv-main" aria-label="Work reading area">
            <div className="wv-card">
              <div className="wv-header">
                <div className="wv-headerLeft">
                  <button type="button" className="wv-backBtn" onClick={handleBack} aria-label="Go back" title="Back">
                    ← Back
                  </button>

                  {canEdit ? (
                    <button type="button" className="wv-editBtn" onClick={handleEdit} aria-label="Edit your work" title="Edit work">
                      Edit
                    </button>
                  ) : null}
                </div>

                <div className="wv-headerMid">
                  <h1 className="wv-title">{title}</h1>

                  <div className="wv-meta" aria-label="Work metadata">
                    <span className="wv-metaItem">Language: {language}</span>
                    <span className="wv-dot">•</span>
                    <span className="wv-metaItem">Words: {wordCount}</span>
                    <span className="wv-dot">•</span>
                    <span className="wv-metaItem">Views: {views}</span>
                  </div>
                </div>

                <div className="wv-headerRight" aria-label="Reading actions">
                  <button
                    type="button"
                    className={`wv-iconBtn ${musicBarOpen ? "wv-iconBtn--active" : ""}`}
                    aria-label="Music"
                    title="Music"
                    onClick={() => (musicBarOpen ? setMusicBarOpen(false) : openMusicBar())}
                  >
                    ♫
                  </button>

                  <button
                    type="button"
                    className={`wv-iconBtn ${audioBarOpen ? "wv-iconBtn--active" : ""}`}
                    aria-label="Audio"
                    title="Audio"
                    onClick={toggleAudioBar}
                  >
                    🔊
                  </button>

                  <button
                    type="button"
                    className={`wv-iconBtn ${panel === "settings" ? "wv-iconBtn--active" : ""}`}
                    aria-label="Settings"
                    title="Reading settings"
                    onClick={() => openPanel("settings")}
                  >
                    ⚙
                  </button>

                  <button
                    type="button"
                    className={`wv-iconBtn ${isBookmarked ? "wv-iconBtn--bookmarkOn" : ""}`}
                    aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
                    title={isBookmarked ? "Remove bookmark" : "Bookmark"}
                    onClick={toggleWorkFavorite}
                  >
                    {isBookmarked ? "🔖" : "📑"}
                  </button>

                  <button
                    type="button"
                    className={`wv-iconBtn ${commentsOpen ? "wv-iconBtn--active" : ""}`}
                    aria-label={commentsOpen ? "Close comments" : "Open comments"}
                    title={commentsOpen ? "Close comments" : "Open comments"}
                    onClick={toggleComments}
                  >
                    💬
                  </button>
                </div>
              </div>

              <div className="wv-sep" aria-hidden="true" />

              <div className="wv-authorRow">
                <span className="wv-by">by</span>{" "}
                <Link
                  to={`/communities/${encodeURIComponent(authorHandle)}`}
                  className="wv-author"
                  aria-label={`Open ${authorHandle} community page`}
                >
                  {authorHandle}
                </Link>
              </div>

              {/* NEW: centered chapter label */}
              <div className="wv-chapterCenter" aria-label="Current chapter">
                Chapter {chapterNumber}
              </div>

              <div className="wv-sep wv-sep--soft" aria-hidden="true" />

              <article
                className="wv-body"
                aria-label="Work content"
                style={{
                  fontSize: `${prefs.fontSize}px`,
                  lineHeight: prefs.lineHeight,
                  maxWidth: `${prefs.width}px`,
                }}
              >
                {bodyBlocks.map((b, idx) => {
                  if (b.type === "img") {
                    if (!b.url || !isImageUrl(b.url)) return null;

                    return (
                      <figure key={`img-${idx}`} className="wv-figure" aria-label="Story image">
                        <img className="wv-image" src={b.url} alt={b.alt || "Story image"} loading="lazy" />
                      </figure>
                    );
                  }

                  return (
                    <p key={`p-${idx}`} className="wv-paragraph">
                      {b.text}
                    </p>
                  );
                })}
              </article>
            </div>

            {/* COMMENTS */}
            {commentsOpen ? (
              <section className="wv-comments" aria-label="Comments section">
                <div className="wv-commentsTop">
                  <div className="wv-commentsTitle">Comments</div>

                  <button type="button" className="wv-toggleComments" onClick={toggleComments} aria-label="Close comments">
                    Close
                  </button>
                </div>

                <div className="wv-commentComposer">
                  <textarea
                    className="wv-commentInput"
                    placeholder={isAuthed ? "Write a comment…" : "Log in to comment…"}
                    rows={3}
                    aria-label="Write a comment"
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    disabled={!isAuthed}
                  />

                  <div className="wv-commentActions">
                    {!isAuthed ? (
                      <button type="button" className="wv-primary" onClick={openLoginModal} aria-label="Log in to comment">
                        Log in to comment
                      </button>
                    ) : (
                      <button type="button" className="wv-secondary" onClick={handlePostComment} aria-label="Post comment">
                        Post
                      </button>
                    )}
                  </div>
                </div>

                <div className="wv-commentList" aria-label="Comment list">
                  {comments.map((c, i) => (
                    <div key={i} className="wv-comment">
                      <Link
                        to={`/communities/${encodeURIComponent(c.user)}`}
                        className="wv-commentUser"
                        aria-label={`Open ${c.user} community page`}
                      >
                        @{c.user}
                      </Link>
                      <div className="wv-commentText">{c.text}</div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </main>
        </div>

        {/* PANEL OVERLAY */}
        {panel ? (
          <div className="wv-overlay" role="dialog" aria-modal="true" aria-label="Work view panel">
            <div className="wv-overlayBackdrop" onMouseDown={() => setPanel(null)} aria-hidden="true" />

            <div className="wv-panel" onMouseDown={(e) => e.stopPropagation()}>
              <div className="wv-panelHead">
                <div className="wv-panelTitle">
                  {panel === "settings" ? "Reading Settings" : null}
                  {panel === "audioLibrary" ? "Audio Library" : null}
                </div>

                <button type="button" className="wv-panelClose" aria-label="Close panel" onClick={() => setPanel(null)}>
                  ✕
                </button>
              </div>

              {panel === "settings" ? (
                <div className="wv-panelBody">
                  <div className="wv-settingRow">
                    <label className="wv-settingLabel" htmlFor="wv-fontsize">
                      Font size
                    </label>
                    <input
                      id="wv-fontsize"
                      type="range"
                      min={13}
                      max={20}
                      value={prefs.fontSize}
                      onChange={(e) => setPrefs((p) => ({ ...p, fontSize: Number(e.target.value) }))}
                      aria-label="Font size"
                    />
                    <div className="wv-chip">{prefs.fontSize}px</div>
                  </div>

                  <div className="wv-settingRow">
                    <label className="wv-settingLabel" htmlFor="wv-lineheight">
                      Line height
                    </label>
                    <input
                      id="wv-lineheight"
                      type="range"
                      min={1.6}
                      max={2.3}
                      step={0.05}
                      value={prefs.lineHeight}
                      onChange={(e) => setPrefs((p) => ({ ...p, lineHeight: Number(e.target.value) }))}
                      aria-label="Line height"
                    />
                    <div className="wv-chip">{Number(prefs.lineHeight).toFixed(2)}</div>
                  </div>

                  <div className="wv-settingRow">
                    <label className="wv-settingLabel" htmlFor="wv-width">
                      Reading width
                    </label>
                    <input
                      id="wv-width"
                      type="range"
                      min={560}
                      max={900}
                      step={10}
                      value={prefs.width}
                      onChange={(e) => setPrefs((p) => ({ ...p, width: Number(e.target.value) }))}
                      aria-label="Reading width"
                    />
                    <div className="wv-chip">{prefs.width}px</div>
                  </div>

                  <div className="wv-settingRow">
                    <div className="wv-settingLabel">Theme</div>
                    <div className="wv-themeBtns">
                      <button
                        type="button"
                        className={`wv-miniBtn ${prefs.theme === "paper" ? "wv-miniBtn--active" : ""}`}
                        onClick={() => setPrefs((p) => ({ ...p, theme: "paper" }))}
                      >
                        Paper
                      </button>
                      <button
                        type="button"
                        className={`wv-miniBtn ${prefs.theme === "dark" ? "wv-miniBtn--active" : ""}`}
                        onClick={() => setPrefs((p) => ({ ...p, theme: "dark" }))}
                      >
                        Dark
                      </button>
                    </div>
                  </div>

                  <div className="wv-panelHint">Preferences save locally per-user (mock).</div>
                </div>
              ) : null}

              {panel === "audioLibrary" ? (
                <div className="wv-panelBody">
                  <div className="wv-panelHint">Pick an audio item — the sticky Audio bar stays in the sidebar and follows you.</div>

                  <div className="wv-audioList" aria-label="Audio list">
                    {audioTracks.map((t) => {
                      const selected = nowPlayingId === t.id;
                      const fav = Boolean(audioFavs?.[t.id]);

                      return (
                        <button
                          key={t.id}
                          type="button"
                          className={`wv-audioPick ${selected ? "wv-audioPick--active" : ""}`}
                          onClick={() => selectTrack(t)}
                          aria-label={`Select ${t.title}`}
                          title="Select audio"
                        >
                          <div className="wv-audioPickLeft">
                            <div className="wv-audioTitle">{t.title}</div>
                            <div className="wv-audioMeta">
                              <span>by {t.author}</span>
                              <span className="wv-dot">•</span>
                              <span>{t.duration}</span>
                            </div>
                          </div>

                          <div className="wv-audioPickRight">
                            <button
                              type="button"
                              className={`wv-favBtn ${fav ? "wv-favBtn--on" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleAudioFav(t.id);
                              }}
                              aria-label={fav ? "Unbookmark track" : "Bookmark track"}
                              title={fav ? "Remove bookmark" : "Bookmark"}
                            >
                              {fav ? "🔖" : "📑"}
                            </button>

                            <span className="wv-audioPickHint">{selected ? "Selected" : "Select"}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="wv-panelHint">Tip: The audio bar opens from 🔊 now — Library is just to choose what plays.</div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}









