import React from "react";
import { Link } from "react-router-dom";
import "./Bookmarks.css";

import { works as libraryWorks } from "../data/libraryWorks";

function normalizeUsernameFromAuthor(author) {
  const raw = String(author || "author").trim().toLowerCase();

  // Try to make something that looks like your existing usernames (john.doe, mira.ko, etc.)
  const base = raw
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/(^\.+|\.+$)/g, "")
    .replace(/\.\.+/g, ".");

  return base || "author";
}

function getBookmarkedWorks() {
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
  const bookmarkedWorks = React.useMemo(() => getBookmarkedWorks(), []);

  return (
    <div className="bookmarksPage">
      <h1 className="bookmarksTitle">Your Bookmarks</h1>

      <div className="bookmarksGrid" aria-label="Bookmarked works">
        {bookmarkedWorks.map((work) => (
          <article key={work.id} className="bookmarkCard" aria-label={`Bookmarked work: ${work.title}`}>
            <button
              type="button"
              className="bookmarkOpen"
              aria-label={`Open bookmarked work: ${work.title}`}
              onClick={() => {
                // Front-end placeholder (later: navigate to work detail page)
                // Example: navigate(`/works/${work.id}`)
                console.log("Open bookmark:", work);
              }}
            >
              <div className="coverWrap">
                {work.cover ? (
                  <img className="coverImg" src={work.cover} alt={`${work.title} cover`} />
                ) : (
                  <div className="coverPlaceholder" aria-hidden="true">
                    Cover
                  </div>
                )}
              </div>

              <div className="meta">
                <div className="workTitle">{work.title}</div>
              </div>
            </button>

            <div className="meta meta--footer">
              <Link className="workAuthor workAuthorLink" to={`/communities/${work.authorUsername}`}>
                {work.authorUsername}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}


