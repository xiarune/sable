import React from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import "./PublicCommunityPage.css";

// John assets
import johnBanner from "../assets/images/community_banner.png";
import johnAvatar from "../assets/images/profile_picture.png";

// Jane assets
import janeBanner from "../assets/images/other_profile_banner.jpg";
import janeAvatar from "../assets/images/other_profile.png";

// Optional: a generic banner (if you want others to not reuse Jane's)
import genericBanner from "../assets/images/amira_profile.jpg";

// LocalStorage key for following data
const FOLLOWING_KEY = "sable_following_v1";

function getFollowing() {
  try {
    return JSON.parse(localStorage.getItem(FOLLOWING_KEY)) || [];
  } catch {
    return [];
  }
}

function setFollowing(list) {
  localStorage.setItem(FOLLOWING_KEY, JSON.stringify(list));
}

function initials(name) {
  const s = (name || "U").trim();
  return (s[0] || "U").toUpperCase();
}

function Avatar({ avatar, name }) {
  if (avatar) return <img className="pcp-avatar" src={avatar} alt="" aria-hidden="true" />;

  return (
    <div className="pcp-avatar pcp-avatar--fallback" aria-hidden="true">
      {initials(name)}
    </div>
  );
}

// Mock data for tabs
const MOCK_WORKS = [
  { id: "w1", title: "The Midnight Garden", genre: "Fantasy", wordCount: "45,200" },
  { id: "w2", title: "Echoes of Yesterday", genre: "Romance", wordCount: "32,100" },
  { id: "w3", title: "Starbound", genre: "Sci-Fi", wordCount: "67,800" },
];

const MOCK_READING_LIST = [
  { id: "r1", title: "When Stars Collide", author: "amira.salem", progress: "75%" },
  { id: "r2", title: "The Last Summer", author: "hadassah", progress: "30%" },
  { id: "r3", title: "Whispers in the Dark", author: "zoey", progress: "100%" },
];

const MOCK_SKINS = [
  { id: "s1", name: "Dark Academia", downloads: 234, likes: 89 },
  { id: "s2", name: "Cottagecore Dreams", downloads: 156, likes: 67 },
  { id: "s3", name: "Midnight Blue", downloads: 312, likes: 124 },
];

const MOCK_AUDIOS = [
  { id: "a1", title: "Chapter 1 Reading", duration: "12:34", plays: 567 },
  { id: "a2", title: "Character Voice: Luna", duration: "3:45", plays: 234 },
  { id: "a3", title: "Ambient Writing Music", duration: "45:00", plays: 1289 },
];

const MOCK_PUBLIC_PROFILES = {
  "john.doe": {
    displayName: "JOHN.DOE",
    handle: "john.doe",
    banner: johnBanner,
    avatar: johnAvatar,
    bio:
      "Front-end placeholder for public community profiles. Later this will show the user’s banner, bio, works, skins, audios, and widgets.",
    link: "sable.app",
  },
  "jane.doe": {
    displayName: "JANE.DOE",
    handle: "jane.doe",
    banner: janeBanner, // <-- THIS is where your other_profile_banner.jpg is used
    avatar: janeAvatar,
    bio: "writes fantasy + character studies",
    link: "sable.app/jane",
  },
  "amira.salem": {
    displayName: "AMIRA.SALEM",
    handle: "amira.salem",
    banner: genericBanner,
    avatar: "", // fallback circle with initial
    bio: "romance, fluff, and comfort reads",
    link: "sable.app/amira",
  },
};

export default function PublicCommunityPage({ isAuthed = false, username = "john.doe" }) {
  const { handle } = useParams();

  const normalizedHandle = (handle || "").trim().toLowerCase();
  const normalizedUsername = (username || "").trim().toLowerCase();

  // Following state
  const [followingList, setFollowingList] = React.useState(() => getFollowing());
  const isFollowing = followingList.includes(normalizedHandle);

  // Search state
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Active tab state
  const [activeTab, setActiveTab] = React.useState("works");

  function handleFollow() {
    if (!isAuthed) {
      window.dispatchEvent(new Event("sable:open-auth"));
      return;
    }
    const updated = [...followingList, normalizedHandle];
    setFollowingList(updated);
    setFollowing(updated);
  }

  function handleUnfollow() {
    const updated = followingList.filter((h) => h !== normalizedHandle);
    setFollowingList(updated);
    setFollowing(updated);
  }

  function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: `${profile.displayName}'s Community Page`, url }).catch(() => {
        // User cancelled share or share failed - ignore
      });
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  }

  function handleSearch() {
    setIsSearchOpen((v) => !v);
  }

  // If you're logged in and you navigate to your own handle, show the editable "me" page instead.
  // (Keeps behavior consistent even if you click yourself in the feed.)
  if (isAuthed && normalizedHandle && normalizedHandle === normalizedUsername) {
    return <Navigate to="/communities/me" replace />;
  }

  const profile =
    MOCK_PUBLIC_PROFILES[normalizedHandle] ||
    {
      displayName: (normalizedHandle || "user").toUpperCase(),
      handle: normalizedHandle || "user",
      banner: genericBanner,
      avatar: "",
      bio: "Public community profile placeholder.",
      link: "sable.app",
    };

  return (
    <div className="pcp">
      {/* Banner */}
      <section
        className="pcp-banner"
        style={{ backgroundImage: `url(${profile.banner})` }}
        aria-label="Community banner"
      />

      <section className="pcp-card" aria-label="Community profile">
        {/* Avatar */}
        <div className="pcp-avatarWrap">
          <Avatar avatar={profile.avatar} name={profile.displayName} />
        </div>

        {/* View-only layout (no edit controls at all) */}
        <div className="pcp-grid">
          <div className="pcp-left">
            <div className="pcp-nameRow">
              <h1 className="pcp-name">{profile.displayName}</h1>

              <div className="pcp-actions" aria-label="Profile actions">
                {isFollowing ? (
                  <button
                    type="button"
                    className="pcp-actionBtn pcp-followBtn pcp-followBtn--following"
                    onClick={handleUnfollow}
                    aria-label="Unfollow"
                  >
                    Following
                  </button>
                ) : (
                  <button
                    type="button"
                    className="pcp-actionBtn pcp-followBtn"
                    onClick={handleFollow}
                    aria-label="Follow"
                  >
                    Follow
                  </button>
                )}
                <button type="button" className="pcp-actionBtn" aria-label="Search" onClick={handleSearch}>
                  🔍
                </button>
                <button type="button" className="pcp-actionBtn" aria-label="Share" onClick={handleShare}>
                  ⤴︎
                </button>
              </div>
            </div>

            <div className="pcp-handle">@{profile.handle}</div>

            {isSearchOpen && (
              <div className="pcp-searchBar" aria-label="Search user content">
                <input
                  type="text"
                  className="pcp-searchInput"
                  placeholder="Search works, skins, audios..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <button
                  type="button"
                  className="pcp-searchClose"
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchQuery("");
                  }}
                  aria-label="Close search"
                >
                  ✕
                </button>
              </div>
            )}

            <p className="pcp-bio">{profile.bio}</p>

            <div className="pcp-linkRow">
              <span className="pcp-linkIcon" aria-hidden="true">
                🔗
              </span>
              <span className="pcp-linkText">{profile.link}</span>
            </div>

            <div className="pcp-tabs" role="tablist" aria-label="Community tabs">
              <button
                type="button"
                className={`pcp-tab ${activeTab === "works" ? "pcp-tab--active" : ""}`}
                role="tab"
                onClick={() => setActiveTab("works")}
              >
                Works
              </button>
              <button
                type="button"
                className={`pcp-tab ${activeTab === "reading" ? "pcp-tab--active" : ""}`}
                role="tab"
                onClick={() => setActiveTab("reading")}
              >
                Reading List
              </button>
              <button
                type="button"
                className={`pcp-tab ${activeTab === "skins" ? "pcp-tab--active" : ""}`}
                role="tab"
                onClick={() => setActiveTab("skins")}
              >
                Skins
              </button>
              <button
                type="button"
                className={`pcp-tab ${activeTab === "audios" ? "pcp-tab--active" : ""}`}
                role="tab"
                onClick={() => setActiveTab("audios")}
              >
                Audios
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === "works" && (
              <div className="pcp-tabContent" aria-label="Works">
                <div className="pcp-worksRow">
                  {MOCK_WORKS.map((work) => (
                    <div key={work.id} className="pcp-workCard" role="button" tabIndex={0} aria-label={work.title}>
                      <div className="pcp-workCover pcp-workCover--placeholder" />
                      <div className="pcp-workInfo">
                        <div className="pcp-workTitle">{work.title}</div>
                        <div className="pcp-workMeta">{work.genre} · {work.wordCount} words</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "reading" && (
              <div className="pcp-tabContent" aria-label="Reading List">
                <div className="pcp-listItems">
                  {MOCK_READING_LIST.map((item) => (
                    <div key={item.id} className="pcp-listItem">
                      <div className="pcp-listItemMain">
                        <div className="pcp-listItemTitle">{item.title}</div>
                        <div className="pcp-listItemMeta">by @{item.author}</div>
                      </div>
                      <div className="pcp-listItemProgress">{item.progress}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "skins" && (
              <div className="pcp-tabContent" aria-label="Skins">
                <div className="pcp-listItems">
                  {MOCK_SKINS.map((skin) => (
                    <div key={skin.id} className="pcp-listItem">
                      <div className="pcp-listItemMain">
                        <div className="pcp-listItemTitle">{skin.name}</div>
                        <div className="pcp-listItemMeta">{skin.downloads} downloads · {skin.likes} likes</div>
                      </div>
                      <button type="button" className="pcp-listItemBtn">Preview</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "audios" && (
              <div className="pcp-tabContent" aria-label="Audios">
                <div className="pcp-listItems">
                  {MOCK_AUDIOS.map((audio) => (
                    <div key={audio.id} className="pcp-listItem">
                      <div className="pcp-listItemMain">
                        <div className="pcp-listItemTitle">{audio.title}</div>
                        <div className="pcp-listItemMeta">{audio.duration} · {audio.plays} plays</div>
                      </div>
                      <button type="button" className="pcp-listItemBtn">▶ Play</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Optional helper link if logged out */}
            {!isAuthed ? (
              <div className="pcp-loggedOutHint">
                Want to customize your page?{" "}
                <button
                  type="button"
                  className="pcp-loginLink"
                  onClick={() => window.dispatchEvent(new Event("sable:open-auth"))}
                >
                  Log in
                </button>
                .
              </div>
            ) : null}

            {/* Optional quick nav back */}
            <div className="pcp-backRow">
              <Link className="pcp-backLink" to="/communities">
                ← Back to Communities
              </Link>
            </div>
          </div>

          <aside className="pcp-right" aria-label="Community panels">
            <div className="pcp-panels">
              <div className="pcp-panel">
                <div className="pcp-panelTitle">Announcements</div>
                <div className="pcp-panelBox" />
              </div>

              <div className="pcp-panel">
                <div className="pcp-panelTitle">Donations</div>
                <div className="pcp-panelBox" />
              </div>

              <div className="pcp-panel">
                <div className="pcp-panelTitle">Recent Works</div>
                <div className="pcp-panelBox" />
              </div>

              <div className="pcp-panel">
                <div className="pcp-panelTitle">Chatroom</div>
                <div className="pcp-panelBox" />
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}


