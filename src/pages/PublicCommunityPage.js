import React from "react";
import { useParams, Link, Navigate, useNavigate } from "react-router-dom";
import "./PublicCommunityPage.css";
import { uploadsApi, worksApi, communityApi, followsApi, usersApi, donationsApi, postsApi } from "../api";
import { SableLoader } from "../components";

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

// Avatar component for followers/following list
function ListAvatar({ avatarUrl, name }) {
  const initial = (name || "U").charAt(0).toUpperCase();
  if (avatarUrl) {
    return <img className="pcp-listAvatar" src={avatarUrl} alt="" />;
  }
  return <div className="pcp-listAvatar pcp-listAvatar--fallback">{initial}</div>;
}

const DONATION_PRESETS = [5, 10, 25];

export default function PublicCommunityPage({ isAuthed = false, username = "john.doe" }) {
  const { handle } = useParams();
  const navigate = useNavigate();

  // Scroll to top on mount
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const normalizedHandle = (handle || "").trim().toLowerCase();
  const normalizedUsername = (username || "").trim().toLowerCase();

  // Loading and profile state
  const [loading, setLoading] = React.useState(true);
  const [profile, setProfile] = React.useState(null);
  const [userId, setUserId] = React.useState(null);
  const [announcements, setAnnouncements] = React.useState([]);
  const [accessDenied, setAccessDenied] = React.useState(null); // null | "private" | "following"

  // Following state: "none" | "following" | "pending"
  const [followStatus, setFollowStatus] = React.useState("none");
  const [followLoading, setFollowLoading] = React.useState(false);

  // Followers/following list state
  const [followers, setFollowers] = React.useState([]);
  const [following, setFollowing] = React.useState([]);
  const [followModalOpen, setFollowModalOpen] = React.useState(false);
  const [followModalTab, setFollowModalTab] = React.useState("followers");
  const [loadingFollows, setLoadingFollows] = React.useState(false);

  // Search state
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Active tab state
  const [activeTab, setActiveTab] = React.useState("works");

  // Real data state
  const [userWorks, setUserWorks] = React.useState([]);
  const [userAudios, setUserAudios] = React.useState([]);
  const [userPosts, setUserPosts] = React.useState([]);

  // Load community page and user data
  React.useEffect(() => {
    async function loadData() {
      if (!normalizedHandle) return;
      setLoading(true);

      // Try to load community page
      try {
        const communityData = await communityApi.getByHandle(normalizedHandle);
        if (communityData.error) {
          // Check for visibility-related errors
          if (communityData.error.includes("private")) {
            setAccessDenied("private");
            setLoading(false);
            return;
          } else if (communityData.error.includes("followers")) {
            setAccessDenied("following");
            setLoading(false);
            return;
          }
          throw new Error(communityData.error);
        }
        if (communityData.page) {
          setAccessDenied(null);
          // Prefer user's avatarUrl (source of truth) over communityPage.profileImageUrl
          const userAvatar = communityData.page.userId?.avatarUrl || "";
          const pageAvatar = communityData.page.profileImageUrl || "";
          setProfile({
            displayName: communityData.page.displayName || normalizedHandle.toUpperCase(),
            handle: communityData.page.handle || normalizedHandle,
            banner: communityData.page.bannerImageUrl || "",
            avatar: userAvatar || pageAvatar,
            bio: communityData.page.bio || "",
            link: communityData.page.link || "",
            widgets: communityData.page.widgets || {},
          });
          setAnnouncements(communityData.page.announcements || []);
          if (communityData.page.userId) {
            setUserId(communityData.page.userId._id || communityData.page.userId);
          }
        }
      } catch (err) {
        // Check if this is a visibility error from the API response
        const errorMsg = err?.message || "";
        if (errorMsg.includes("private")) {
          setAccessDenied("private");
          setLoading(false);
          return;
        } else if (errorMsg.includes("followers")) {
          setAccessDenied("following");
          setLoading(false);
          return;
        }

        // Community page doesn't exist, try to get user profile
        try {
          const userData = await usersApi.getProfile(normalizedHandle);
          if (userData.user) {
            setAccessDenied(null);
            setProfile({
              displayName: userData.user.displayName || normalizedHandle.toUpperCase(),
              handle: normalizedHandle,
              banner: "",
              avatar: userData.user.avatarUrl || "",
              bio: userData.user.bio || "",
              link: "",
            });
            setUserId(userData.user._id);
          }
        } catch {
          // User not found, use fallback
          setAccessDenied(null);
          setProfile({
            displayName: normalizedHandle.toUpperCase(),
            handle: normalizedHandle,
            banner: "",
            avatar: "",
            bio: "This user hasn't set up their community page yet.",
            link: "",
          });
        }
      }

      // Load works
      try {
        const worksData = await worksApi.list({ author: normalizedHandle, limit: 20 });
        setUserWorks(worksData.works || []);
      } catch (err) {
        console.error("Failed to load works:", err);
      }

      // Load audios
      try {
        const audiosData = await uploadsApi.getUserAudios(normalizedHandle);
        setUserAudios(audiosData.audios || []);
      } catch (err) {
        console.error("Failed to load audios:", err);
      }

      // Load recent posts
      try {
        const postsData = await postsApi.list({ author: normalizedHandle, limit: 5 });
        setUserPosts(postsData.posts || []);
      } catch (err) {
        console.error("Failed to load posts:", err);
      }

      setLoading(false);
    }

    loadData();
  }, [normalizedHandle]);

  // Check if following this user
  React.useEffect(() => {
    async function checkFollowStatus() {
      if (!isAuthed || !userId) return;
      try {
        const data = await followsApi.checkFollowing(userId);
        // API returns { status: "following" | "pending" | "none" }
        setFollowStatus(data.status || "none");
      } catch (err) {
        console.error("Failed to check following status:", err);
      }
    }
    checkFollowStatus();
  }, [isAuthed, userId]);

  // Load followers/following counts
  React.useEffect(() => {
    async function loadFollowCounts() {
      if (!normalizedHandle) return;
      try {
        const [followersData, followingData] = await Promise.all([
          followsApi.getUserFollowers(normalizedHandle),
          followsApi.getUserFollowing(normalizedHandle),
        ]);
        setFollowers(followersData.followers || []);
        setFollowing(followingData.following || []);
      } catch (err) {
        console.error("Failed to load follow counts:", err);
      }
    }
    loadFollowCounts();
  }, [normalizedHandle]);

  // Open followers/following modal
  async function openFollowModal(tab) {
    setFollowModalTab(tab);
    setFollowModalOpen(true);
    setLoadingFollows(true);

    try {
      const [followersData, followingData] = await Promise.all([
        followsApi.getUserFollowers(normalizedHandle),
        followsApi.getUserFollowing(normalizedHandle),
      ]);
      setFollowers(followersData.followers || []);
      setFollowing(followingData.following || []);
    } catch (err) {
      console.error("Failed to load follows:", err);
    } finally {
      setLoadingFollows(false);
    }
  }

  function closeFollowModal() {
    setFollowModalOpen(false);
  }

  // Chatroom state (starts empty - real-time chat not yet implemented)
  const [chatMessages, setChatMessages] = React.useState([]);
  const [chatInput, setChatInput] = React.useState("");
  const chatEndRef = React.useRef(null);
  const isInitialChatMount = React.useRef(true);

  function handleSendMessage() {
    if (!isAuthed) {
      window.dispatchEvent(new Event("sable:open-auth"));
      return;
    }
    const text = chatInput.trim();
    if (!text) return;
    const newMsg = {
      id: `m_${Date.now()}`,
      user: normalizedUsername || "guest",
      text,
      time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    };
    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput("");
  }

  function handleChatKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  // Only scroll chat to bottom when new messages are added, not on initial load
  React.useEffect(() => {
    if (isInitialChatMount.current) {
      isInitialChatMount.current = false;
      return;
    }
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  // Donation state
  const [donationAmount, setDonationAmount] = React.useState(5);
  const [customDonation, setCustomDonation] = React.useState("");
  const [donationSuccess, setDonationSuccess] = React.useState(false);
  const [donationNote, setDonationNote] = React.useState("");
  const [donationModalOpen, setDonationModalOpen] = React.useState(false);
  const [donationProcessing, setDonationProcessing] = React.useState(false);
  const [donationError, setDonationError] = React.useState("");

  function openDonationModal() {
    if (!isAuthed) {
      window.dispatchEvent(new Event("sable:open-auth"));
      return;
    }
    setDonationModalOpen(true);
    setDonationError("");
  }

  function closeDonationModal() {
    if (donationProcessing) return;
    setDonationModalOpen(false);
    setDonationError("");
  }

  async function handleDonate() {
    if (!isAuthed) {
      window.dispatchEvent(new Event("sable:open-auth"));
      return;
    }

    const amount = getEffectiveDonation();
    if (amount < 1) {
      setDonationError("Minimum donation is $1.00");
      return;
    }
    if (amount > 5000) {
      setDonationError("Maximum donation is $5,000");
      return;
    }

    setDonationProcessing(true);
    setDonationError("");

    try {
      // In production, this would integrate with PayPal SDK
      // For now, simulate PayPal redirect and callback
      // The actual PayPal flow would be:
      // 1. Create PayPal order via their SDK
      // 2. User approves payment on PayPal
      // 3. Capture payment and get transaction ID
      // 4. Call our API to record donation and notify user

      // Simulate PayPal processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Record the donation and send notification
      await donationsApi.donateToUser(userId, amount, donationNote.trim());

      setDonationSuccess(true);
      setDonationModalOpen(false);
      setDonationNote("");
      setCustomDonation("");
      setDonationAmount(5);

      // Hide success message after 5 seconds
      setTimeout(() => setDonationSuccess(false), 5000);
    } catch (err) {
      console.error("Donation failed:", err);
      setDonationError(err.message || "Payment failed. Please try again.");
    } finally {
      setDonationProcessing(false);
    }
  }

  function getEffectiveDonation() {
    const custom = parseFloat(customDonation);
    if (!isNaN(custom) && custom > 0) return custom;
    return donationAmount;
  }

  function pickDonationPreset(amt) {
    setDonationAmount(amt);
    setCustomDonation("");
    setDonationError("");
  }

  function handleWorkClick(workId) {
    navigate(`/works/${encodeURIComponent(workId)}`);
  }

  async function handleFollow() {
    if (!isAuthed) {
      window.dispatchEvent(new Event("sable:open-auth"));
      return;
    }
    if (!userId || followLoading) return;
    setFollowLoading(true);
    try {
      const result = await followsApi.follow(userId);
      // API returns { status: "following" } for public accounts
      // or { status: "pending" } for private accounts
      setFollowStatus(result.status || "following");
    } catch (err) {
      console.error("Failed to follow:", err);
    } finally {
      setFollowLoading(false);
    }
  }

  async function handleUnfollow() {
    if (!userId || followLoading) return;
    setFollowLoading(true);
    try {
      await followsApi.unfollow(userId);
      setFollowStatus("none");
    } catch (err) {
      console.error("Failed to unfollow:", err);
    } finally {
      setFollowLoading(false);
    }
  }

  async function handleCancelRequest() {
    if (!userId || followLoading) return;
    setFollowLoading(true);
    try {
      await followsApi.unfollow(userId);
      setFollowStatus("none");
    } catch (err) {
      console.error("Failed to cancel follow request:", err);
    } finally {
      setFollowLoading(false);
    }
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
  if (isAuthed && normalizedHandle && normalizedHandle === normalizedUsername) {
    return <Navigate to="/communities/me" replace />;
  }

  if (loading) {
    return (
      <div className="pcp">
        <SableLoader />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="pcp">
        <div className="pcp-accessDenied">
          <div className="pcp-accessDeniedIcon">🔒</div>
          <h2 className="pcp-accessDeniedTitle">
            {accessDenied === "private" ? "This page is private" : "Followers only"}
          </h2>
          <p className="pcp-accessDeniedText">
            {accessDenied === "private"
              ? "This user has set their community page to private."
              : "This user's community page is only visible to their followers."}
          </p>
          {!isAuthed && (
            <button
              type="button"
              className="pcp-accessDeniedBtn"
              onClick={() => window.dispatchEvent(new Event("sable:open-auth"))}
            >
              Log in
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="pcp">
        <div className="pcp-notFound">
          <h2>User not found</h2>
          <Link to="/communities">Back to Communities</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pcp">
      {/* Banner */}
      <section
        className={`pcp-banner ${!profile.banner ? "pcp-banner--empty" : ""}`}
        style={profile.banner ? { backgroundImage: `url(${profile.banner})` } : undefined}
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
                {followStatus === "following" ? (
                  <button
                    type="button"
                    className="pcp-actionBtn pcp-followBtn pcp-followBtn--following"
                    onClick={handleUnfollow}
                    disabled={followLoading}
                    aria-label="Unfollow"
                  >
                    {followLoading ? "..." : "Following"}
                  </button>
                ) : followStatus === "pending" ? (
                  <button
                    type="button"
                    className="pcp-actionBtn pcp-followBtn pcp-followBtn--pending"
                    onClick={handleCancelRequest}
                    disabled={followLoading}
                    aria-label="Cancel follow request"
                  >
                    {followLoading ? "..." : "Requested"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="pcp-actionBtn pcp-followBtn"
                    onClick={handleFollow}
                    disabled={followLoading}
                    aria-label="Follow"
                  >
                    {followLoading ? "..." : "Follow"}
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

            <div className="pcp-followStats">
              <button
                type="button"
                className="pcp-followStat"
                onClick={() => openFollowModal("followers")}
              >
                <span className="pcp-followStatCount">{followers.length}</span>
                <span className="pcp-followStatLabel">Followers</span>
              </button>
              <button
                type="button"
                className="pcp-followStat"
                onClick={() => openFollowModal("following")}
              >
                <span className="pcp-followStatCount">{following.length}</span>
                <span className="pcp-followStatLabel">Following</span>
              </button>
            </div>

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
                {userWorks.length === 0 ? (
                  <div className="pcp-emptyState">No published works yet.</div>
                ) : (
                  <div className="pcp-worksRow">
                    {userWorks.map((work) => (
                      <div
                        key={work._id}
                        className="pcp-workCard"
                        role="button"
                        tabIndex={0}
                        aria-label={work.title}
                        onClick={() => handleWorkClick(work._id)}
                        onKeyDown={(e) => e.key === "Enter" && handleWorkClick(work._id)}
                      >
                        {work.coverImageUrl ? (
                          <img className="pcp-workCover" src={work.coverImageUrl} alt="" />
                        ) : (
                          <div className="pcp-workCover pcp-workCover--placeholder" />
                        )}
                        <div className="pcp-workInfo">
                          <div className="pcp-workTitle">{work.title}</div>
                          <div className="pcp-workMeta">{work.genre || "—"} · {work.wordCount?.toLocaleString() || 0} words</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "reading" && (
              <div className="pcp-tabContent" aria-label="Reading List">
                <div className="pcp-emptyState">
                  Reading lists are private. Only the user can see their own reading list.
                </div>
              </div>
            )}

            {activeTab === "skins" && (
              <div className="pcp-tabContent" aria-label="Skins">
                <div className="pcp-emptyState">
                  Skins feature coming soon.
                </div>
              </div>
            )}

            {activeTab === "audios" && (
              <div className="pcp-tabContent" aria-label="Audios">
                {userAudios.length === 0 ? (
                  <div className="pcp-emptyState">No audio uploads yet.</div>
                ) : (
                  <div className="pcp-listItems">
                    {userAudios.map((audio) => (
                      <div key={audio._id} className="pcp-listItem pcp-audioItem">
                        <div className="pcp-listItemMain">
                          <div className="pcp-listItemTitle">{audio.title || "Audio Track"}</div>
                          <div className="pcp-listItemMeta">
                            {audio.plays || 0} plays · {new Date(audio.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <audio controls src={audio.url} className="pcp-audioPlayer" />
                      </div>
                    ))}
                  </div>
                )}
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
              <div className="pcp-panel pcp-panel--recentPosts">
                <div className="pcp-panelTitle">Recent Posts</div>
                <div className="pcp-recentPostsBox">
                  {userPosts.length === 0 ? (
                    <div className="pcp-emptyState pcp-emptyState--small">No posts yet</div>
                  ) : (
                    userPosts.map((post) => (
                      <Link
                        key={post._id}
                        to={`/communities?post=${post._id}`}
                        className="pcp-recentPostItem"
                      >
                        <div className="pcp-recentPostContent">
                          {post.title && <div className="pcp-recentPostTitle">{post.title}</div>}
                          <div className="pcp-recentPostCaption">
                            {(post.caption || post.content || "").slice(0, 100)}
                            {(post.caption || post.content || "").length > 100 && "..."}
                          </div>
                          <div className="pcp-recentPostMeta">
                            {post.likesCount || 0} likes · {post.commentsCount || 0} replies
                          </div>
                        </div>
                        {post.imageUrl && (
                          <img className="pcp-recentPostImage" src={post.imageUrl} alt="" />
                        )}
                      </Link>
                    ))
                  )}
                </div>
              </div>

              <div className="pcp-panel pcp-panel--donations">
                <div className="pcp-panelTitle">Support {profile.displayName}</div>
                <div className="pcp-donationBox">
                  {donationSuccess ? (
                    <div className="pcp-donationSuccess">
                      <div className="pcp-donationSuccessIcon">✓</div>
                      <div className="pcp-donationSuccessText">Thank you for your support!</div>
                      <div className="pcp-donationSuccessAmount">${getEffectiveDonation().toFixed(2)}</div>
                    </div>
                  ) : (
                    <>
                      <p className="pcp-donationDesc">
                        Show your appreciation by supporting {profile.displayName}'s creative work.
                      </p>
                      <button
                        type="button"
                        className="pcp-supportBtn"
                        onClick={openDonationModal}
                      >
                        Support with PayPal
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="pcp-panel pcp-panel--recentWorks">
                <div className="pcp-panelTitle">Recent Works</div>
                <div className="pcp-recentWorksBox">
                  {userWorks.length === 0 ? (
                    <div className="pcp-emptyState pcp-emptyState--small">No works yet</div>
                  ) : (
                    userWorks.slice(0, 3).map((work) => (
                      <div
                        key={work._id}
                        className="pcp-recentWorkItem"
                        onClick={() => handleWorkClick(work._id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && handleWorkClick(work._id)}
                      >
                        {work.coverImageUrl ? (
                          <img className="pcp-recentWorkCover" src={work.coverImageUrl} alt="" />
                        ) : (
                          <div className="pcp-recentWorkCover" />
                        )}
                        <div className="pcp-recentWorkInfo">
                          <div className="pcp-recentWorkTitle">{work.title}</div>
                          <div className="pcp-recentWorkMeta">{work.genre || "—"} · {work.wordCount?.toLocaleString() || 0} words</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pcp-panel pcp-panel--chatroom">
                <div className="pcp-panelTitle">Chatroom</div>
                <div className="pcp-chatBox">
                  <div className="pcp-chatMessages">
                    {chatMessages.length === 0 ? (
                      <div className="pcp-chatEmpty">No messages yet. Start the conversation!</div>
                    ) : (
                      chatMessages.map((msg) => (
                        <div key={msg.id} className="pcp-chatMessage">
                          <div className="pcp-chatMsgHeader">
                            <span className="pcp-chatMsgUser">@{msg.user}</span>
                            <span className="pcp-chatMsgTime">{msg.time}</span>
                          </div>
                          <div className="pcp-chatMsgText">{msg.text}</div>
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="pcp-chatInputRow">
                    <input
                      type="text"
                      className="pcp-chatInput"
                      placeholder={isAuthed ? "Type a message..." : "Log in to chat..."}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={handleChatKeyDown}
                      aria-label="Chat message"
                      disabled={!isAuthed}
                    />
                    <button
                      type="button"
                      className="pcp-chatSendBtn"
                      onClick={handleSendMessage}
                      disabled={!isAuthed || !chatInput.trim()}
                      aria-label="Send message"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Followers/Following Modal */}
      {followModalOpen && (
        <div className="pcp-modal-overlay" onClick={closeFollowModal}>
          <div className="pcp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pcp-modalHeader">
              <div className="pcp-modalTabs">
                <button
                  type="button"
                  className={`pcp-modalTab ${followModalTab === "followers" ? "pcp-modalTab--active" : ""}`}
                  onClick={() => setFollowModalTab("followers")}
                >
                  Followers ({followers.length})
                </button>
                <button
                  type="button"
                  className={`pcp-modalTab ${followModalTab === "following" ? "pcp-modalTab--active" : ""}`}
                  onClick={() => setFollowModalTab("following")}
                >
                  Following ({following.length})
                </button>
              </div>
              <button type="button" className="pcp-modalClose" onClick={closeFollowModal}>
                ✕
              </button>
            </div>

            <div className="pcp-modalBody">
              {loadingFollows ? (
                <div className="pcp-modalEmpty">Loading...</div>
              ) : followModalTab === "followers" ? (
                followers.length === 0 ? (
                  <div className="pcp-modalEmpty">No followers yet</div>
                ) : (
                  <div className="pcp-followList">
                    {followers.map((user) => (
                      <Link
                        key={user._id}
                        to={`/communities/${user.username}`}
                        className="pcp-followItem"
                        onClick={closeFollowModal}
                      >
                        <ListAvatar avatarUrl={user.avatarUrl} name={user.displayName || user.username} />
                        <div className="pcp-followItemInfo">
                          <div className="pcp-followItemUsername">@{user.username}</div>
                          {user.displayName && user.displayName !== user.username && (
                            <div className="pcp-followItemDisplayName">{user.displayName}</div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )
              ) : following.length === 0 ? (
                <div className="pcp-modalEmpty">Not following anyone yet</div>
              ) : (
                <div className="pcp-followList">
                  {following.map((user) => (
                    <Link
                      key={user._id}
                      to={`/communities/${user.username}`}
                      className="pcp-followItem"
                      onClick={closeFollowModal}
                    >
                      <ListAvatar avatarUrl={user.avatarUrl} name={user.displayName || user.username} />
                      <div className="pcp-followItemInfo">
                        <div className="pcp-followItemUsername">@{user.username}</div>
                        {user.displayName && user.displayName !== user.username && (
                          <div className="pcp-followItemDisplayName">{user.displayName}</div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Donation Modal */}
      {donationModalOpen && (
        <div className="pcp-modal-overlay" onClick={closeDonationModal}>
          <div className="pcp-modal pcp-modal--donation" onClick={(e) => e.stopPropagation()}>
            <div className="pcp-modalHeader">
              <h3 className="pcp-donationModalTitle">Support {profile.displayName}</h3>
              <button
                type="button"
                className="pcp-modalClose"
                onClick={closeDonationModal}
                disabled={donationProcessing}
              >
                ✕
              </button>
            </div>

            <div className="pcp-modalBody pcp-donationModalBody">
              {/* Amount Selection */}
              <div className="pcp-donationSection">
                <div className="pcp-donationSectionTitle">Choose an amount</div>
                <div className="pcp-donationAmounts">
                  {DONATION_PRESETS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className={`pcp-donationBtn ${donationAmount === amt && !customDonation ? "pcp-donationBtn--active" : ""}`}
                      onClick={() => pickDonationPreset(amt)}
                      disabled={donationProcessing}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Amount */}
              <div className="pcp-donationSection">
                <label className="pcp-donationLabel" htmlFor="customDonation">
                  Or enter a custom amount
                </label>
                <div className="pcp-donationCustom">
                  <span className="pcp-donationDollar">$</span>
                  <input
                    id="customDonation"
                    type="text"
                    className="pcp-donationInput"
                    placeholder="25.00"
                    value={customDonation}
                    onChange={(e) => {
                      setCustomDonation(e.target.value.replace(/[^\d.]/g, ""));
                      setDonationError("");
                    }}
                    disabled={donationProcessing}
                  />
                </div>
              </div>

              {/* Note */}
              <div className="pcp-donationSection">
                <label className="pcp-donationLabel" htmlFor="donationNote">
                  Add a note (optional)
                </label>
                <textarea
                  id="donationNote"
                  className="pcp-donationNoteInput"
                  placeholder="Say something nice..."
                  value={donationNote}
                  onChange={(e) => setDonationNote(e.target.value)}
                  rows={3}
                  maxLength={500}
                  disabled={donationProcessing}
                />
              </div>

              {/* Summary */}
              <div className="pcp-donationSummary">
                <span className="pcp-donationSummaryLabel">Your contribution:</span>
                <span className="pcp-donationSummaryAmount">${getEffectiveDonation().toFixed(2)}</span>
              </div>

              {/* Error Message */}
              {donationError && (
                <div className="pcp-donationError" role="alert">
                  {donationError}
                </div>
              )}

              {/* PayPal Button */}
              <button
                type="button"
                className="pcp-paypalBtn"
                onClick={handleDonate}
                disabled={donationProcessing}
              >
                {donationProcessing ? (
                  <span className="pcp-paypalProcessing">Processing...</span>
                ) : (
                  <>
                    <span className="pcp-paypalLogo">PayPal</span>
                    <span className="pcp-paypalText">Pay with PayPal</span>
                  </>
                )}
              </button>

              <div className="pcp-donationDisclaimer">
                You'll be redirected to PayPal to complete your payment securely.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


