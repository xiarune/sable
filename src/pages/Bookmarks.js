import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Bookmarks.css";
import { bookmarksApi } from "../api";

export default function Bookmarks() {
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState("all"); // all, work, post

  React.useEffect(() => {
    async function loadBookmarks() {
      try {
        const type = filter === "all" ? undefined : filter;
        const data = await bookmarksApi.list(type, 1, 50);
        setBookmarks(data.bookmarks || []);
      } catch (err) {
        console.error("Failed to load bookmarks:", err);
      } finally {
        setLoading(false);
      }
    }

    loadBookmarks();
  }, [filter]);

  async function removeBookmark(bookmark) {
    try {
      if (bookmark.type === "work") {
        await bookmarksApi.unbookmarkWork(bookmark.workId);
      } else if (bookmark.type === "post") {
        await bookmarksApi.unbookmarkPost(bookmark.postId);
      }
      setBookmarks((prev) => prev.filter((b) => b._id !== bookmark._id));
    } catch (err) {
      console.error("Failed to remove bookmark:", err);
    }
  }

  function handleOpenBookmark(bookmark) {
    if (bookmark.type === "work" && bookmark.workId) {
      navigate(`/works/${bookmark.workId}`);
    } else if (bookmark.type === "post" && bookmark.postId) {
      // Navigate to post (community feed)
      navigate(`/communities`);
    }
  }

  if (loading) {
    return (
      <div className="bookmarksPage">
        <h1 className="bookmarksTitle">Your Bookmarks</h1>
        <div style={{ padding: 40, textAlign: "center" }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="bookmarksPage">
      <div className="bookmarksHeader">
        <h1 className="bookmarksTitle">Your Bookmarks</h1>

        <div className="bookmarksFilters">
          <button
            type="button"
            className={`bookmarksFilterBtn ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            type="button"
            className={`bookmarksFilterBtn ${filter === "work" ? "active" : ""}`}
            onClick={() => setFilter("work")}
          >
            Works
          </button>
          <button
            type="button"
            className={`bookmarksFilterBtn ${filter === "post" ? "active" : ""}`}
            onClick={() => setFilter("post")}
          >
            Posts
          </button>
        </div>
      </div>

      {bookmarks.length === 0 ? (
        <div className="bookmarksEmpty">
          <p>You haven't bookmarked anything yet.</p>
          <p>
            Browse the <Link to="/browse">library</Link> or{" "}
            <Link to="/communities">communities</Link> to find works to bookmark.
          </p>
        </div>
      ) : (
        <div className="bookmarksGrid" aria-label="Bookmarked items">
          {bookmarks.map((bookmark) => (
            <article
              key={bookmark._id}
              className="bookmarkCard"
              aria-label={`Bookmarked ${bookmark.type}: ${bookmark.title}`}
            >
              <button
                type="button"
                className="bookmarkOpen"
                aria-label={`Open: ${bookmark.title}`}
                onClick={() => handleOpenBookmark(bookmark)}
              >
                <div className="coverWrap">
                  {bookmark.coverUrl ? (
                    <img
                      className="coverImg"
                      src={bookmark.coverUrl}
                      alt={`${bookmark.title} cover`}
                    />
                  ) : (
                    <div className="coverPlaceholder" aria-hidden="true">
                      {bookmark.type === "work" ? "W" : "P"}
                    </div>
                  )}
                </div>

                <div className="meta">
                  <div className="workTitle">{bookmark.title || "Untitled"}</div>
                  <div className="workType">{bookmark.type}</div>
                </div>
              </button>

              <div className="meta meta--footer">
                <Link
                  className="workAuthor workAuthorLink"
                  to={`/communities/${bookmark.authorUsername || "unknown"}`}
                >
                  @{bookmark.authorUsername || "unknown"}
                </Link>
                <button
                  type="button"
                  className="bookmarkRemove"
                  onClick={() => removeBookmark(bookmark)}
                  aria-label={`Remove bookmark: ${bookmark.title}`}
                >
                  x
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
