import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import "./WorkView.css";
import "../styles/skins.css";

import { worksApi, bookmarksApi, commentsApi, skinsApi, likesApi, reportsApi } from "../api";
import { works as libraryWorks } from "../data/libraryWorks";
import { SableLoader } from "../components";

import musicIcon from "../assets/images/music_icon.png";
import settingsIcon from "../assets/images/settings_icon.png";
import commentsIcon from "../assets/images/comments_icon.png";
import bookmarkOffIcon from "../assets/images/bookmark_icon_off.png";
import bookmarkOnIcon from "../assets/images/bookmark_icon_on.png";

// Keep localStorage for view prefs only - bookmarks use API
const VIEW_PREFS_KEY = "sable_workview_prefs_v1";

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

// Mock audio tracks removed - now only real uploads are shown

function getWorkAudioTrack(work, authorHandle) {
  if (!work?.audioUrl) return null;
  return {
    id: `work_audio_${work._id || "main"}`,
    title: work.title || "Work Audio",
    author: authorHandle,
    duration: "0:00", // Will be calculated from actual audio
    src: work.audioUrl,
  };
}

function getChapterAudioTrack(chapter, authorHandle, workTitle) {
  if (!chapter?.audioUrl) return null;
  return {
    id: `chapter_audio_${chapter.id}`,
    title: chapter.title || "Chapter Audio",
    author: authorHandle,
    duration: "0:00", // Will be calculated from actual audio
    src: chapter.audioUrl,
  };
}

export default function WorkView({ isAuthed = false, username = "john.doe" }) {
  const navigate = useNavigate();
  const { workId } = useParams();

  const normalizedUser = (username || "john.doe").trim().toLowerCase();
  const decodedId = decodeURIComponent(workId || "");

  // Modal panel, settings + audio library picker
  const [panel, setPanel] = React.useState(null); // "settings" | "audioLibrary" | null

  // Chapters
  const [activeChapterId, setActiveChapterId] = React.useState("c1");

  // Comments
  const [commentsOpen, setCommentsOpen] = React.useState(false);
  const [commentDraft, setCommentDraft] = React.useState("");
  const [comments, setComments] = React.useState([]);
  const [commentsLoading, setCommentsLoading] = React.useState(false);

  // Load comments when work is loaded
  React.useEffect(() => {
    if (!decodedId) return;

    async function loadComments() {
      setCommentsLoading(true);
      try {
        const data = await commentsApi.list(decodedId, null, 1, 50);
        setComments(data.comments || []);
      } catch (err) {
        console.error("Failed to load comments:", err);
      } finally {
        setCommentsLoading(false);
      }
    }

    loadComments();
  }, [decodedId]);

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

  // Audio bookmarks (API-based)
  const [bookmarkedAudioIds, setBookmarkedAudioIds] = React.useState([]);

  // Work bookmark state (loaded from API)
  const [isBookmarked, setIsBookmarked] = React.useState(false);

  // Report modal state
  const [showReportModal, setShowReportModal] = React.useState(false);
  const [reportReason, setReportReason] = React.useState("");
  const [reportSubmitting, setReportSubmitting] = React.useState(false);
  const [reportSubmitted, setReportSubmitted] = React.useState(false);

  // Like/Love state
  const [likeStatus, setLikeStatus] = React.useState(null); // null, "like", or "love"
  const [likesCount, setLikesCount] = React.useState(0);
  const [lovesCount, setLovesCount] = React.useState(0);

  // Check bookmark status on load
  React.useEffect(() => {
    if (!isAuthed || !decodedId) return;

    async function checkBookmarkStatus() {
      try {
        const data = await bookmarksApi.check(decodedId, null, null);
        setIsBookmarked(Boolean(data.bookmarked));
      } catch {
        // Ignore errors - just leave as not bookmarked
      }
    }

    checkBookmarkStatus();
  }, [isAuthed, decodedId]);

  // Check like/love status on load
  React.useEffect(() => {
    if (!isAuthed || !decodedId) return;

    async function checkLikeStatus() {
      try {
        const data = await likesApi.check(decodedId, null, null);
        setLikeStatus(data.type || null);
      } catch {
        // Ignore errors
      }
    }

    checkLikeStatus();
  }, [isAuthed, decodedId]);

  // Load bookmarked audio tracks
  React.useEffect(() => {
    if (!isAuthed) return;

    async function loadAudioBookmarks() {
      try {
        const data = await bookmarksApi.list("audio");
        if (data?.bookmarks) {
          setBookmarkedAudioIds(data.bookmarks.map((b) => b.audioId));
        }
      } catch {
        // Ignore errors
      }
    }

    loadAudioBookmarks();
  }, [isAuthed]);

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
  const [musicProvider, setMusicProvider] = React.useState("youtube");
  const [musicQuery, setMusicQuery] = React.useState("");
  const [youtubeVideoId, setYoutubeVideoId] = React.useState(null);
  const [spotifyConnected, setSpotifyConnected] = React.useState(false);

  // Parse YouTube URL to extract video ID
  function parseYoutubeUrl(url) {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/, // Just the video ID
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  // Handle music query input (paste YouTube link)
  function handleMusicQuerySubmit() {
    if (musicProvider === "youtube") {
      const videoId = parseYoutubeUrl(musicQuery.trim());
      if (videoId) {
        setYoutubeVideoId(videoId);
      }
    }
  }

  // Handle Enter key in music input
  function handleMusicKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleMusicQuerySubmit();
    }
  }

  // Clear YouTube video
  function clearYoutubeVideo() {
    setYoutubeVideoId(null);
    setMusicQuery("");
  }

  // Persist view prefs per-user
  React.useEffect(() => {
    const all = loadJson(VIEW_PREFS_KEY, {});
    const next = { ...(all || {}) };
    next[normalizedUser] = { ...prefs };
    saveJson(VIEW_PREFS_KEY, next);
  }, [normalizedUser, prefs]);

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

  // Update counts when work loads
  React.useEffect(() => {
    if (work) {
      setLikesCount(work.likesCount || 0);
      setLovesCount(work.lovesCount || 0);
    }
  }, [work]);

  // Custom skin CSS
  const [customSkinCss, setCustomSkinCss] = React.useState("");

  // Load custom skin CSS if work uses one
  React.useEffect(() => {
    if (!work?.customSkinId) {
      setCustomSkinCss("");
      return;
    }

    async function loadCustomSkin() {
      try {
        const data = await skinsApi.get(work.customSkinId);
        if (data.skin?.css) {
          setCustomSkinCss(data.skin.css);
        }
      } catch {
        // Skin not found or not accessible - use built-in skin styling
        setCustomSkinCss("");
      }
    }

    loadCustomSkin();
  }, [work?.customSkinId]);

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

  const audioTracks = React.useMemo(() => {
    const tracks = [];
    // Add current chapter's audio track if it exists
    const chapterAudioTrack = getChapterAudioTrack(activeChapter, authorHandle, title);
    if (chapterAudioTrack) {
      tracks.push(chapterAudioTrack);
    }
    // Also add work-level audio if it exists (for backwards compatibility)
    const workAudioTrack = getWorkAudioTrack(work, authorHandle);
    if (workAudioTrack) {
      tracks.push(workAudioTrack);
    }
    return tracks;
  }, [authorHandle, work, activeChapter, title]);
  const currentTrack = audioTracks.find((t) => t.id === nowPlayingId) || null;

  const currentTrackFav = currentTrack ? bookmarkedAudioIds.includes(currentTrack.id) : false;

  const audioHasDuration = Boolean(audioDurationSec) || Boolean(currentTrack?.duration);
  const audioProgressPct = React.useMemo(() => {
    const dur = audioDurationSec || (currentTrack ? parseDurationToSeconds(currentTrack.duration) : 0);
    if (!dur) return 0;
    return Math.max(0, Math.min(100, (audioCurrentSec / dur) * 100));
  }, [audioCurrentSec, audioDurationSec, currentTrack]);

  // Audio element events - re-run when audioBarOpen changes so listeners attach when element renders
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
  }, [audioSeeking, audioBarOpen]);

  // Track to auto-play when audio bar opens
  const [pendingAutoPlay, setPendingAutoPlay] = React.useState(false);

  // Effect to load audio source when bar opens with a track selected
  React.useEffect(() => {
    if (!audioBarOpen || !currentTrack?.src) return;

    const el = audioRef.current;
    if (!el) return;

    // Only set src if it's different or not set
    if (el.src !== currentTrack.src) {
      el.src = currentTrack.src;
      if (pendingAutoPlay) {
        el.play().catch(() => {});
        setPendingAutoPlay(false);
      }
    }
  }, [audioBarOpen, currentTrack, pendingAutoPlay]);

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

  async function handlePostComment() {
    if (!isAuthed) {
      openLoginModal();
      return;
    }
    const text = commentDraft.trim();
    if (!text) return;

    setCommentDraft("");

    try {
      const data = await commentsApi.create(text, decodedId, null, null);
      // Add the new comment to the top of the list
      setComments((prev) => [data.comment, ...prev]);
    } catch (err) {
      console.error("Failed to post comment:", err);
      // Restore the draft if posting failed
      setCommentDraft(text);
    }
  }

  async function handleDeleteComment(commentId) {
    try {
      await commentsApi.delete(commentId);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  }

  function openPanel(name) {
    setPanel((prev) => (prev === name ? null : name));
  }

  async function toggleAudioFav(trackId) {
    if (!isAuthed) {
      openLoginModal();
      return;
    }

    const isCurrentlyBookmarked = bookmarkedAudioIds.includes(trackId);
    const track = audioTracks.find((t) => t.id === trackId);

    // Optimistic update
    if (isCurrentlyBookmarked) {
      setBookmarkedAudioIds((prev) => prev.filter((id) => id !== trackId));
    } else {
      setBookmarkedAudioIds((prev) => [...prev, trackId]);
    }

    try {
      if (isCurrentlyBookmarked) {
        await bookmarksApi.unbookmarkAudio(trackId);
      } else {
        await bookmarksApi.bookmarkAudio(
          trackId,
          work?._id || work?.id,
          track?.title || "Audio Track",
          authorHandle
        );
      }
    } catch (err) {
      // Revert on error
      if (isCurrentlyBookmarked) {
        setBookmarkedAudioIds((prev) => [...prev, trackId]);
      } else {
        setBookmarkedAudioIds((prev) => prev.filter((id) => id !== trackId));
      }
      console.error("Failed to toggle audio bookmark:", err);
    }
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

    if (!track.src) {
      // Mock track without real audio
      setIsPlaying(true);
      return;
    }

    if (!el) {
      // Audio element not rendered yet - schedule auto-play for when it renders
      setPendingAutoPlay(true);
      return;
    }

    // Audio element exists - play immediately
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
    setYoutubeVideoId(null);
    setMusicQuery("");
  }

  async function toggleBookmark() {
    if (!isAuthed) {
      openLoginModal();
      return;
    }

    // Optimistic update
    const wasBookmarked = isBookmarked;
    setIsBookmarked(!wasBookmarked);

    try {
      if (wasBookmarked) {
        await bookmarksApi.unbookmarkWork(decodedId);
      } else {
        await bookmarksApi.bookmarkWork(decodedId);
      }
    } catch (err) {
      // Revert on error
      setIsBookmarked(wasBookmarked);
      console.error("Failed to toggle bookmark:", err);
    }
  }

  async function handleLike() {
    if (!isAuthed) {
      openLoginModal();
      return;
    }

    const prevStatus = likeStatus;
    const prevLikes = likesCount;
    const prevLoves = lovesCount;

    // Optimistic update
    if (likeStatus === "like") {
      setLikeStatus(null);
      setLikesCount((c) => Math.max(0, c - 1));
    } else {
      if (likeStatus === "love") {
        setLovesCount((c) => Math.max(0, c - 1));
      }
      setLikeStatus("like");
      setLikesCount((c) => c + 1);
    }

    try {
      if (prevStatus === "like") {
        await likesApi.unlikeWork(decodedId);
      } else {
        await likesApi.likeWork(decodedId);
      }
    } catch (err) {
      // Revert on error
      setLikeStatus(prevStatus);
      setLikesCount(prevLikes);
      setLovesCount(prevLoves);
      console.error("Failed to like work:", err);
    }
  }

  async function handleLove() {
    if (!isAuthed) {
      openLoginModal();
      return;
    }

    const prevStatus = likeStatus;
    const prevLikes = likesCount;
    const prevLoves = lovesCount;

    // Optimistic update
    if (likeStatus === "love") {
      setLikeStatus(null);
      setLovesCount((c) => Math.max(0, c - 1));
    } else {
      if (likeStatus === "like") {
        setLikesCount((c) => Math.max(0, c - 1));
      }
      setLikeStatus("love");
      setLovesCount((c) => c + 1);
    }

    try {
      if (prevStatus === "love") {
        await likesApi.unlikeWork(decodedId);
      } else {
        await likesApi.loveWork(decodedId);
      }
    } catch (err) {
      // Revert on error
      setLikeStatus(prevStatus);
      setLikesCount(prevLikes);
      setLovesCount(prevLoves);
      console.error("Failed to love work:", err);
    }
  }

  function openReportModal() {
    if (!isAuthed) {
      openLoginModal();
      return;
    }
    setShowReportModal(true);
    setReportReason("");
    setReportSubmitted(false);
  }

  function closeReportModal() {
    setShowReportModal(false);
    setReportReason("");
    setReportSubmitting(false);
  }

  async function submitReport() {
    if (!reportReason.trim()) return;

    setReportSubmitting(true);

    try {
      await reportsApi.create("work", decodedId, reportReason.trim(), "");
      setReportSubmitting(false);
      setReportSubmitted(true);
      // Auto-close after showing success message
      setTimeout(() => {
        closeReportModal();
      }, 2000);
    } catch (err) {
      console.error("Failed to submit report:", err);
      setReportSubmitting(false);
    }
  }

  const themeClass = prefs.theme === "dark" ? "wv-themeDark" : "wv-themePaper";

  // Determine skin class from work.skin - default to "default" if not set
  const skinName = (work?.skin || "Default").toLowerCase().replace(/\s+/g, "-");
  const skinClass = `skin-${skinName}`;

  // Loading state
  if (loadingWork) {
    return (
      <div className={`wv-page ${themeClass} skin-default`}>
        <SableLoader />
      </div>
    );
  }

  // Error state
  if (workError || !work) {
    return (
      <div className={`wv-page ${themeClass} skin-default`}>
        <div className="wv-shell">
          <p>{workError || "Work not found"}</p>
          <button type="button" onClick={() => navigate(-1)}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`wv-page ${themeClass} ${skinClass}`}>
      {/* Inject custom skin CSS */}
      {customSkinCss && (
        <style dangerouslySetInnerHTML={{ __html: customSkinCss }} />
      )}
      <div className="wv-shell">
        <div className="wv-layout">
          {/* Sidebar */}
          <aside className="wv-toc" aria-label="Sidebar">
            <div className="wv-tocStack">
              {/* Chapters - Hero style with nav buttons */}
              <div className="wv-tocCard wv-chapterHero">
                <div className="wv-chapterHeroTitle">
                  {activeChapter?.title || "Chapter 1"}
                </div>
                <div className="wv-chapterHeroMeta">
                  {chapters.findIndex((c) => c.id === activeChapterId) + 1} of {chapters.length}
                </div>
                <div className="wv-chapterHeroNav">
                  <button
                    type="button"
                    className="wv-chapterNavBtn"
                    onClick={() => {
                      const idx = chapters.findIndex((c) => c.id === activeChapterId);
                      if (idx > 0) setActiveChapterId(chapters[idx - 1].id);
                    }}
                    disabled={chapters.findIndex((c) => c.id === activeChapterId) === 0}
                    aria-label="Previous chapter"
                    title="Previous"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className="wv-chapterNavBtn"
                    onClick={() => {
                      const idx = chapters.findIndex((c) => c.id === activeChapterId);
                      if (idx < chapters.length - 1) setActiveChapterId(chapters[idx + 1].id);
                    }}
                    disabled={chapters.findIndex((c) => c.id === activeChapterId) === chapters.length - 1}
                    aria-label="Next chapter"
                    title="Next"
                  >
                    →
                  </button>
                </div>
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
                          <span className="wv-time">{audioDurationSec ? formatSeconds(audioDurationSec) : (currentTrack?.duration || "0:00")}</span>
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
                  </div>
                </div>
              ) : null}

              {/* Music player */}
              {musicBarOpen ? (
                <div className="wv-miniPlayer wv-musicPlayer" aria-label="Music player">
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
                    {/* Provider selection */}
                    <div className="wv-miniRow">
                      <div className="wv-miniLabel">Provider</div>
                      <div className="wv-miniPills">
                        <button
                          type="button"
                          className={`wv-miniPill ${musicProvider === "youtube" ? "wv-miniPill--active" : ""}`}
                          onClick={() => setMusicProvider("youtube")}
                        >
                          YouTube
                        </button>
                        <button
                          type="button"
                          className={`wv-miniPill ${musicProvider === "spotify" ? "wv-miniPill--active" : ""}`}
                          onClick={() => setMusicProvider("spotify")}
                        >
                          Spotify
                        </button>
                      </div>
                    </div>

                    {/* YouTube provider */}
                    {musicProvider === "youtube" && (
                      <>
                        {youtubeVideoId ? (
                          <div className="wv-youtubeEmbed">
                            <iframe
                              src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&enablejsapi=1`}
                              title="YouTube music player"
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                            <button
                              type="button"
                              className="wv-miniBtn"
                              onClick={clearYoutubeVideo}
                              style={{ marginTop: 8 }}
                            >
                              Clear
                            </button>
                          </div>
                        ) : (
                          <div className="wv-miniRow">
                            <div className="wv-miniLabel">Paste YouTube Link</div>
                            <div className="wv-musicInputRow">
                              <input
                                className="wv-miniInput"
                                value={musicQuery}
                                onChange={(e) => setMusicQuery(e.target.value)}
                                onKeyDown={handleMusicKeyDown}
                                placeholder="https://youtube.com/watch?v=..."
                                aria-label="YouTube link"
                              />
                              <button
                                type="button"
                                className="wv-miniBtn wv-miniBtn--play"
                                onClick={handleMusicQuerySubmit}
                                disabled={!musicQuery.trim()}
                              >
                                Play
                              </button>
                            </div>
                            <div className="wv-miniHint">
                              Paste a YouTube video or music link and press Play
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Spotify provider */}
                    {musicProvider === "spotify" && (
                      <div className="wv-providerConnect">
                        {spotifyConnected ? (
                          <div className="wv-connectedState">
                            <div className="wv-connectedBadge">
                              <span className="wv-connectedDot" />
                              Connected to Spotify
                            </div>
                            <div className="wv-miniRow">
                              <div className="wv-miniLabel">Search or paste link</div>
                              <input
                                className="wv-miniInput"
                                placeholder="Search tracks, albums, playlists..."
                                aria-label="Spotify search"
                              />
                            </div>
                            <button
                              type="button"
                              className="wv-disconnectBtn"
                              onClick={() => setSpotifyConnected(false)}
                            >
                              Disconnect
                            </button>
                          </div>
                        ) : (
                          <div className="wv-connectPrompt">
                            <div className="wv-providerLogo wv-providerLogo--spotify">
                              <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                              </svg>
                            </div>
                            <div className="wv-connectText">
                              Connect your Spotify account to play music while you read
                            </div>
                            <button
                              type="button"
                              className="wv-connectBtn wv-connectBtn--spotify"
                              onClick={() => setSpotifyConnected(true)}
                            >
                              Connect Spotify
                            </button>
                            <div className="wv-connectNote">
                              Requires Spotify Premium for full playback
                            </div>
                          </div>
                        )}
                      </div>
                    )}

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
                  {isAuthed && normalizedUser === authorHandle.toLowerCase() && (
                    <button type="button" className="wv-editBtn" onClick={handleEdit} aria-label="Edit work" title="Edit">
                      Edit
                    </button>
                  )}
                </div>

                <div className="wv-headerMid">
                  <h1 className="wv-title">{title}</h1>
                  <div className="wv-meta">
                    <span className="wv-metaItem">
                      by <Link to={`/communities/${encodeURIComponent(authorHandle)}`} className="wv-authorLink">{authorHandle}</Link>
                    </span>
                    <span className="wv-dot">•</span>
                    <span className="wv-metaItem">{chapters.length} chapters</span>
                    {work?.language && (
                      <>
                        <span className="wv-dot">•</span>
                        <span className="wv-metaItem">{work.language}</span>
                      </>
                    )}
                  </div>
                  {/* Genre, Fandom, Tags */}
                  <div className="wv-workInfo">
                    {work?.genre && (
                      <span className="wv-infoPill wv-infoPill--genre">{work.genre}</span>
                    )}
                    {work?.fandom && work.fandom !== "Original Work" && (
                      <span className="wv-infoPill wv-infoPill--fandom">{work.fandom}</span>
                    )}
                    {work?.fandom === "Original Work" && (
                      <span className="wv-infoPill wv-infoPill--original">Original Work</span>
                    )}
                  </div>
                  {work?.tags && work.tags.length > 0 && (
                    <div className="wv-tags">
                      {work.tags.map((tag) => {
                        const tagSlug = tag.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
                        return (
                          <Link
                            key={tag}
                            to={`/tags/${encodeURIComponent(tagSlug)}`}
                            className="wv-tag"
                          >
                            #{tag}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

              <div className="wv-sep" />

              {/* Action bar - likes, bookmark, comments, report */}
              <div className="wv-actionBar">
                {/* Edit - only for author */}
                {normalizedUser === authorHandle.toLowerCase() && (
                  <button
                    type="button"
                    className="wv-iconBtn wv-iconBtn--edit"
                    onClick={handleEdit}
                    aria-label="Edit this work"
                    title="Edit"
                  >
                    <span style={{ fontSize: 16 }}>&#9998;</span>
                  </button>
                )}

                {/* Like */}
                <button
                  type="button"
                  className={`wv-iconBtn ${likeStatus === "like" ? "wv-iconBtn--liked" : ""}`}
                  onClick={handleLike}
                  aria-label={likeStatus === "like" ? "Unlike" : "Like"}
                  title={`Like (${likesCount})`}
                >
                  <span style={{ fontSize: 16 }}>{likeStatus === "like" ? "👍" : "👍"}</span>
                  {likesCount > 0 && <span className="wv-iconCount">{likesCount}</span>}
                </button>

                {/* Love */}
                <button
                  type="button"
                  className={`wv-iconBtn ${likeStatus === "love" ? "wv-iconBtn--loved" : ""}`}
                  onClick={handleLove}
                  aria-label={likeStatus === "love" ? "Unlove" : "Love"}
                  title={`Love (${lovesCount})`}
                >
                  <span style={{ fontSize: 16 }}>{likeStatus === "love" ? "❤️" : "🤍"}</span>
                  {lovesCount > 0 && <span className="wv-iconCount">{lovesCount}</span>}
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

                {/* Report - only show for non-authors */}
                {normalizedUser !== authorHandle.toLowerCase() && (
                  <button
                    type="button"
                    className="wv-iconBtn"
                    onClick={openReportModal}
                    aria-label="Report this work"
                    title="Report"
                  >
                    <span style={{ fontSize: 16 }}>&#9888;</span>
                  </button>
                )}

                <span className="wv-actionDivider" />

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

                {/* Audio */}
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
              </div>

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

              {/* Audio from author - chapter audio takes priority */}
              {(activeChapter?.audioUrl || work?.audioUrl) && (
                <div className="wv-authorAudio">
                  <div className="wv-authorAudioLabel">
                    {activeChapter?.audioUrl ? `Audio for ${activeChapter.title || "this chapter"}` : "Author's Audio"}
                  </div>
                  <button
                    type="button"
                    className="wv-playAudioBtn"
                    onClick={() => {
                      // Select chapter audio first, fall back to work audio
                      const chapterTrack = audioTracks.find(t => t.src === activeChapter?.audioUrl);
                      const workTrack = audioTracks.find(t => t.src === work?.audioUrl);
                      if (chapterTrack) selectTrack(chapterTrack);
                      else if (workTrack) selectTrack(workTrack);
                      else setAudioBarOpen(true);
                    }}
                  >
                    Play in Audio Player
                  </button>
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
                    {commentsLoading ? (
                      <div className="wv-commentsLoading">Loading comments...</div>
                    ) : comments.length === 0 ? (
                      <div className="wv-commentsEmpty">No comments yet. Be the first to share your thoughts!</div>
                    ) : (
                      comments.map((c) => (
                        <div key={c._id} className="wv-comment">
                          <div className="wv-commentHeader">
                            <Link to={`/communities/${c.authorUsername}`} className="wv-commentUser">
                              @{c.authorUsername}
                            </Link>
                            {normalizedUser === c.authorUsername?.toLowerCase() && (
                              <button
                                type="button"
                                className="wv-commentDelete"
                                onClick={() => handleDeleteComment(c._id)}
                                aria-label="Delete comment"
                              >
                                x
                              </button>
                            )}
                          </div>
                          <div className="wv-commentText">{c.text}</div>
                        </div>
                      ))
                    )}
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
                        <div className="wv-panelHint">Customize your reading experience</div>

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
                        <div className="wv-panelHint">{audioTracks.length ? "Select a track to play" : "No audio tracks available for this work"}</div>

                        <div className="wv-audioList" aria-label="Audio tracks">
                          {audioTracks.map((t) => {
                            const active = t.id === nowPlayingId;
                            const fav = bookmarkedAudioIds.includes(t.id);

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

            {/* Report Modal */}
            {showReportModal && (
              <div className="wv-panelOverlay" role="dialog" aria-modal="true" aria-label="Report work">
                <div className="wv-panel" style={{ maxWidth: 480 }}>
                  <div className="wv-panelTop">
                    <div className="wv-panelTitle">Report Work</div>
                    <button
                      type="button"
                      className="wv-panelClose"
                      onClick={closeReportModal}
                      disabled={reportSubmitting}
                      aria-label="Close report modal"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="wv-panelBody">
                    {reportSubmitted ? (
                      <div className="wv-reportSuccess">
                        <div className="wv-reportSuccess-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </div>
                        <div className="wv-reportSuccess-title">Report Submitted</div>
                        <div className="wv-reportSuccess-message">Thank you for helping keep Sable safe.</div>
                        <div className="wv-reportSuccess-note">Our team will review this report and take appropriate action.</div>
                      </div>
                    ) : (
                      <>
                        <div className="wv-panelHint">
                          Please select a reason for reporting this work.
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {[
                            { value: "spam", label: "Spam or misleading content" },
                            { value: "harassment", label: "Harassment" },
                            { value: "hate_speech", label: "Hate speech" },
                            { value: "copyright", label: "Copyright infringement" },
                            { value: "inappropriate_content", label: "Inappropriate content (not properly tagged)" },
                            { value: "violence", label: "Violence or threats" },
                            { value: "other", label: "Other" },
                          ].map((reason) => (
                            <button
                              key={reason.value}
                              type="button"
                              className={`wv-miniPill ${reportReason === reason.value ? "wv-miniPill--active" : ""}`}
                              onClick={() => setReportReason(reason.value)}
                              style={{ textAlign: "left", padding: "10px 14px" }}
                            >
                              {reason.label}
                            </button>
                          ))}
                        </div>
                        <div style={{ marginTop: 16, display: "flex", gap: 10, justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            className="wv-backBtn"
                            onClick={closeReportModal}
                            disabled={reportSubmitting}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="wv-backBtn"
                            style={{
                              background: reportReason ? "rgba(180, 60, 60, 0.85)" : "rgba(180, 60, 60, 0.4)",
                              color: "white",
                              borderColor: "rgba(180, 60, 60, 0.5)",
                            }}
                            onClick={submitReport}
                            disabled={!reportReason || reportSubmitting}
                          >
                            {reportSubmitting ? "Submitting..." : "Submit Report"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}








