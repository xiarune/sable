import React from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import "./PublicCommunityPage.css";

// John assets
import johnBanner from "../assets/images/community_banner.png";
import johnAvatar from "../assets/images/profile_picture.png";

// Jane assets
import janeBanner from "../assets/images/other_profile_banner.jpg";
import janeAvatar from "../assets/images/other_profile.png";

// Optional: a generic banner (if you want others to not reuse Jane’s)
import genericBanner from "../assets/images/amira_profile.jpg";

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
                <button type="button" className="pcp-actionBtn" aria-label="Search">
                  🔍
                </button>
                <button type="button" className="pcp-actionBtn" aria-label="Share">
                  ⤴︎
                </button>
              </div>
            </div>

            <div className="pcp-handle">@{profile.handle}</div>

            <p className="pcp-bio">{profile.bio}</p>

            <div className="pcp-linkRow">
              <span className="pcp-linkIcon" aria-hidden="true">
                🔗
              </span>
              <span className="pcp-linkText">{profile.link}</span>
            </div>

            <div className="pcp-tabs" role="tablist" aria-label="Community tabs">
              <button type="button" className="pcp-tab pcp-tab--active" role="tab">
                Works
              </button>
              <button type="button" className="pcp-tab" role="tab">
                Reading List
              </button>
              <button type="button" className="pcp-tab" role="tab">
                Skins
              </button>
              <button type="button" className="pcp-tab" role="tab">
                Audios
              </button>
            </div>

            <div className="pcp-worksRow" aria-label="Works">
              <div className="pcp-workCard" role="button" tabIndex={0} aria-label="Work 1 (placeholder)">
                <div className="pcp-workCover pcp-workCover--placeholder" />
              </div>
              <div className="pcp-workCard" role="button" tabIndex={0} aria-label="Work 2 (placeholder)">
                <div className="pcp-workCover pcp-workCover--placeholder" />
              </div>
              <div className="pcp-workCard" role="button" tabIndex={0} aria-label="Work 3 (placeholder)">
                <div className="pcp-workCover pcp-workCover--placeholder" />
              </div>
            </div>

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


