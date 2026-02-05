import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Bookmarks.css";

import { works as libraryWorks } from "../data/libraryWorks";

// localstorage key for bookmarks, same as communities.js
const BOOKMARKS_KEY = "sable_bookmarks_v1";

function normalizeUsernameFromAuthor(author) {
  const raw = String(author || "author").trim().toLowerCase();

  const base = raw
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/(^\.+|\.+$)/g, "")
    .replace(/\.\.+/g, ".");

  return base || "author";
}

function getStoredBookmarks() {
  try {
    return JSON.parse(localStorage.getItem(BOOKMARKS_KEY)) || [];
  } catch {
    return [];
  }
}

function setStoredBookmarks(list) {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
}

function getBookmarkedWorks() {
  // Get bookmarks from localStorage
  const storedBookmarks = getStoredBookmarks();

  // If we have stored bookmarks, use those
  if (storedBookmarks.length > 0) {
    return storedBookmarks.map((b) => ({
      id: b.id,
      title: b.title || "Untitled",
      authorUsername: b.authorUsername || "author",
      cover: b.cover || null,
      type: b.type || "work",
      workId: b.workId || b.id,
    }));
  }

  // Fall back to mock data if no stored bookmarks
  const seeded = Array.isArray(libraryWorks) ? libraryWorks.slice(0, 12) : [];

  const normalized = seeded.map((w, idx) => {
    const authorUsername =
      w?.authorUsername ||
      w?.user?.handle ||
      w?.user?.username ||
      normalizeUsernameFromAuthor(w?.author);

    return {
      id: w?.id ?? `seed-${idx}`,
      title: w?.title ?? "Title",
      authorUsername,
      cover: w?.cover ?? w?.image ?? w?.img ?? null,
    };
  });

  if (normalized.length > 0) return normalized;

  return Array.from({ length: 12 }, (_, i) => ({
    id: `ph-${i + 1}`,
    title: "Title",
    authorUsername: "author",
    cover: null,
  }));
}

export default function Bookmarks() {
  const navigate = useNavigate();
  const [bookmarkedWorks, setBookmarkedWorks] = React.useState(() => getBookmarkedWorks());

  function removeBookmark(bookmarkId) {
    const storedBookmarks = getStoredBookmarks();
    const updated = storedBookmarks.filter((b) => b.id !== bookmarkId);
    setStoredBookmarks(updated);
    setBookmarkedWorks(getBookmarkedWorks());
  }

  function handleOpenBookmark(work) {
    // Navigate to the work if it has a workId, if not it just shows the title
    const targetId = work.workId || work.id;
    if (targetId && !targetId.startsWith("ph-") && !targetId.startsWith("p_")) {
      navigate(`/works/${encodeURIComponent(targetId)}`);
    }
  }

  return (
    <div className="bookmarksPage">
      <h1 className="bookmarksTitle">Your Bookmarks</h1>

      {bookmarkedWorks.length === 0 ? (
        <div className="bookmarksEmpty">
          <p>You haven't bookmarked anything yet.</p>
          <p>Browse the <Link to="/communities">Communities</Link> to find works to bookmark.</p>
        </div>
      ) : (
        <div className="bookmarksGrid" aria-label="Bookmarked works">
          {bookmarkedWorks.map((work) => (
            <article key={work.id} className="bookmarkCard" aria-label={`Bookmarked work: ${work.title}`}>
              <button
                type="button"
                className="bookmarkOpen"
                aria-label={`Open bookmarked work: ${work.title}`}
                onClick={() => handleOpenBookmark(work)}
              >
                <div className="coverWrap">
                  {work.cover ? (
                    <img className="coverImg" src={work.cover} alt={`${work.title} cover`} />
                  ) : (
                    <div className="coverPlaceholder" aria-hidden="true">
                      {work.type === "work" ? "Cover" : work.type?.charAt(0).toUpperCase() || "B"}
                    </div>
                  )}
                </div>

                <div className="meta">
                  <div className="workTitle">{work.title}</div>
                  {work.type && work.type !== "work" && (
                    <div className="workType">{work.type}</div>
                  )}
                </div>
              </button>

              <div className="meta meta--footer">
                <Link className="workAuthor workAuthorLink" to={`/communities/${work.authorUsername}`}>
                  {work.authorUsername}
                </Link>
                {getStoredBookmarks().some((b) => b.id === work.id) && (
                  <button
                    type="button"
                    className="bookmarkRemove"
                    onClick={() => removeBookmark(work.id)}
                    aria-label={`Remove bookmark: ${work.title}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}



