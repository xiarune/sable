import React from "react";
import { Link } from "react-router-dom";
import "./Communities.css";

// Assets (src/assets/images)
import profileImg from "../assets/images/profile_picture.png";
import otherProfileImg from "../assets/images/other_profile.png";

const MOCK_TOPICS = [
  { id: "t1", label: "Writing Prompts", count: "12.4k" },
  { id: "t2", label: "Slow-burn Romance", count: "9.8k" },
  { id: "t3", label: "Dark Academia", count: "7.1k" },
  { id: "t4", label: "Worldbuilding", count: "6.3k" },
  { id: "t5", label: "Fanworks", count: "5.5k" },
  { id: "t6", label: "Audio Reads", count: "3.9k" },
];

const MOCK_SUGGESTED = [
  {
    handle: "jane.doe",
    display: "jane.doe",
    avatar: otherProfileImg,
    tagline: "writes fantasy + character studies",
    followers: "12.2k",
  },
  {
    handle: "john.doe",
    display: "john.doe",
    avatar: profileImg,
    tagline: "short horror + noir vibes",
    followers: "8.7k",
  },
  {
    handle: "amira.salem",
    display: "amira.salem",
    avatar: "",
    tagline: "romance, fluff, and comfort reads",
    followers: "22.1k",
  },
];

const BASE_POSTS = [
  {
    id: "p1",
    type: "work",
    user: { handle: "jane.doe", display: "jane.doe", avatar: otherProfileImg },
    time: "2h",
    title: "Night in The Woods",
    caption: "New chapter is up. The forest is not what it seems.",
    meta: { language: "Latin", words: "20,000", views: "1,000" },
    tags: ["mystery", "forest", "slowburn"],
  },
  {
    id: "p2",
    type: "discussion",
    user: { handle: "elias.arden", display: "elias.arden", avatar: "" },
    time: "4h",
    title: "Public Discussion",
    caption: "What’s one rule you use to keep your magic systems coherent?",
    meta: { replies: "214", likes: "1.9k" },
    tags: ["worldbuilding", "magic-systems"],
  },
  {
    id: "p3",
    type: "skin",
    user: { handle: "mira.ko", display: "mira.ko", avatar: "" },
    time: "6h",
    title: "New Skin Drop: Parchment Noir",
    caption: "A cleaner reading skin with stronger contrast + softer borders.",
    meta: { downloads: "3.2k", likes: "804" },
    tags: ["skin", "ui", "noir"],
  },
  {
    id: "p4",
    type: "audio",
    user: { handle: "noah.park", display: "noah.park", avatar: "" },
    time: "9h",
    title: "Audio: Chapter 1 — Rain on Glass",
    caption: "Quick demo read. Would you want full chapters like this?",
    meta: { length: "4:12", plays: "6.8k" },
    tags: ["audio", "reading", "demo"],
  },
  {
    id: "p5",
    type: "work",
    user: { handle: "amira.salem", display: "amira.salem", avatar: "" },
    time: "1d",
    title: "Title (Placeholder)",
    caption: "Lorem ipsum dolor sit…",
    meta: { language: "—", words: "—", views: "—" },
    tags: ["tag", "tag"],
  },
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

  // Composer (front-end only)
  const [postType, setPostType] = React.useState("update"); // update | discussion | upload
  const [draft, setDraft] = React.useState("");

  // Feed state (front-end only)
  const [posts, setPosts] = React.useState(BASE_POSTS);

  const normalizedUsername = (username || "john.doe").trim().toLowerCase();

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

    const newPost = {
      id: `p_local_${Date.now()}`,
      type: postType === "discussion" ? "discussion" : "discussion",
      user: { handle: normalizedUsername || "john.doe", display: normalizedUsername || "john.doe", avatar: profileImg },
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

  return (
    <div className="co-page" aria-label="Communities explore page">
      <div className="co-shell">
        {/* LEFT RAIL */}
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
              <div className="co-leftSectionTitle">Trending Topics</div>
              <div className="co-topicList">
                {MOCK_TOPICS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="co-topic"
                    onClick={() => setQuery(t.label)}
                    aria-label={`Search topic ${t.label}`}
                    title={`Search: ${t.label}`}
                  >
                    <span className="co-topicName">{t.label}</span>
                    <span className="co-topicCount">{t.count}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="co-leftSection">
              <div className="co-leftSectionTitle">Quick Actions</div>

              <button
                type="button"
                className="co-leftAction"
                onClick={() => requireAuth(() => setPostType("discussion"))}
              >
                Start a discussion
              </button>

              <button type="button" className="co-leftAction" onClick={() => setQuery("")}>
                Clear search
              </button>
            </div>
          </div>
        </aside>

        {/* MAIN FEED */}
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
                  <Avatar avatar={profileImg} name={username} />
                </div>

                <div className="co-composeBox">
                  <div className="co-composeHead">
                    <div className="co-composeTitle">Post to the Community</div>

                    <div className="co-composeType" aria-label="Post type">
                      <button
                        type="button"
                        className={postType === "update" ? "co-typeBtn co-typeBtn--active" : "co-typeBtn"}
                        onClick={() => setPostType("update")}
                      >
                        Update
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
                        : "Share an update with the community..."
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
              <div className="co-empty">Nothing matched that. Try a different search or pick a trending topic.</div>
            ) : (
              filteredPosts.map((p) => (
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
                    <div className="co-postTitle">{p.title}</div>
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
                    <button type="button" className="co-action" onClick={() => requireAuth(() => {})}>
                      ♡ Like
                    </button>
                    <button type="button" className="co-action" onClick={() => requireAuth(() => {})}>
                      💬 Reply
                    </button>
                    <button type="button" className="co-action" onClick={() => {}}>
                      ⤴ Share
                    </button>
                    <button type="button" className="co-action co-action--ghost" onClick={() => requireAuth(() => {})}>
                      Bookmark
                    </button>
                  </div>
                </article>
              ))
            )}
          </section>
        </main>

        {/* RIGHT RAIL */}
        <aside className="co-right" aria-label="Suggestions and live activity">
          <div className="co-rightCard">
            <div className="co-rightTitle">Suggested Creators</div>

            <div className="co-suggestList">
              {MOCK_SUGGESTED.map((u) => (
                <div key={u.handle} className="co-suggest">
                  <Link
                    to={communityHrefFor(u.handle)}
                    className="co-suggestUser"
                    aria-label={`Open ${u.display} community page`}
                  >
                    <div className="co-avatar co-avatar--sm">
                      <Avatar avatar={u.avatar} name={u.display} />
                    </div>
                    <div className="co-suggestMeta">
                      <div className="co-suggestName">{u.display}</div>
                      <div className="co-suggestTagline">{u.tagline}</div>
                      <div className="co-suggestFollowers">{u.followers} followers</div>
                    </div>
                  </Link>

                  <button type="button" className="co-followBtn" onClick={() => requireAuth(() => {})}>
                    Follow
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="co-rightCard">
            <div className="co-rightTitle">Live Discussions</div>

            <div className="co-liveList" aria-label="Live discussions">
              <button type="button" className="co-liveItem" onClick={() => setTab("Discussions")}>
                <div className="co-liveTitle">“Best openings you’ve ever read?”</div>
                <div className="co-liveSub">58 active • jump in</div>
              </button>

              <button type="button" className="co-liveItem" onClick={() => setTab("Discussions")}>
                <div className="co-liveTitle">“How do you tag correctly?”</div>
                <div className="co-liveSub">31 active • jump in</div>
              </button>

              <button type="button" className="co-liveItem" onClick={() => setTab("Discussions")}>
                <div className="co-liveTitle">“Audio narrations: tips?”</div>
                <div className="co-liveSub">17 active • jump in</div>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}




