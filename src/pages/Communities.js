import React from "react";
import { Link } from "react-router-dom";
import "./Communities.css";

import { works as libraryWorks } from "../data/libraryWorks";
import { authApi, usersApi, followsApi } from "../api";

// localstorage keys for post interactions (likes/bookmarks only - follows use API)
const LIKES_KEY = "sable_likes_v1";
const BOOKMARKS_KEY = "sable_bookmarks_v1";

function getLikes() {
  try {
    return JSON.parse(localStorage.getItem(LIKES_KEY)) || [];
  } catch {
    return [];
  }
}

function setLikesStorage(list) {
  localStorage.setItem(LIKES_KEY, JSON.stringify(list));
}

function getBookmarks() {
  try {
    return JSON.parse(localStorage.getItem(BOOKMARKS_KEY)) || [];
  } catch {
    return [];
  }
}

function setBookmarksStorage(list) {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
}

// Trending topics - static UI elements for filtering
const TOPICS = [
  { id: "t1", label: "Writing Prompts" },
  { id: "t2", label: "Slow-burn Romance" },
  { id: "t3", label: "Dark Academia" },
  { id: "t4", label: "Worldbuilding" },
  { id: "t5", label: "Fanworks" },
  { id: "t6", label: "Audio Reads" },
];

function initials(name) {
  const s = (name || "U").trim();
  return (s[0] || "U").toUpperCase();
}

function TypePill({ type }) {
  const label =
    type === "work"
      ? "Work"
      : type === "audio"
      ? "Audio"
      : type === "skin"
      ? "Skin"
      : "Discussion";

  return <span className={`co-pill co-pill--${type}`}>{label}</span>;
}

function Avatar({ avatar, name }) {
  if (avatar) {
    return <img className="co-avatarImg" src={avatar} alt="" aria-hidden="true" />;
  }
  return (
    <div className="co-avatarFallback" aria-hidden="true">
      {initials(name)}
    </div>
  );
}

function openLoginModal() {
  window.dispatchEvent(new Event("sable:open-auth"));
}

export default function Communities({ isAuthed = false, username = "john.doe" }) {
  const [tab, setTab] = React.useState("Explore"); // Explore | Following | Discussions
  const [query, setQuery] = React.useState("");
  const [currentUser, setCurrentUser] = React.useState(null);
  const [suggestedUsers, setSuggestedUsers] = React.useState([]);
  const [loadingUsers, setLoadingUsers] = React.useState(true);

  // Fetch current user info
  React.useEffect(() => {
    if (isAuthed) {
      authApi.me().then((data) => {
        if (data && data.user && !data.error) {
          setCurrentUser(data.user);
        }
      }).catch(() => {});
    }
  }, [isAuthed]);

  // Fetch discoverable users
  React.useEffect(() => {
    async function loadUsers() {
      try {
        const data = await usersApi.getDiscoverable(10);
        if (data.users) {
          setSuggestedUsers(data.users);
        }
      } catch (err) {
        console.error("Failed to load suggested users:", err);
      } finally {
        setLoadingUsers(false);
      }
    }
    loadUsers();
  }, []);

  // Prevent auto-scroll on mount - use multiple strategies
  React.useEffect(() => {
    // Immediate scroll
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // Also scroll after a brief delay to catch any late-loading content
    const timer1 = setTimeout(() => {
      window.scrollTo(0, 0);
    }, 50);

    const timer2 = setTimeout(() => {
      window.scrollTo(0, 0);
    }, 150);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Composer (front-end only)
  const [postType, setPostType] = React.useState("post"); // post | discussion | upload
  const [draft, setDraft] = React.useState("");

  // Feed state - starts empty, to be populated from backend
  const [posts, setPosts] = React.useState([]);

  // Likes and bookmarks (localStorage for posts)
  const [likedPosts, setLikedPosts] = React.useState(() => getLikes());
  const [bookmarkedPosts, setBookmarkedPosts] = React.useState(() => getBookmarks());

  // Track follow state per user (managed via API)
  const [followingInProgress, setFollowingInProgress] = React.useState({});

  // Reply
  const [replyingTo, setReplyingTo] = React.useState(null);
  const [replyDraft, setReplyDraft] = React.useState("");

  const normalizedUsername = (username || "john.doe").trim().toLowerCase();

  function handleLike(postId) {
    if (likedPosts.includes(postId)) {
      // Unlike
      const updated = likedPosts.filter((id) => id !== postId);
      setLikedPosts(updated);
      setLikesStorage(updated);
    } else {
      // Like
      const updated = [...likedPosts, postId];
      setLikedPosts(updated);
      setLikesStorage(updated);
    }
  }

  function handleBookmark(postId, post) {
    if (bookmarkedPosts.some((b) => b.id === postId)) {
      // Remove bookmark
      const updated = bookmarkedPosts.filter((b) => b.id !== postId);
      setBookmarkedPosts(updated);
      setBookmarksStorage(updated);
    } else {
      // Add bookmark, store relevant info for bookmarks page
      const bookmarkData = {
        id: postId,
        title: post.title,
        authorUsername: post.user?.handle,
        type: post.type,
        workId: post.workId || null,
      };
      const updated = [...bookmarkedPosts, bookmarkData];
      setBookmarkedPosts(updated);
      setBookmarksStorage(updated);
    }
  }

  async function handleFollow(userId, isCurrentlyFollowing) {
    if (followingInProgress[userId]) return;

    setFollowingInProgress((prev) => ({ ...prev, [userId]: true }));

    try {
      if (isCurrentlyFollowing) {
        await followsApi.unfollow(userId);
        // Update local state
        setSuggestedUsers((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, isFollowing: false } : u))
        );
      } else {
        await followsApi.follow(userId);
        // Update local state
        setSuggestedUsers((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, isFollowing: true } : u))
        );
      }
    } catch (err) {
      console.error("Follow action failed:", err);
    } finally {
      setFollowingInProgress((prev) => ({ ...prev, [userId]: false }));
    }
  }

  function handleShare(post) {
    const url = post.type === "work" && post.workId
      ? `${window.location.origin}/works/${post.workId}`
      : window.location.href;

    if (navigator.share) {
      navigator.share({ title: post.title, url }).catch(() => {
        // User cancelled share or share failed ignore
      });
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  }

  function handleReply(postId) {
    if (replyingTo === postId) {
      setReplyingTo(null);
      setReplyDraft("");
    } else {
      setReplyingTo(postId);
      setReplyDraft("");
    }
  }

  function submitReply(postId) {
    if (!replyDraft.trim()) return;

    // In a real app, this would add a reply to the post
    // For now, it just closes the reply box and show confirmation

    alert(`Reply submitted: "${replyDraft}"`);
    setReplyingTo(null);
    setReplyDraft("");
  }

  function requireAuth(action) {
    if (isAuthed) {
      action?.();
      return true;
    }
    openLoginModal();
    return false;
  }

  function communityHrefFor(handle) {
    const h = (handle || "").trim().toLowerCase();
    if (h === "john.doe") {
      return isAuthed && normalizedUsername === "john.doe" ? "/communities/me" : "/communities/john.doe";
    }
    if (isAuthed && h === normalizedUsername) return "/communities/me";
    return `/communities/${handle}`;
  }

  function submitPost() {
    const text = draft.trim();
    if (!text) return;

    const userDisplay = currentUser?.displayName || currentUser?.username || normalizedUsername || "user";
    const userHandle = currentUser?.username || normalizedUsername || "user";
    const userAvatar = currentUser?.avatarUrl || "";

    const newPost = {
      id: `p_local_${Date.now()}`,
      type: postType === "discussion" ? "discussion" : "discussion",
      user: { handle: userHandle, display: userDisplay, avatar: userAvatar },
      time: "now",
      title: postType === "discussion" ? "New Discussion" : "Update",
      caption: text,
      meta: { replies: "0", likes: "0" },
      tags: [],
    };

    setPosts((prev) => [newPost, ...prev]);
    setDraft("");
    setPostType("update");
  }

  const filteredPosts = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? posts.filter((p) => {
          const hay = [p.title, p.caption, p.user?.handle, p.user?.display, ...(p.tags || [])]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return hay.includes(q);
        })
      : posts;

    if (tab === "Discussions") return base.filter((p) => p.type === "discussion");
    return base;
  }, [posts, query, tab]);

  // if a post is a work but lacks workId, try to resolve from library mock data by title
  function resolveWorkIdFromTitle(title) {
    const t = String(title || "").trim().toLowerCase();
    if (!t) return null;
    const found = (libraryWorks || []).find((w) => String(w.title || "").trim().toLowerCase() === t);
    return found?.id || null;
  }

  return (
    <div className="co-page" aria-label="Communities explore page">
      <div className="co-shell">
        {/* Left Sidebar */}
        <aside className="co-left" aria-label="Community center navigation">
          <div className="co-leftCard">
            <div className="co-leftTitle">Community Center</div>

            <div className="co-leftTabs" role="tablist" aria-label="Community tabs">
              {["Explore", "Following", "Discussions"].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={tab === t ? "co-leftTab co-leftTab--active" : "co-leftTab"}
                  onClick={() => setTab(t)}
                  role="tab"
                  aria-selected={tab === t ? "true" : "false"}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="co-leftSection">
              <div className="co-leftSectionTitle">Topics</div>
              <div className="co-topicList">
                {TOPICS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="co-topic"
                    onClick={() => setQuery(t.label)}
                    aria-label={`Search topic ${t.label}`}
                    title={`Search: ${t.label}`}
                  >
                    <span className="co-topicName">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </aside>

        {/* Main Feed */}
        <main className="co-main" aria-label="Explore feed">
          <div className="co-mainHeader">
            <div className="co-mainHeaderTop">
              <h1 className="co-title">Explore</h1>

              <div className="co-searchWrap" role="search" aria-label="Search community content">
                <span className="co-searchIcon" aria-hidden="true">
                  🔎
                </span>
                <input
                  className="co-searchInput"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search works, audios, skins, discussions..."
                  aria-label="Search"
                />
              </div>
            </div>

            <div className="co-filters" aria-label="Feed filters">
              <button
                type="button"
                className={tab === "Explore" ? "co-filter co-filter--active" : "co-filter"}
                onClick={() => setTab("Explore")}
              >
                Mixed Feed
              </button>
              <button
                type="button"
                className={tab === "Following" ? "co-filter co-filter--active" : "co-filter"}
                onClick={() => setTab("Following")}
              >
                Following
              </button>
              <button
                type="button"
                className={tab === "Discussions" ? "co-filter co-filter--active" : "co-filter"}
                onClick={() => setTab("Discussions")}
              >
                Discussions
              </button>

              <span className="co-filterSep" aria-hidden="true" />

              <button type="button" className="co-filter co-filter--ghost" onClick={() => {}}>
                Sort: Trending ▾
              </button>
            </div>
          </div>

          {/* Composer */}
          <section className="co-compose" aria-label="Create post">
            {isAuthed ? (
              <div className="co-composeLeft">
                <div className="co-composeAvatar" aria-hidden="true">
                  <Avatar avatar={currentUser?.avatarUrl || ""} name={currentUser?.displayName || currentUser?.username || username} />
                </div>

                <div className="co-composeBox">
                  <div className="co-composeHead">
                    <div className="co-composeTitle">Post to the Community</div>

                    <div className="co-composeType" aria-label="Post type">
                      <button
                        type="button"
                        className={postType === "post" ? "co-typeBtn co-typeBtn--active" : "co-typeBtn"}
                        onClick={() => setPostType("post")}
                      >
                        Post
                      </button>
                      <button
                        type="button"
                        className={
                          postType === "discussion" ? "co-typeBtn co-typeBtn--active" : "co-typeBtn"
                        }
                        onClick={() => setPostType("discussion")}
                      >
                        Discussion
                      </button>
                      <button
                        type="button"
                        className={postType === "upload" ? "co-typeBtn co-typeBtn--active" : "co-typeBtn"}
                        onClick={() => setPostType("upload")}
                      >
                        Upload
                      </button>
                    </div>
                  </div>

                  <textarea
                    className="co-composeInput"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={
                      postType === "discussion"
                        ? "Ask a question, start a thread..."
                        : postType === "upload"
                        ? "Describe what you're uploading..."
                        : "Share something with the community..."
                    }
                    aria-label="Write a post"
                    rows={2}
                  />

                  <div className="co-composeFooter">
                    <div className="co-composeHint">
                      <span>Front-end only: posting adds to the feed locally.</span>
                    </div>

                    <button type="button" className="co-postBtn" onClick={submitPost} aria-label="Post">
                      Post
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="co-composeLoggedOut"
                onClick={openLoginModal}
                aria-label="Log in to post"
              >
                <div className="co-composeLoggedOutTitle">Post to the Community</div>
                <div className="co-composeLoggedOutSub">Log in to start a discussion or share an update…</div>
              </button>
            )}
          </section>

          {/* Feed */}
          <section className="co-feed" aria-label="Posts">
            {filteredPosts.length === 0 ? (
              <div className="co-empty">
                {query ? "Nothing matched that search. Try different keywords." : "No posts yet. Be the first to share something with the community."}
              </div>
            ) : (
              filteredPosts.map((p) => {
                const workId = p.type === "work" ? p.workId || resolveWorkIdFromTitle(p.title) : null;

                return (
                  <article key={p.id} className="co-post" aria-label={`${p.type} post`}>
                    <div className="co-postTop">
                      <div className="co-postUser">
                        <Link
                          to={communityHrefFor(p.user.handle)}
                          className="co-userLink"
                          aria-label={`Open ${p.user.display} community page`}
                        >
                          <div className="co-avatar">
                            <Avatar avatar={p.user.avatar} name={p.user.display} />
                          </div>
                          <div className="co-userMeta">
                            <div className="co-userName">{p.user.display}</div>
                            <div className="co-userHandle">@{p.user.handle}</div>
                          </div>
                        </Link>
                      </div>

                      <div className="co-postRight">
                        <TypePill type={p.type} />
                        <div className="co-time">{p.time}</div>
                        <button type="button" className="co-more" aria-label="More actions" title="More">
                          ⋯
                        </button>
                      </div>
                    </div>

                    <div className="co-postBody">
                      {p.type === "work" && workId ? (
                        <Link
                          to={`/works/${encodeURIComponent(workId)}`}
                          className="co-postTitle"
                          style={{ color: "inherit", textDecoration: "none" }}
                          aria-label={`Open work: ${p.title}`}
                        >
                          {p.title}
                        </Link>
                      ) : (
                        <div className="co-postTitle">{p.title}</div>
                      )}

                      <div className="co-postCaption">{p.caption}</div>

                      <div className="co-postMeta" aria-label="Post metadata">
                        {p.type === "work" ? (
                          <>
                            <div className="co-metaItem">
                              <span className="co-metaLabel">Language:</span> {p.meta.language}
                            </div>
                            <div className="co-metaItem">
                              <span className="co-metaLabel">Word Count:</span> {p.meta.words}
                            </div>
                            <div className="co-metaItem">
                              <span className="co-metaLabel">Views:</span> {p.meta.views}
                            </div>
                          </>
                        ) : p.type === "discussion" ? (
                          <>
                            <div className="co-metaItem">
                              <span className="co-metaLabel">Replies:</span> {p.meta.replies}
                            </div>
                            <div className="co-metaItem">
                              <span className="co-metaLabel">Likes:</span> {p.meta.likes}
                            </div>
                          </>
                        ) : p.type === "skin" ? (
                          <>
                            <div className="co-metaItem">
                              <span className="co-metaLabel">Downloads:</span> {p.meta.downloads}
                            </div>
                            <div className="co-metaItem">
                              <span className="co-metaLabel">Likes:</span> {p.meta.likes}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="co-metaItem">
                              <span className="co-metaLabel">Length:</span> {p.meta.length}
                            </div>
                            <div className="co-metaItem">
                              <span className="co-metaLabel">Plays:</span> {p.meta.plays}
                            </div>
                          </>
                        )}
                      </div>

                      <div className="co-tags" aria-label="Tags">
                        {(p.tags || []).map((t) => (
                          <button
                            key={t}
                            type="button"
                            className="co-tag"
                            onClick={() => setQuery(t)}
                            aria-label={`Search tag ${t}`}
                          >
                            #{t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="co-postActions" aria-label="Post actions">
                      <button
                        type="button"
                        className={`co-action ${likedPosts.includes(p.id) ? "co-action--active" : ""}`}
                        onClick={() => requireAuth(() => handleLike(p.id))}
                      >
                        {likedPosts.includes(p.id) ? "♥ Liked" : "♡ Like"}
                      </button>
                      <button
                        type="button"
                        className={`co-action ${replyingTo === p.id ? "co-action--active" : ""}`}
                        onClick={() => requireAuth(() => handleReply(p.id))}
                      >
                        💬 Reply
                      </button>
                      <button type="button" className="co-action" onClick={() => handleShare(p)}>
                        ⤴ Share
                      </button>
                      <button
                        type="button"
                        className={`co-action co-action--ghost ${bookmarkedPosts.some((b) => b.id === p.id) ? "co-action--active" : ""}`}
                        onClick={() => requireAuth(() => handleBookmark(p.id, p))}
                      >
                        {bookmarkedPosts.some((b) => b.id === p.id) ? "✓ Bookmarked" : "Bookmark"}
                      </button>
                    </div>

                    {/* Reply input */}
                    {replyingTo === p.id && (
                      <div className="co-replyBox">
                        <textarea
                          className="co-replyInput"
                          value={replyDraft}
                          onChange={(e) => setReplyDraft(e.target.value)}
                          placeholder="Write a reply..."
                          rows={2}
                          autoFocus
                        />
                        <div className="co-replyActions">
                          <button type="button" className="co-replyCancel" onClick={() => setReplyingTo(null)}>
                            Cancel
                          </button>
                          <button type="button" className="co-replySubmit" onClick={() => submitReply(p.id)}>
                            Reply
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </section>
        </main>

        {/* Right Sidebar */}
        <aside className="co-right" aria-label="Suggestions and live activity">
          <div className="co-rightCard">
            <div className="co-rightTitle">Suggested Creators</div>

            {loadingUsers ? (
              <div className="co-suggestEmpty">Loading...</div>
            ) : suggestedUsers.length === 0 ? (
              <div className="co-suggestEmpty">
                No creators to suggest yet.
              </div>
            ) : (
              <div className="co-suggestList">
                {suggestedUsers.map((u) => (
                  <div key={u._id} className="co-suggest">
                    <Link
                      to={`/communities/${u.username}`}
                      className="co-suggestUser"
                      aria-label={`Open @${u.username}'s community page`}
                    >
                      <div className="co-avatar co-avatar--sm">
                        <Avatar avatar={u.avatarUrl} name={u.displayName || u.username} />
                      </div>
                      <div className="co-suggestMeta">
                        <div className="co-suggestName">@{u.username}</div>
                        {u.displayName && u.displayName !== u.username && (
                          <div className="co-suggestDisplayName">{u.displayName}</div>
                        )}
                        <div className="co-suggestFollowers">{u.stats?.followersCount || 0} followers</div>
                      </div>
                    </Link>

                    <button
                      type="button"
                      className={`co-followBtn ${u.isFollowing ? "co-followBtn--following" : ""}`}
                      onClick={() => requireAuth(() => handleFollow(u._id, u.isFollowing))}
                      disabled={followingInProgress[u._id]}
                    >
                      {followingInProgress[u._id]
                        ? "..."
                        : u.isFollowing
                        ? "Following"
                        : "Follow"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="co-rightCard">
            <div className="co-rightTitle">Live Discussions</div>
            <div className="co-liveEmpty">
              No active discussions right now. Start one in the feed.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}





