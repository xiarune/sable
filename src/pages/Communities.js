import React from "react";
import { Link } from "react-router-dom";
import "./Communities.css";

import { works as libraryWorks } from "../data/libraryWorks";
import { authApi, usersApi, followsApi, uploadsApi, likesApi, bookmarksApi, commentsApi } from "../api";
import postsApi from "../api/posts";

// Mention input component with highlighting and suggestions
function MentionInput({ value, onChange, placeholder, rows = 2, followingList = [] }) {
  const textareaRef = React.useRef(null);
  const highlightRef = React.useRef(null);
  const [mentionQuery, setMentionQuery] = React.useState("");
  const [mentionIndex, setMentionIndex] = React.useState(-1);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [cursorPosition, setCursorPosition] = React.useState(0);

  // Filter suggestions based on mention query
  const suggestions = React.useMemo(() => {
    if (!mentionQuery) return [];
    const q = mentionQuery.toLowerCase();
    return followingList
      .filter((u) =>
        u.username?.toLowerCase().includes(q) ||
        u.displayName?.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [mentionQuery, followingList]);

  // Detect @mention being typed
  const handleChange = (e) => {
    const text = e.target.value;
    const cursor = e.target.selectionStart;
    setCursorPosition(cursor);
    onChange(text);

    // Find if we're typing a mention
    const textBeforeCursor = text.slice(0, cursor);
    const mentionMatch = textBeforeCursor.match(/@([a-zA-Z0-9_-]*)$/);

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowSuggestions(true);
      setMentionIndex(0);
    } else {
      setMentionQuery("");
      setShowSuggestions(false);
    }
  };

  // Handle keyboard navigation in suggestions
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMentionIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMentionIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (mentionIndex >= 0 && suggestions[mentionIndex]) {
        e.preventDefault();
        selectSuggestion(suggestions[mentionIndex]);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  // Insert selected mention
  const selectSuggestion = (user) => {
    const textBeforeCursor = value.slice(0, cursorPosition);
    const textAfterCursor = value.slice(cursorPosition);
    const mentionStart = textBeforeCursor.lastIndexOf("@");
    const newText = textBeforeCursor.slice(0, mentionStart) + "@" + user.username + " " + textAfterCursor;
    onChange(newText);
    setShowSuggestions(false);
    setMentionQuery("");

    // Focus back on textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursor = mentionStart + user.username.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursor, newCursor);
      }
    }, 0);
  };

  // Render text with highlighted mentions
  const renderHighlightedText = () => {
    return value.replace(/@([a-zA-Z0-9_-]+)/g, '<span class="mention-highlight">@$1</span>');
  };

  // Sync scroll between textarea and highlight layer
  const handleScroll = () => {
    if (highlightRef.current && textareaRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  return (
    <div className="mention-input-container">
      <div
        ref={highlightRef}
        className="mention-highlight-layer"
        dangerouslySetInnerHTML={{ __html: renderHighlightedText() + "&nbsp;" }}
        aria-hidden="true"
      />
      <textarea
        ref={textareaRef}
        className="mention-textarea"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
        placeholder={placeholder}
        rows={rows}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="mention-suggestions">
          {suggestions.map((user, idx) => (
            <button
              key={user._id || user.username}
              type="button"
              className={`mention-suggestion ${idx === mentionIndex ? "mention-suggestion--active" : ""}`}
              onClick={() => selectSuggestion(user)}
            >
              <div className="mention-suggestion-avatar">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" />
                ) : (
                  <span>{(user.username || "U")[0].toUpperCase()}</span>
                )}
              </div>
              <div className="mention-suggestion-info">
                <div className="mention-suggestion-name">@{user.username}</div>
                {user.displayName && user.displayName !== user.username && (
                  <div className="mention-suggestion-display">{user.displayName}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Post menu component (three dots)
function PostMenu({ post, onEdit, onDelete, onReport, isOwner }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const menuRef = React.useRef(null);

  React.useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="co-menuWrap" ref={menuRef}>
      <button
        type="button"
        className="co-more"
        aria-label="More actions"
        title="More"
        onClick={() => setIsOpen(!isOpen)}
      >
        ⋯
      </button>
      {isOpen && (
        <div className="co-menuDropdown">
          {isOwner ? (
            <>
              <button
                type="button"
                className="co-menuItem"
                onClick={() => {
                  setIsOpen(false);
                  onEdit(post);
                }}
              >
                Edit Post
              </button>
              <button
                type="button"
                className="co-menuItem co-menuItem--danger"
                onClick={() => {
                  setIsOpen(false);
                  onDelete(post);
                }}
              >
                Delete Post
              </button>
            </>
          ) : (
            <button
              type="button"
              className="co-menuItem co-menuItem--danger"
              onClick={() => {
                setIsOpen(false);
                onReport?.(post);
              }}
            >
              Report Post
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Render text with highlighted mentions for display
function renderMentions(text) {
  if (!text) return null;
  const parts = text.split(/(@[a-zA-Z0-9_-]+)/g);
  return parts.map((part, i) => {
    if (part.match(/^@[a-zA-Z0-9_-]+$/)) {
      return <span key={i} className="co-mention">{part}</span>;
    }
    return part;
  });
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
  const [followingList, setFollowingList] = React.useState([]);

  // Edit/Delete modal state
  const [editingPost, setEditingPost] = React.useState(null);
  const [editDraft, setEditDraft] = React.useState("");
  const [editingInProgress, setEditingInProgress] = React.useState(false);
  const [deletingPost, setDeletingPost] = React.useState(null);
  const [deletingInProgress, setDeletingInProgress] = React.useState(false);

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

  // Fetch following list for mention suggestions
  React.useEffect(() => {
    if (isAuthed) {
      followsApi.getFollowing().then((data) => {
        if (data && data.following) {
          setFollowingList(data.following);
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

  // Fetch posts from backend
  React.useEffect(() => {
    async function fetchPosts() {
      try {
        setLoadingPosts(true);
        setPostsError(null);
        const response = await postsApi.list({ limit: 50 });

        // Transform backend posts to frontend format
        const transformedPosts = (response.posts || []).map((p) => ({
          id: p._id,
          type: p.type || "post",
          user: {
            handle: p.authorUsername,
            display: p.author?.displayName || p.authorUsername,
            avatar: p.author?.avatarUrl || "",
          },
          time: formatTimeAgo(p.createdAt),
          title: p.title || "",
          caption: p.caption || p.content || "",
          imageUrl: p.imageUrl || null,
          meta: {
            replies: String(p.commentsCount || 0),
            likes: String(p.likesCount || 0),
          },
          tags: p.tags || [],
          workId: p.workId || null,
          authorId: p.author?._id || p.authorId,
          editedAt: p.editedAt || null,
        }));

        setPosts(transformedPosts);
      } catch (err) {
        console.error("Failed to fetch posts:", err);
        setPostsError("Failed to load posts");
      } finally {
        setLoadingPosts(false);
      }
    }

    fetchPosts();
  }, []);

  // Helper to format time ago
  function formatTimeAgo(dateString) {
    if (!dateString) return "recently";
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  }

  // Composer
  const [postType, setPostType] = React.useState("post"); // post | upload
  const [draft, setDraft] = React.useState("");
  const [postImage, setPostImage] = React.useState(null); // { file, preview }
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const imageInputRef = React.useRef(null);

  // Feed state - starts empty, to be populated from backend
  const [posts, setPosts] = React.useState([]);
  const [loadingPosts, setLoadingPosts] = React.useState(true);
  const [postsError, setPostsError] = React.useState(null);

  // Likes and bookmarks (API-based)
  const [likedPosts, setLikedPosts] = React.useState([]);
  const [bookmarkedPosts, setBookmarkedPosts] = React.useState([]);
  const [likeInProgress, setLikeInProgress] = React.useState({});
  const [bookmarkInProgress, setBookmarkInProgress] = React.useState({});

  // Track follow state per user (managed via API)
  const [followingInProgress, setFollowingInProgress] = React.useState({});

  // Reply
  const [replyingTo, setReplyingTo] = React.useState(null);
  const [replyDraft, setReplyDraft] = React.useState("");
  const [replyInProgress, setReplyInProgress] = React.useState(false);
  const [postComments, setPostComments] = React.useState({}); // { postId: [comments] }

  const normalizedUsername = (username || "john.doe").trim().toLowerCase();

  // Fetch bookmarks to know which posts are bookmarked
  React.useEffect(() => {
    if (isAuthed) {
      bookmarksApi.list("post").then((data) => {
        if (data && data.bookmarks) {
          setBookmarkedPosts(data.bookmarks.map((b) => b.postId));
        }
      }).catch(() => {});
    }
  }, [isAuthed]);

  // Fetch liked posts to know which posts are liked
  React.useEffect(() => {
    if (isAuthed) {
      likesApi.getLikedPosts().then((data) => {
        if (data && data.postIds) {
          setLikedPosts(data.postIds);
        }
      }).catch(() => {});
    }
  }, [isAuthed]);

  async function handleLike(postId) {
    if (likeInProgress[postId]) return;

    setLikeInProgress((prev) => ({ ...prev, [postId]: true }));

    try {
      if (likedPosts.includes(postId)) {
        await likesApi.unlikePost(postId);
        setLikedPosts((prev) => prev.filter((id) => id !== postId));
        // Update post like count
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, meta: { ...p.meta, likes: String(Math.max(0, parseInt(p.meta.likes || "0") - 1)) } }
              : p
          )
        );
      } else {
        await likesApi.likePost(postId);
        setLikedPosts((prev) => [...prev, postId]);
        // Update post like count
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, meta: { ...p.meta, likes: String(parseInt(p.meta.likes || "0") + 1) } }
              : p
          )
        );
      }
    } catch (err) {
      console.error("Like action failed:", err);
    } finally {
      setLikeInProgress((prev) => ({ ...prev, [postId]: false }));
    }
  }

  async function handleBookmark(postId) {
    if (bookmarkInProgress[postId]) return;

    setBookmarkInProgress((prev) => ({ ...prev, [postId]: true }));

    try {
      if (bookmarkedPosts.includes(postId)) {
        await bookmarksApi.unbookmarkPost(postId);
        setBookmarkedPosts((prev) => prev.filter((id) => id !== postId));
      } else {
        await bookmarksApi.bookmarkPost(postId);
        setBookmarkedPosts((prev) => [...prev, postId]);
      }
    } catch (err) {
      console.error("Bookmark action failed:", err);
    } finally {
      setBookmarkInProgress((prev) => ({ ...prev, [postId]: false }));
    }
  }

  async function handleFollow(userId, isCurrentlyFollowing) {
    if (followingInProgress[userId]) return;

    setFollowingInProgress((prev) => ({ ...prev, [userId]: true }));

    try {
      if (isCurrentlyFollowing) {
        await followsApi.unfollow(userId);
        setSuggestedUsers((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, isFollowing: false } : u))
        );
      } else {
        await followsApi.follow(userId);
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
    const url = `${window.location.origin}/communities?post=${post.id}`;

    if (navigator.share) {
      navigator.share({ title: post.title || "Community Post", url }).catch(() => {});
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
      // Fetch existing comments for this post
      commentsApi.list(null, postId).then((data) => {
        if (data && data.comments) {
          setPostComments((prev) => ({ ...prev, [postId]: data.comments }));
        }
      }).catch(() => {});
    }
  }

  async function submitReply(postId) {
    if (!replyDraft.trim() || replyInProgress) return;

    setReplyInProgress(true);

    try {
      const response = await commentsApi.create(replyDraft.trim(), null, postId);

      if (response && response.comment) {
        // Add the new comment to the local state
        setPostComments((prev) => ({
          ...prev,
          [postId]: [response.comment, ...(prev[postId] || [])],
        }));

        // Update comment count on post
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, meta: { ...p.meta, replies: String(parseInt(p.meta.replies || "0") + 1) } }
              : p
          )
        );
      }

      setReplyingTo(null);
      setReplyDraft("");
    } catch (err) {
      console.error("Failed to submit reply:", err);
      alert("Failed to submit reply. Please try again.");
    } finally {
      setReplyInProgress(false);
    }
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

  const [postingInProgress, setPostingInProgress] = React.useState(false);

  // Edit post handler
  function handleEditPost(post) {
    setEditingPost(post);
    setEditDraft(post.caption || "");
  }

  async function submitEditPost() {
    if (!editingPost || editingInProgress) return;

    setEditingInProgress(true);
    try {
      const response = await postsApi.update(editingPost.id, {
        caption: editDraft,
      });

      if (response.post) {
        // Update the post in the feed
        setPosts((prev) =>
          prev.map((p) =>
            p.id === editingPost.id
              ? { ...p, caption: editDraft, editedAt: response.post.editedAt || new Date().toISOString() }
              : p
          )
        );
      }

      setEditingPost(null);
      setEditDraft("");
    } catch (err) {
      console.error("Failed to edit post:", err);
      alert("Failed to update post. Please try again.");
    } finally {
      setEditingInProgress(false);
    }
  }

  // Delete post handler
  function handleDeletePost(post) {
    setDeletingPost(post);
  }

  async function confirmDeletePost() {
    if (!deletingPost || deletingInProgress) return;

    setDeletingInProgress(true);
    try {
      await postsApi.delete(deletingPost.id);

      // Remove the post from the feed
      setPosts((prev) => prev.filter((p) => p.id !== deletingPost.id));

      setDeletingPost(null);
    } catch (err) {
      console.error("Failed to delete post:", err);
      alert("Failed to delete post. Please try again.");
    } finally {
      setDeletingInProgress(false);
    }
  }

  // Image upload handlers
  function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    // Create preview URL
    const preview = URL.createObjectURL(file);
    setPostImage({ file, preview });
  }

  function removeImage() {
    if (postImage?.preview) {
      URL.revokeObjectURL(postImage.preview);
    }
    setPostImage(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }

  // Report handler
  function handleReport(post) {
    alert(`Report functionality coming soon. Post ID: ${post.id}`);
  }

  async function submitPost() {
    const text = draft.trim();
    if ((!text && !postImage) || postingInProgress) return;

    const userDisplay = currentUser?.displayName || currentUser?.username || normalizedUsername || "user";
    const userHandle = currentUser?.username || normalizedUsername || "user";
    const userAvatar = currentUser?.avatarUrl || "";

    setPostingInProgress(true);

    try {
      // Upload image first if present
      let imageUrl = null;
      if (postImage?.file) {
        setUploadingImage(true);
        try {
          const uploadResult = await uploadsApi.image(postImage.file);
          imageUrl = uploadResult.url;
        } catch (uploadErr) {
          console.error("Failed to upload image:", uploadErr);
          alert("Failed to upload image. Please try again.");
          setUploadingImage(false);
          setPostingInProgress(false);
          return;
        }
        setUploadingImage(false);
      }

      // Create post via backend API
      const postData = {
        type: "post",
        caption: text,
        imageUrl,
      };

      const response = await postsApi.create(postData);

      if (response.post) {
        // Add the new post to the top of the feed
        const newPost = {
          id: response.post._id,
          type: response.post.type || "post",
          user: { handle: userHandle, display: userDisplay, avatar: userAvatar },
          time: "just now",
          title: response.post.title || "",
          caption: response.post.caption || response.post.content || text,
          imageUrl: response.post.imageUrl || imageUrl,
          meta: { replies: "0", likes: "0" },
          tags: response.post.tags || [],
          authorId: response.post.authorId,
        };

        setPosts((prev) => [newPost, ...prev]);
      }

      setDraft("");
      setPostType("post");
      removeImage();
    } catch (err) {
      console.error("Failed to create post:", err);
      alert("Failed to create post. Please try again.");
    } finally {
      setPostingInProgress(false);
    }
  }

  const filteredPosts = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? posts.filter((p) => {
          const hay = [p.title, p.caption, p.user?.handle, p.user?.display, ...(p.tags || [])]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return hay.includes(q);
        })
      : posts;
  }, [posts, query]);

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
              {["Explore", "Following"].map((t) => (
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
                  placeholder="Search posts..."
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
                All Posts
              </button>
              <button
                type="button"
                className={tab === "Following" ? "co-filter co-filter--active" : "co-filter"}
                onClick={() => setTab("Following")}
              >
                Following
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
                  </div>

                  <MentionInput
                    value={draft}
                    onChange={setDraft}
                    followingList={followingList}
                    placeholder="Share something with the community..."
                    rows={2}
                  />

                  {/* Image preview */}
                  {postImage && (
                    <div className="co-imagePreview">
                      <img src={postImage.preview} alt="Upload preview" />
                      <button
                        type="button"
                        className="co-imageRemove"
                        onClick={removeImage}
                        aria-label="Remove image"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  <div className="co-composeFooter">
                    <div className="co-composeActions">
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        style={{ display: "none" }}
                        id="post-image-input"
                      />
                      <button
                        type="button"
                        className="co-attachBtn"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={uploadingImage}
                        title="Add image"
                      >
                        🖼️ Image
                      </button>
                      <span className="co-composeHint">Tip: Use @username to mention someone</span>
                    </div>

                    <button
                      type="button"
                      className="co-postBtn"
                      onClick={submitPost}
                      disabled={postingInProgress || (!draft.trim() && !postImage)}
                      aria-label="Post"
                    >
                      {uploadingImage ? "Uploading..." : postingInProgress ? "Posting..." : "Post"}
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
                <div className="co-composeLoggedOutSub">Log in to share an update with the community…</div>
              </button>
            )}
          </section>

          {/* Feed */}
          <section className="co-feed" aria-label="Posts">
            {loadingPosts ? (
              <div className="co-empty">Loading posts...</div>
            ) : postsError ? (
              <div className="co-empty">{postsError}</div>
            ) : filteredPosts.length === 0 ? (
              <div className="co-empty">
                {query ? "Nothing matched that search. Try different keywords." : "No posts yet. Be the first to share something with the community."}
              </div>
            ) : (
              filteredPosts.map((p) => {
                return (
                  <article key={p.id} className="co-post" aria-label="Post">
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
                        <div className="co-time">
                          {p.time}
                          {p.editedAt && <span className="co-edited">(edited)</span>}
                        </div>
                        <PostMenu
                          post={p}
                          onEdit={handleEditPost}
                          onDelete={handleDeletePost}
                          onReport={handleReport}
                          isOwner={currentUser && p.authorId === currentUser._id}
                        />
                      </div>
                    </div>

                    <div className="co-postBody">
                      {p.title && <div className="co-postTitle">{p.title}</div>}

                      <div className="co-postCaption">{renderMentions(p.caption)}</div>

                      {/* Post image */}
                      {p.imageUrl && (
                        <div className="co-postImage">
                          <img src={p.imageUrl} alt="Post attachment" />
                        </div>
                      )}

                      {p.tags && p.tags.length > 0 && (
                        <div className="co-tags" aria-label="Tags">
                          {p.tags.map((t) => (
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
                      )}
                    </div>

                    <div className="co-postActions" aria-label="Post actions">
                      <button
                        type="button"
                        className={`co-action ${likedPosts.includes(p.id) ? "co-action--active" : ""}`}
                        onClick={() => requireAuth(() => handleLike(p.id))}
                        disabled={likeInProgress[p.id]}
                      >
                        {likedPosts.includes(p.id) ? "♥ Liked" : "♡ Like"} {p.meta?.likes && p.meta.likes !== "0" ? `(${p.meta.likes})` : ""}
                      </button>
                      <button
                        type="button"
                        className={`co-action ${replyingTo === p.id ? "co-action--active" : ""}`}
                        onClick={() => requireAuth(() => handleReply(p.id))}
                      >
                        💬 Reply {p.meta?.replies && p.meta.replies !== "0" ? `(${p.meta.replies})` : ""}
                      </button>
                      <button type="button" className="co-action" onClick={() => handleShare(p)}>
                        ⤴ Share
                      </button>
                      <button
                        type="button"
                        className={`co-action co-action--ghost ${bookmarkedPosts.includes(p.id) ? "co-action--active" : ""}`}
                        onClick={() => requireAuth(() => handleBookmark(p.id))}
                        disabled={bookmarkInProgress[p.id]}
                      >
                        {bookmarkedPosts.includes(p.id) ? "✓ Saved" : "Save"}
                      </button>
                    </div>

                    {/* Reply section */}
                    {replyingTo === p.id && (
                      <div className="co-replySection">
                        {/* Existing comments */}
                        {postComments[p.id] && postComments[p.id].length > 0 && (
                          <div className="co-commentsList">
                            {postComments[p.id].map((comment) => (
                              <div key={comment._id} className="co-comment">
                                <div className="co-commentHeader">
                                  <Link to={`/communities/${comment.authorUsername}`} className="co-commentAuthor">
                                    @{comment.authorUsername}
                                  </Link>
                                  <span className="co-commentTime">
                                    {formatTimeAgo(comment.createdAt)}
                                  </span>
                                </div>
                                <div className="co-commentText">{renderMentions(comment.text)}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply input */}
                        <div className="co-replyBox">
                          <textarea
                            className="co-replyInput"
                            value={replyDraft}
                            onChange={(e) => setReplyDraft(e.target.value)}
                            placeholder="Write a reply..."
                            rows={2}
                            autoFocus
                            disabled={replyInProgress}
                          />
                          <div className="co-replyActions">
                            <button
                              type="button"
                              className="co-replyCancel"
                              onClick={() => setReplyingTo(null)}
                              disabled={replyInProgress}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="co-replySubmit"
                              onClick={() => submitReply(p.id)}
                              disabled={replyInProgress || !replyDraft.trim()}
                            >
                              {replyInProgress ? "Posting..." : "Reply"}
                            </button>
                          </div>
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

      {/* Edit Post Modal */}
      {editingPost && (
        <div className="co-modal-overlay" onClick={() => !editingInProgress && setEditingPost(null)}>
          <div className="co-modal" onClick={(e) => e.stopPropagation()}>
            <div className="co-modal-header">
              <h3 className="co-modal-title">Edit Post</h3>
              <button
                type="button"
                className="co-modal-close"
                onClick={() => !editingInProgress && setEditingPost(null)}
                disabled={editingInProgress}
              >
                ✕
              </button>
            </div>
            <div className="co-modal-body">
              <MentionInput
                value={editDraft}
                onChange={setEditDraft}
                followingList={followingList}
                placeholder="Edit your post..."
                rows={4}
              />
            </div>
            <div className="co-modal-footer">
              <button
                type="button"
                className="co-modal-btn co-modal-btn--secondary"
                onClick={() => setEditingPost(null)}
                disabled={editingInProgress}
              >
                Cancel
              </button>
              <button
                type="button"
                className="co-modal-btn co-modal-btn--primary"
                onClick={submitEditPost}
                disabled={editingInProgress || !editDraft.trim()}
              >
                {editingInProgress ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingPost && (
        <div className="co-modal-overlay" onClick={() => !deletingInProgress && setDeletingPost(null)}>
          <div className="co-modal co-modal--small" onClick={(e) => e.stopPropagation()}>
            <div className="co-modal-header">
              <h3 className="co-modal-title">Delete Post</h3>
              <button
                type="button"
                className="co-modal-close"
                onClick={() => !deletingInProgress && setDeletingPost(null)}
                disabled={deletingInProgress}
              >
                ✕
              </button>
            </div>
            <div className="co-modal-body">
              <p className="co-modal-text">
                Are you sure you want to delete this post? This action cannot be undone.
              </p>
            </div>
            <div className="co-modal-footer">
              <button
                type="button"
                className="co-modal-btn co-modal-btn--secondary"
                onClick={() => setDeletingPost(null)}
                disabled={deletingInProgress}
              >
                Cancel
              </button>
              <button
                type="button"
                className="co-modal-btn co-modal-btn--danger"
                onClick={confirmDeletePost}
                disabled={deletingInProgress}
              >
                {deletingInProgress ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





