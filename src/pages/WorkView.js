import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import "./WorkView.css";

import { worksApi } from "../api";
import { works as libraryWorks } from "../data/libraryWorks";
import nightWoodsImg from "../assets/images/night_woods.png";

import musicIcon from "../assets/images/music_icon.png";
import settingsIcon from "../assets/images/settings_icon.png";
import commentsIcon from "../assets/images/comments_icon.png";
import bookmarkOffIcon from "../assets/images/bookmark_icon_off.png";
import bookmarkOnIcon from "../assets/images/bookmark_icon_on.png";

// Keep localStorage for view prefs, audio favs, bookmarks (Phase 2 will move bookmarks to API)
const VIEW_PREFS_KEY = "sable_workview_prefs_v1";
const AUDIO_FAVS_KEY = "sable_audio_favs_v1";
const WORK_FAVS_KEY = "sable_work_favs_v1"; // per-user bookmark state
const BOOKMARKS_KEY = "sable_bookmarks_v1"; // shared bookmarks list for Bookmarks page

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

  // if work has old single body format, wrap in a chapter
  if (w.body) {
    return [{ id: "c1", title: "Chapter 1", body: w.body }];
  }

  // Mock fallback for library works without chapters
  return [{ id: "c1", title: "Chapter 1", body: "" }];
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

  // Modal panel, settings + audio library picker
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

  // Audio progress UI 
  const [audioCurrentSec, setAudioCurrentSec] = React.useState(0);
  const [audioDurationSec, setAudioDurationSec] = React.useState(0);
  const [audioSeeking, setAudioSeeking] = React.useState(false);

  // Music provider state
  const [musicProvider, setMusicProvider] = React.useState("spotify");
  const [musicQuery, setMusicQuery] = React.useState("");
  const [musicIsPlaying, setMusicIsPlaying] = React.useState(false);
  const [musicCurrentSec, setMusicCurrentSec] = React.useState(0);
  const [musicDurationSec, setMusicDurationSec] = React.useState(210); // 3:30 mock
  const [musicSeeking, setMusicSeeking] = React.useState(false);

  // Persist view prefs per-user
  React.useEffect(() => {
    const all = loadJson(VIEW_PREFS_KEY, {});
    const next = { ...(all || {}) };
    next[normalizedUser] = { ...prefs };
    saveJson(VIEW_PREFS_KEY, next);
  }, [normalizedUser, prefs]);

  // Persist audio favs per-user
  React.useEffect(() => {
    const all = loadJson(AUDIO_FAVS_KEY, {});
    const next = { ...(all || {}) };
    next[normalizedUser] = { ...(audioFavs || {}) };
    saveJson(AUDIO_FAVS_KEY, next);
  }, [normalizedUser, audioFavs]);

  // Persist work favs per-user
  React.useEffect(() => {
    const all = loadJson(WORK_FAVS_KEY, {});
    const next = { ...(all || {}) };
    next[normalizedUser] = { ...(workFavs || {}) };
    saveJson(WORK_FAVS_KEY, next);
  }, [normalizedUser, workFavs]);

  // Load work from API or fall back to library works
  const [work, setWork] = React.useState(null);
  const [loadingWork, setLoadingWork] = React.useState(true);
  const [workError, setWorkError] = React.useState(null);

  React.useEffect(() => {
    async function loadWork() {
      setLoadingWork(true);
      setWorkError(null);

      // First check if it's a library work (static demo data)
      const library = libraryWorks.find((w) => String(w.id) === String(decodedId)) || null;
      if (library) {
        setWork(library);
        setLoadingWork(false);
        return;
      }

      // Otherwise fetch from API
      try {
        const data = await worksApi.get(decodedId);
        setWork(data.work);
      } catch (err) {
        setWorkError(err.message || "Failed to load work");
        setWork(null);
      } finally {
        setLoadingWork(false);
      }
    }

    loadWork();
  }, [decodedId]);

  const title = (work?.title || "Untitled").trim();
  const authorHandle = (work?.authorUsername || work?.author || "author").trim();

  const chapters = React.useMemo(() => getChaptersFromWork(work), [work]);
  const activeChapter = chapters.find((c) => String(c.id) === String(activeChapterId)) || chapters[0] || null;

  React.useEffect(() => {
    if (!chapters.length) return;
    if (!chapters.find((c) => c.id === activeChapterId)) setActiveChapterId(chapters[0].id);
  }, [chapters]);

  const bodyRaw = String(activeChapter?.body ?? work?.body ?? "");
  const blocks = React.useMemo(() => parseBodyToBlocks(bodyRaw), [bodyRaw]);

  const audioTracks = React.useMemo(() => getMockAudioTracks(decodedId, authorHandle), [decodedId, authorHandle]);
  const currentTrack = audioTracks.find((t) => t.id === nowPlayingId) || null;

  const currentTrackFav = currentTrack ? Boolean(audioFavs?.[currentTrack.id]) : false;

  const isBookmarked = Boolean(workFavs?.[decodedId]);

  const audioHasDuration = Boolean(audioDurationSec) || Boolean(currentTrack?.duration);
  const audioProgressPct = React.useMemo(() => {
    const dur = audioDurationSec || (currentTrack ? parseDurationToSeconds(currentTrack.duration) : 0);
    if (!dur) return 0;
    return Math.max(0, Math.min(100, (audioCurrentSec / dur) * 100));
  }, [audioCurrentSec, audioDurationSec, currentTrack]);

  const musicHasDuration = Boolean(musicDurationSec);
  const musicProgressPct = React.useMemo(() => {
    const dur = musicDurationSec || 0;
    if (!dur) return 0;
    return Math.max(0, Math.min(100, (musicCurrentSec / dur) * 100));
  }, [musicCurrentSec, musicDurationSec]);

  // Audio element events
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

  // Mock playback ticker
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

  // Music ticker
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
    // Navigate to work editor - uses work._id for API works or work.id for library works
    const workId = work._id || work.id;
    navigate(`/works/edit/${encodeURIComponent(workId)}`);
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

  function seekAudioTo(sec) {
    const el = audioRef.current;
    setAudioCurrentSec(sec);

    if (el && currentTrack && currentTrack.src) {
      try {
        el.currentTime = sec;
      } catch {
      
      }
    }
  }

  function closeAudioBar() {
    setAudioBarOpen(false);
    setIsPlaying(false);
    setAudioCurrentSec(0);
    stopAndResetAudioElement();
  }

  function toggleMusicBar() {
    setMusicBarOpen((v) => !v);
  }

  function closeMusicBar() {
    setMusicBarOpen(false);
    setMusicIsPlaying(false);
    setMusicCurrentSec(0);
  }

  function toggleMusicPlayPause() {
    setMusicIsPlaying((p) => !p);
  }

  function seekMusicTo(sec) {
    setMusicCurrentSec(sec);
  }

  function toggleBookmark() {
    if (!isAuthed) {
      openLoginModal();
      return;
    }

    const wasBookmarked = Boolean(workFavs?.[decodedId]);

    setWorkFavs((prev) => {
      const next = { ...(prev || {}) };
      next[decodedId] = !next[decodedId];
      return next;
    });
   
    try {
      const stored = JSON.parse(localStorage.getItem(BOOKMARKS_KEY)) || [];
      if (wasBookmarked) {
        // Remove from bookmarks
        const updated = stored.filter((b) => b.id !== decodedId);
        localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
      } else {
        // Add to bookmarks
        const bookmarkData = {
          id: decodedId,
          title: title,
          authorUsername: authorHandle,
          type: "work",
          workId: decodedId,
        };
        const updated = [bookmarkData, ...stored.filter((b) => b.id !== decodedId)];
        localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
      }
    } catch {
    }
  }

  const themeClass = prefs.theme === "dark" ? "wv-themeDark" : "wv-themePaper";

  // Loading state
  if (loadingWork) {
    return (
      <div className={`wv-page ${themeClass}`}>
        <div className="wv-shell">
          <p>Loading work...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (workError || !work) {
    return (
      <div className={`wv-page ${themeClass}`}>
        <div className="wv-shell">
          <p>{workError || "Work not found"}</p>
          <button type="button" onClick={() => navigate(-1)}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`wv-page ${themeClass}`}>
      <div className="wv-shell">
        <div className="wv-layout">
          {/* Sidebar */}
          <aside className="wv-toc" aria-label="Sidebar">
            <div className="wv-tocStack">
              {/* Chapters */}
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
                    {chaptersOpen ? "–" : "+"}
                  </button>
                </div>

                {chaptersOpen ? (
                  <div className="wv-chapterList" aria-label="Chapter list">
                    {chapters.map((c) => {
                      const active = String(c.id) === String(activeChapterId);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          className={`wv-chapterItem ${active ? "wv-chapterItem--active" : ""}`}
                          onClick={() => setActiveChapterId(c.id)}
                        >
                          {c.title}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="wv-tocHint">{chapters.length} chapters</div>
                )}
              </div>

              {/* Audio player */}
              {audioBarOpen ? (
                <div className="wv-miniPlayer" aria-label="Audio player">
                  <div className="wv-miniHead">
                    <div className="wv-miniTitle">Audio</div>
                    <button
                      type="button"
                      className="wv-miniClose"
                      onClick={closeAudioBar}
                      aria-label="Close audio bar"
                      title="Close"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="wv-miniBody">
                    <div className="wv-miniTrackTitle">{currentTrack ? currentTrack.title : "Select an audio track"}</div>
                    <div className="wv-miniTrackMeta">
                      <span>{currentTrack ? currentTrack.author : authorHandle}</span>
                      <span className="wv-dot">•</span>
                      <span>{currentTrack ? currentTrack.duration : "0:00"}</span>
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
                        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                        aria-label={currentTrackFav ? "Unbookmark audio" : "Bookmark audio"}
                        title={currentTrackFav ? "Remove bookmark" : "Bookmark"}
                        disabled={!currentTrack}
                      >
                        {currentTrackFav ? (
                          <img src={bookmarkOnIcon} alt="" aria-hidden="true" style={{ width: 18, height: 18, display: "block" }} />
                        ) : (
                          <img src={bookmarkOffIcon} alt="" aria-hidden="true" style={{ width: 18, height: 18, display: "block" }} />
                        )}
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

              {/* Stickyyy music barrr*/}
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
                      <div className="wv-miniLabel">Search</div>
                      <input
                        className="wv-miniInput"
                        value={musicQuery}
                        onChange={(e) => setMusicQuery(e.target.value)}
                        placeholder="Paste a track link or search…"
                        aria-label="Music search"
                      />
                    </div>

                    <div className="wv-miniHint">Mock music bar: provider + query state only. Wiring can come later.</div>
                  </div>
                </div>
              ) : null}
            </div>
          </aside>

          {/* Main */}
          <main className="wv-main" aria-label="Work content">
            <div className="wv-card">
              {/* Header */}
              <div className="wv-header">
                <div className="wv-headerLeft">
                  <button type="button" className="wv-backBtn" onClick={handleBack} aria-label="Go back" title="Back">
                    ← Back
                  </button>
                  <button type="button" className="wv-editBtn" onClick={handleEdit} aria-label="Edit work" title="Edit">
                    Edit
                  </button>
                </div>

                <div className="wv-headerMid">
                  <h1 className="wv-title">{title}</h1>
                  <div className="wv-meta">
                    <span className="wv-metaItem">
                      by <Link to={`/profile/${encodeURIComponent(authorHandle)}`}>{authorHandle}</Link>
                    </span>
                    <span className="wv-dot">•</span>
                    <span className="wv-metaItem">{chapters.length} chapters</span>
                  </div>
                </div>

                <div className="wv-headerRight">
                  {/* Music */}
                  <button
                    type="button"
                    className={`wv-iconBtn ${musicBarOpen ? "wv-iconBtn--active" : ""}`}
                    onClick={toggleMusicBar}
                    aria-label="Toggle music bar"
                    title="Music"
                  >
                    <img src={musicIcon} alt="" aria-hidden="true" style={{ width: 18, height: 18, display: "block" }} />
                  </button>

                  {/* Audio (to be changed later) */}
                  <button
                    type="button"
                    className={`wv-iconBtn ${audioBarOpen ? "wv-iconBtn--active" : ""}`}
                    onClick={toggleAudioBar}
                    aria-label="Toggle audio bar"
                    title="Audio"
                  >
                    🎧
                  </button>

                  {/* Settings */}
                  <button
                    type="button"
                    className={`wv-iconBtn ${panel === "settings" ? "wv-iconBtn--active" : ""}`}
                    onClick={() => openPanel("settings")}
                    aria-label="Open settings"
                    title="Settings"
                  >
                    <img src={settingsIcon} alt="" aria-hidden="true" style={{ width: 18, height: 18, display: "block" }} />
                  </button>

                  {/* Bookmark */}
                  <button
                    type="button"
                    className={`wv-iconBtn ${isBookmarked ? "wv-iconBtn--bookmarkOn" : ""}`}
                    onClick={toggleBookmark}
                    aria-label={isBookmarked ? "Remove bookmark" : "Bookmark this work"}
                    title={isBookmarked ? "Bookmarked" : "Bookmark"}
                  >
                    {isBookmarked ? (
                      <img src={bookmarkOnIcon} alt="" aria-hidden="true" style={{ width: 18, height: 18, display: "block" }} />
                    ) : (
                      <img src={bookmarkOffIcon} alt="" aria-hidden="true" style={{ width: 18, height: 18, display: "block" }} />
                    )}
                  </button>

                  {/* Comments */}
                  <button
                    type="button"
                    className={`wv-iconBtn ${commentsOpen ? "wv-iconBtn--active" : ""}`}
                    onClick={toggleComments}
                    aria-label="Toggle comments"
                    title="Comments"
                  >
                    <img src={commentsIcon} alt="" aria-hidden="true" style={{ width: 18, height: 18, display: "block" }} />
                  </button>
                </div>
              </div>

              <div className="wv-sep" />

              {/* Cover image */}
              <div className="wv-cover">
                <img className="wv-coverImg" src={nightWoodsImg} alt="" />
              </div>

              <div className="wv-sep wv-sep--soft" />

              {/* Current chapter indicator */}
              {chapters.length > 0 && (
                <div className="wv-currentChapter">
                  <span className="wv-currentChapterLabel">Currently Reading:</span>
                  <span className="wv-currentChapterTitle">{activeChapter?.title || "Chapter 1"}</span>
                  <span className="wv-currentChapterCount">
                    ({chapters.findIndex((c) => c.id === activeChapterId) + 1} of {chapters.length})
                  </span>
                </div>
              )}

              {/* Body */}
              <article
                className="wv-body"
                style={{
                  fontSize: `${prefs.fontSize}px`,
                  lineHeight: prefs.lineHeight,
                  maxWidth: `${prefs.width}px`,
                }}
              >
                {blocks.map((b, idx) => {
                  if (b.type === "img" && isImageUrl(b.url)) {
                    return (
                      <div key={`${b.url}_${idx}`} className="wv-inlineImgWrap">
                        <img className="wv-inlineImg" src={b.url} alt={b.alt || ""} />
                      </div>
                    );
                  }
                  return (
                    <p key={`${b.text}_${idx}`} className="wv-p">
                      {b.text}
                    </p>
                  );
                })}
              </article>

              {/* Comments panel */}
              {commentsOpen ? (
                <div className="wv-comments" aria-label="Comments">
                  <div className="wv-commentsTop">
                    <div className="wv-commentsTitle">Comments</div>
                    <button type="button" className="wv-toggleComments" onClick={toggleComments} aria-label="Close comments">
                      Close
                    </button>
                  </div>

                  <div className="wv-commentComposer">
                    <textarea
                      className="wv-commentInput"
                      value={commentDraft}
                      onChange={(e) => setCommentDraft(e.target.value)}
                      placeholder={isAuthed ? "Write a comment…" : "Log in to comment…"}
                      aria-label="Write a comment"
                      disabled={!isAuthed}
                    />
                    <button type="button" className="wv-commentPost" onClick={handlePostComment} disabled={!isAuthed}>
                      Post
                    </button>
                  </div>

                  <div className="wv-commentList" aria-label="Comment list">
                    {comments.map((c, idx) => (
                      <div key={`${c.user}_${idx}`} className="wv-comment">
                        <div className="wv-commentUser">@{c.user}</div>
                        <div className="wv-commentText">{c.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Modal panel, settings, audio library */}
            {panel ? (
              <div className="wv-panelOverlay" role="dialog" aria-modal="true" aria-label="Modal panel">
                <div className="wv-panel">
                  <div className="wv-panelTop">
                    <div className="wv-panelTitle">{panel === "settings" ? "Settings" : "Audio Library"}</div>
                    <button type="button" className="wv-panelClose" onClick={() => setPanel(null)} aria-label="Close panel">
                      ✕
                    </button>
                  </div>

                  <div className="wv-panelBody">
                    {panel === "settings" ? (
                      <>
                        <div className="wv-panelHint">These are view preferences stored per user in localStorage.</div>

                        <div className="wv-settingRow">
                          <label className="wv-settingLabel" htmlFor="wv-fontsize">
                            Font size
                          </label>
                          <input
                            id="wv-fontsize"
                            type="range"
                            min={13}
                            max={20}
                            step={1}
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
                              className={`wv-miniPill ${prefs.theme === "paper" ? "wv-miniPill--active" : ""}`}
                              onClick={() => setPrefs((p) => ({ ...p, theme: "paper" }))}
                            >
                              Paper
                            </button>
                            <button
                              type="button"
                              className={`wv-miniPill ${prefs.theme === "dark" ? "wv-miniPill--active" : ""}`}
                              onClick={() => setPrefs((p) => ({ ...p, theme: "dark" }))}
                            >
                              Dark
                            </button>
                          </div>
                          <div className="wv-chip">{prefs.theme}</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="wv-panelHint">Pick a track to “play”. This is still front-end mock behavior.</div>

                        <div className="wv-audioList" aria-label="Audio tracks">
                          {audioTracks.map((t) => {
                            const active = t.id === nowPlayingId;
                            const fav = Boolean(audioFavs?.[t.id]);

                            return (
                              <div
                                key={t.id}
                                className={`wv-audioPick ${active ? "wv-audioPick--active" : ""}`}
                                onClick={() => selectTrack(t)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") selectTrack(t);
                                }}
                              >
                                <div>
                                  <div className="wv-audioTitle">{t.title}</div>
                                  <div className="wv-audioMeta">
                                    <span>@{t.author}</span>
                                    <span className="wv-dot">•</span>
                                    <span>{t.duration}</span>
                                  </div>
                                </div>

                                <div className="wv-audioPickRight">
                                  <button
                                    type="button"
                                    className={`wv-favBtn ${fav ? "wv-favBtn--on" : ""}`}
                                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleAudioFav(t.id);
                                    }}
                                    aria-label={fav ? "Unbookmark track" : "Bookmark track"}
                                    title={fav ? "Remove bookmark" : "Bookmark"}
                                  >
                                    {fav ? (
                                      <img src={bookmarkOnIcon} alt="" aria-hidden="true" style={{ width: 18, height: 18, display: "block" }} />
                                    ) : (
                                      <img src={bookmarkOffIcon} alt="" aria-hidden="true" style={{ width: 18, height: 18, display: "block" }} />
                                    )}
                                  </button>
                                  <span className="wv-audioPickHint">{active ? "Now playing" : "Select"}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}








