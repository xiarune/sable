import React from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import "./YourCommunityPage.css";
import { uploadsApi, worksApi, communityApi, bookmarksApi, followsApi, usersApi, authApi, postsApi } from "../api";
import { SableLoader } from "../components";

import editBannerIcon from "../assets/images/edit_banner.png";
import editProfileIcon from "../assets/images/edit_profile_picture.png";
import subtractWidgetIcon from "../assets/images/subtract_widget.png";

// Avatar component for followers/following list
function ListAvatar({ avatarUrl, name }) {
  const initial = (name || "U").charAt(0).toUpperCase();
  if (avatarUrl) {
    return <img className="ycp-listAvatar" src={avatarUrl} alt="" />;
  }
  return <div className="ycp-listAvatar ycp-listAvatar--fallback">{initial}</div>;
}

const DEFAULT_WIDGETS = {
  announcements: true,
  donations: true,
  recentWorks: true,
  chatroom: true,
};

export default function YourCommunityPage({ username }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Scroll to top on mount
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const initialDisplayName = (username || "john.doe").toUpperCase();

  const [isEditing, setIsEditing] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  // Community page data from API
  const [communityPage, setCommunityPage] = React.useState(null);

  // Front-end "saved" profile fields
  const [displayName, setDisplayName] = React.useState(initialDisplayName);
  const [handle, setHandle] = React.useState(`@${username || "user"}`);
  const [bio, setBio] = React.useState("");
  const [link, setLink] = React.useState("");
  const [visibility, setVisibility] = React.useState("public");
  const [bannerUrl, setBannerUrl] = React.useState("");
  const [profileUrl, setProfileUrl] = React.useState("");

  // Draft fields used only in edit mode
  const [draftName, setDraftName] = React.useState(displayName);
  const [draftBio, setDraftBio] = React.useState(bio);
  const [draftLink, setDraftLink] = React.useState(link);
  const [draftVisibility, setDraftVisibility] = React.useState(visibility);

  // Active tab state
  const [activeTab, setActiveTab] = React.useState("works");

  // Search state
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Real data state
  const [userWorks, setUserWorks] = React.useState([]);
  const [userAudios, setUserAudios] = React.useState([]);
  const [readingList, setReadingList] = React.useState([]);
  const [userPosts, setUserPosts] = React.useState([]);

  // Image upload state
  const [uploadingBanner, setUploadingBanner] = React.useState(false);
  const [uploadingProfile, setUploadingProfile] = React.useState(false);
  const bannerInputRef = React.useRef(null);
  const profileInputRef = React.useRef(null);

  // Followers/following state
  const [followers, setFollowers] = React.useState([]);
  const [following, setFollowing] = React.useState([]);
  const [followModalOpen, setFollowModalOpen] = React.useState(false);
  const [followModalTab, setFollowModalTab] = React.useState("followers"); // "followers" | "following"
  const [loadingFollows, setLoadingFollows] = React.useState(false);

  // Fetch community page data and user profile
  React.useEffect(() => {
    async function loadCommunityPage() {
      try {
        // Fetch both community page and user profile
        const [communityData, userData] = await Promise.all([
          communityApi.getMine(),
          authApi.me(),
        ]);

        if (communityData.page) {
          setCommunityPage(communityData.page);
          setDisplayName(communityData.page.displayName || initialDisplayName);
          setHandle(`@${communityData.page.handle || username}`);
          setBio(communityData.page.bio || "");
          setLink(communityData.page.link || "");
          setVisibility(communityData.page.visibility || "public");
          setBannerUrl(communityData.page.bannerImageUrl || "");
          // Prefer user's avatarUrl (source of truth) over communityPage.profileImageUrl
          const userAvatar = userData?.user?.avatarUrl || "";
          const pageAvatar = communityData.page.profileImageUrl || "";
          setProfileUrl(userAvatar || pageAvatar);
          // Announcements removed - now using recent posts instead
          if (communityData.page.widgets) {
            setWidgets({ ...DEFAULT_WIDGETS, ...communityData.page.widgets });
          }
        }
      } catch (err) {
        console.error("Failed to load community page:", err);
      } finally {
        setLoading(false);
      }
    }

    loadCommunityPage();
  }, [username, initialDisplayName]);

  // Fetch user's works, audios, and reading list
  React.useEffect(() => {
    async function loadUserData() {
      try {
        const worksData = await worksApi.mine();
        setUserWorks(worksData.works || []);
      } catch (err) {
        console.error("Failed to load works:", err);
      }

      try {
        const audiosData = await uploadsApi.list("audio");
        setUserAudios(audiosData.uploads || []);
      } catch (err) {
        console.error("Failed to load audios:", err);
      }

      try {
        const bookmarksData = await bookmarksApi.getReadingList();
        // Convert bookmarks to reading list format (only those marked for reading list)
        const reading = (bookmarksData.bookmarks || []).map((b) => ({
          id: b._id,
          workId: b.workId,
          title: b.title || "Unknown",
          author: b.authorUsername || "Unknown",
          coverUrl: b.coverUrl || "",
          showInReadingList: b.showInReadingList,
        }));
        setReadingList(reading);
      } catch (err) {
        console.error("Failed to load reading list:", err);
      }

      // Fetch my recent posts
      try {
        const postsData = await postsApi.getMine();
        setUserPosts((postsData.posts || []).slice(0, 5));
      } catch (err) {
        console.error("Failed to load posts:", err);
      }
    }

    loadUserData();
  }, []);

  // Widget settings state
  const [widgets, setWidgets] = React.useState(DEFAULT_WIDGETS);

  // Fetch initial followers/following counts
  React.useEffect(() => {
    async function loadFollowCounts() {
      try {
        const [followersData, followingData] = await Promise.all([
          followsApi.getFollowers(),
          followsApi.getFollowing(),
        ]);
        setFollowers(followersData.followers || []);
        setFollowing(followingData.following || []);
      } catch (err) {
        console.error("Failed to load follow counts:", err);
      }
    }
    loadFollowCounts();
  }, []);

  // Fetch followers/following when modal opens (refresh data)
  async function openFollowModal(tab) {
    setFollowModalTab(tab);
    setFollowModalOpen(true);
    setLoadingFollows(true);

    try {
      const [followersData, followingData] = await Promise.all([
        followsApi.getFollowers(),
        followsApi.getFollowing(),
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
    const text = chatInput.trim();
    if (!text) return;
    const newMsg = {
      id: `m_${Date.now()}`,
      user: (username || "john.doe").toLowerCase(),
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

  // Donation state (for viewing received donations - not yet implemented)
  const [donationHistory] = React.useState([]);
  const [totalReceived] = React.useState("$0.00");

  function handleWorkClick(workId) {
    navigate(`/works/${encodeURIComponent(workId)}`);
  }

  async function toggleWidget(widgetKey) {
    const updated = { ...widgets, [widgetKey]: !widgets[widgetKey] };
    setWidgets(updated);
    try {
      await communityApi.update({ widgets: updated });
    } catch (err) {
      console.error("Failed to save widget settings:", err);
    }
  }

  // Handle banner image upload
  async function handleBannerUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBanner(true);
    try {
      const result = await uploadsApi.image(file, "banner");
      if (result.url) {
        setBannerUrl(result.url);
        await communityApi.update({ bannerImageUrl: result.url });
      }
    } catch (err) {
      console.error("Failed to upload banner:", err);
      alert("Failed to upload banner image. Please try again.");
    } finally {
      setUploadingBanner(false);
      if (bannerInputRef.current) bannerInputRef.current.value = "";
    }
  }

  // Handle profile image upload - syncs to both CommunityPage and User profile
  async function handleProfileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingProfile(true);
    try {
      const result = await uploadsApi.image(file, "avatar");
      if (result.url) {
        setProfileUrl(result.url);
        // Update both CommunityPage and User profile to keep them in sync
        await Promise.all([
          communityApi.update({ profileImageUrl: result.url }),
          usersApi.updateProfile({ avatarUrl: result.url }),
        ]);
      }
    } catch (err) {
      console.error("Failed to upload profile picture:", err);
      alert("Failed to upload profile picture. Please try again.");
    } finally {
      setUploadingProfile(false);
      if (profileInputRef.current) profileInputRef.current.value = "";
    }
  }

  // Check if any widgets are disabled
  const hasDisabledWidgets = !widgets.announcements || !widgets.donations || !widgets.recentWorks || !widgets.chatroom;

  function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: `${displayName}'s Community Page`, url }).catch(() => {
        // User cancelled share or share failed error
      });
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  }

  function handleSearch() {
    setIsSearchOpen((v) => !v);
  }

  function openEdit() {
    setDraftName(displayName);
    setDraftBio(bio);
    setDraftLink(link);
    setDraftVisibility(visibility);
    setIsEditing(true);
  }

  async function saveAndClose() {
    const newName = (draftName || "").trim() || initialDisplayName;
    const newBio = draftBio || "";
    const newLink = (draftLink || "").trim();
    const newVisibility = draftVisibility;

    setSaving(true);
    try {
      await communityApi.update({
        displayName: newName,
        bio: newBio,
        link: newLink,
        visibility: newVisibility,
      });
      setDisplayName(newName);
      setBio(newBio);
      setLink(newLink);
      setVisibility(newVisibility);
    } catch (err) {
      console.error("Failed to save community page:", err);
    } finally {
      setSaving(false);
      setIsEditing(false);
    }
  }


  React.useEffect(() => {
    const search = new URLSearchParams(location.search || "");
    const editParam = search.get("edit");

    const wantsEditFromQuery = editParam === "1" || editParam === "true";
    const wantsEditFromState = Boolean(location.state && location.state.edit);

    if (wantsEditFromQuery || wantsEditFromState) {
      openEdit();
    }
    // Only run on navigation changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]); // location.key changes on navigation

  if (loading) {
    return (
      <div className="ycp">
        <SableLoader />
      </div>
    );
  }

  // Get initials for fallback avatar
  const initials = (displayName || username || "U").charAt(0).toUpperCase();

  return (
    <div className="ycp">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={bannerInputRef}
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleBannerUpload}
      />
      <input
        type="file"
        ref={profileInputRef}
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleProfileUpload}
      />

      {/* Banner */}
      <section
        className={`ycp-banner ${!bannerUrl ? "ycp-banner--empty" : ""}`}
        style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}
        aria-label="Community banner"
      >
        {/* Edit mode: show upload button */}
        {isEditing ? (
          <button
            type="button"
            className="ycp-bannerEditBtn ycp-bannerEditBtn--upload"
            onClick={() => bannerInputRef.current?.click()}
            disabled={uploadingBanner}
            aria-label="Upload banner image"
            title="Upload banner"
          >
            {uploadingBanner ? (
              <span className="ycp-uploadingText">...</span>
            ) : (
              <img className="ycp-bannerEditIcon" src={editBannerIcon} alt="" aria-hidden="true" />
            )}
          </button>
        ) : (
          /* View mode: show pen icon to enter edit mode */
          <button
            type="button"
            className="ycp-bannerEditBtn"
            onClick={openEdit}
            aria-label="Edit community page"
            title="Edit community page"
          >
            <img className="ycp-bannerEditIcon" src={editBannerIcon} alt="" aria-hidden="true" />
          </button>
        )}
        {isEditing && !bannerUrl && !uploadingBanner && (
          <div className="ycp-bannerPlaceholder">Click to add a banner image</div>
        )}
      </section>

      <section className="ycp-card" aria-label="Community profile">
        {/* Avatar */}
        <div className="ycp-avatarWrap">
          {profileUrl ? (
            <img className="ycp-avatar" src={profileUrl} alt="Profile" />
          ) : (
            <div className="ycp-avatar ycp-avatar--fallback">{initials}</div>
          )}

          {/* Only show edit button in edit mode */}
          {isEditing && (
            <button
              type="button"
              className="ycp-avatarEditBtn"
              aria-label="Edit profile picture"
              title="Edit profile picture"
              onClick={() => profileInputRef.current?.click()}
              disabled={uploadingProfile}
            >
              {uploadingProfile ? (
                <span className="ycp-uploadingText">...</span>
              ) : (
                <img className="ycp-avatarEditIcon" src={editProfileIcon} alt="" aria-hidden="true" />
              )}
            </button>
          )}
        </div>

        {/* View mode */}
        {!isEditing ? (
          <div className="ycp-grid">
            <div className="ycp-left">
              <div className="ycp-nameRow">
                <h1 className="ycp-name">{displayName}</h1>

                <div className="ycp-actions" aria-label="Profile actions">
          
                  <button type="button" className="ycp-actionBtn" aria-label="Edit" onClick={openEdit} title="Edit">
                    ✎
                  </button>
                  <button type="button" className="ycp-actionBtn" aria-label="Search" title="Search" onClick={handleSearch}>
                    🔍
                  </button>
                  <button type="button" className="ycp-actionBtn" aria-label="Share" title="Share" onClick={handleShare}>
                    ⤴︎
                  </button>
                </div>
              </div>

              <div className="ycp-handle">{handle}</div>

              <div className="ycp-followStats">
                <button
                  type="button"
                  className="ycp-followStat"
                  onClick={() => openFollowModal("followers")}
                >
                  <span className="ycp-followStatCount">{followers.length}</span>
                  <span className="ycp-followStatLabel">Followers</span>
                </button>
                <button
                  type="button"
                  className="ycp-followStat"
                  onClick={() => openFollowModal("following")}
                >
                  <span className="ycp-followStatCount">{following.length}</span>
                  <span className="ycp-followStatLabel">Following</span>
                </button>
              </div>

              {isSearchOpen && (
                <div className="ycp-searchBar" aria-label="Search your content">
                  <input
                    type="text"
                    className="ycp-searchInput"
                    placeholder="Search works, skins, audios..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="ycp-searchClose"
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

              <p className="ycp-bio">{bio}</p>

              <div className="ycp-linkRow">
                <span className="ycp-linkIcon" aria-hidden="true">
                  🔗
                </span>
                <span className="ycp-linkText">{link}</span>
              </div>

              <div className="ycp-tabs" role="tablist" aria-label="Community tabs">
                <button
                  type="button"
                  className={`ycp-tab ${activeTab === "works" ? "ycp-tab--active" : ""}`}
                  role="tab"
                  onClick={() => setActiveTab("works")}
                >
                  Works
                </button>
                <button
                  type="button"
                  className={`ycp-tab ${activeTab === "reading" ? "ycp-tab--active" : ""}`}
                  role="tab"
                  onClick={() => setActiveTab("reading")}
                >
                  Reading List
                </button>
                <button
                  type="button"
                  className={`ycp-tab ${activeTab === "skins" ? "ycp-tab--active" : ""}`}
                  role="tab"
                  onClick={() => setActiveTab("skins")}
                >
                  Skins
                </button>
                <button
                  type="button"
                  className={`ycp-tab ${activeTab === "audios" ? "ycp-tab--active" : ""}`}
                  role="tab"
                  onClick={() => setActiveTab("audios")}
                >
                  Audios
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === "works" && (
                <div className="ycp-tabContent" aria-label="Works">
                  {userWorks.length === 0 ? (
                    <div className="ycp-emptyState">No published works yet.</div>
                  ) : (
                    <div className="ycp-worksRow">
                      {userWorks.map((work) => (
                        <div
                          key={work._id}
                          className="ycp-workCard"
                          role="button"
                          tabIndex={0}
                          aria-label={work.title}
                          onClick={() => handleWorkClick(work._id)}
                          onKeyDown={(e) => e.key === "Enter" && handleWorkClick(work._id)}
                        >
                          {work.coverImageUrl ? (
                            <img className="ycp-workCover" src={work.coverImageUrl} alt="" />
                          ) : (
                            <div className="ycp-workCover ycp-workCover--placeholder" />
                          )}
                          <div className="ycp-workInfo">
                            <div className="ycp-workTitle">{work.title}</div>
                            <div className="ycp-workMeta">{work.genre || "—"} · {work.wordCount?.toLocaleString() || 0} words</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "reading" && (
                <div className="ycp-tabContent" aria-label="Reading List">
                  {readingList.length === 0 ? (
                    <div className="ycp-emptyState">No works in your reading list yet.</div>
                  ) : (
                    <div className="ycp-listItems">
                      {readingList.map((item) => (
                        <div
                          key={item.id}
                          className="ycp-listItem"
                          role="button"
                          tabIndex={0}
                          onClick={() => item.workId && navigate(`/works/${item.workId}`)}
                          onKeyDown={(e) => e.key === "Enter" && item.workId && navigate(`/works/${item.workId}`)}
                        >
                          <div className="ycp-listItemMain">
                            <div className="ycp-listItemTitle">{item.title}</div>
                            <div className="ycp-listItemMeta">by @{item.author}</div>
                          </div>
                          <div className="ycp-listItemProgress">{item.progress}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "skins" && (
                <div className="ycp-tabContent" aria-label="Skins">
                  <div className="ycp-emptyState">
                    Skins feature coming soon. You'll be able to create and share custom themes here.
                  </div>
                </div>
              )}

              {activeTab === "audios" && (
                <div className="ycp-tabContent" aria-label="Audios">
                  {userAudios.length === 0 ? (
                    <div className="ycp-emptyState">No audio uploads yet.</div>
                  ) : (
                    <div className="ycp-listItems">
                      {userAudios.map((audio) => (
                        <div key={audio._id} className="ycp-listItem ycp-audioItem">
                          <div className="ycp-listItemMain">
                            <div className="ycp-listItemTitle">{audio.title || "Audio Track"}</div>
                            <div className="ycp-listItemMeta">
                              {audio.plays || 0} plays · {new Date(audio.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <audio controls src={audio.url} className="ycp-audioPlayer" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <aside className="ycp-right" aria-label="Community panels">
              <div className="ycp-panels">
                {widgets.announcements && (
                  <div className="ycp-panel ycp-panel--recentPosts">
                    <div className="ycp-panelTitle">Recent Posts</div>
                    <div className="ycp-recentPostsBox">
                      {userPosts.length === 0 ? (
                        <div className="ycp-emptyState ycp-emptyState--small">No posts yet</div>
                      ) : (
                        userPosts.map((post) => (
                          <Link
                            key={post._id}
                            to={`/communities?post=${post._id}`}
                            className="ycp-recentPostItem"
                          >
                            <div className="ycp-recentPostContent">
                              {post.title && <div className="ycp-recentPostTitle">{post.title}</div>}
                              <div className="ycp-recentPostCaption">
                                {(post.caption || post.content || "").slice(0, 100)}
                                {(post.caption || post.content || "").length > 100 && "..."}
                              </div>
                              <div className="ycp-recentPostMeta">
                                {post.likesCount || 0} likes · {post.commentsCount || 0} replies
                              </div>
                            </div>
                            {post.imageUrl && (
                              <img className="ycp-recentPostImage" src={post.imageUrl} alt="" />
                            )}
                          </Link>
                        ))
                      )}
                      <Link to="/communities" className="ycp-viewAllPosts">
                        View all posts →
                      </Link>
                    </div>
                  </div>
                )}

                {widgets.donations && (
                  <div className="ycp-panel ycp-panel--donations">
                    <div className="ycp-panelTitle">Donations</div>
                    <div className="ycp-donationBox">
                      <div className="ycp-donationTotal">
                        <span className="ycp-donationTotalLabel">Total Received</span>
                        <span className="ycp-donationTotalAmount">{totalReceived}</span>
                      </div>
                      <div className="ycp-donationRecent">
                        <div className="ycp-donationRecentTitle">Recent Donations</div>
                        {donationHistory.length > 0 ? (
                          <div className="ycp-donationList">
                            {donationHistory.map((d, idx) => (
                              <div key={idx} className="ycp-donationItem">
                                <span className="ycp-donationUser">@{d.user}</span>
                                <span className="ycp-donationAmount">{d.amount}</span>
                                <span className="ycp-donationTime">{d.time}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="ycp-donationEmpty">No donations yet</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {widgets.recentWorks && (
                  <div className="ycp-panel ycp-panel--recentWorks">
                    <div className="ycp-panelTitle">Recent Works</div>
                    <div className="ycp-recentWorksBox">
                      {userWorks.length === 0 ? (
                        <div className="ycp-emptyState ycp-emptyState--small">No works yet</div>
                      ) : (
                        userWorks.slice(0, 3).map((work) => (
                          <div
                            key={work._id}
                            className="ycp-recentWorkItem"
                            onClick={() => handleWorkClick(work._id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === "Enter" && handleWorkClick(work._id)}
                          >
                            {work.coverImageUrl ? (
                              <img className="ycp-recentWorkCover" src={work.coverImageUrl} alt="" />
                            ) : (
                              <div className="ycp-recentWorkCover" />
                            )}
                            <div className="ycp-recentWorkInfo">
                              <div className="ycp-recentWorkTitle">{work.title}</div>
                              <div className="ycp-recentWorkMeta">{work.genre || "—"} · {work.wordCount?.toLocaleString() || 0}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {widgets.chatroom && (
                  <div className="ycp-panel ycp-panel--chatroom">
                    <div className="ycp-panelTitle">Chatroom</div>
                    <div className="ycp-chatBox">
                      <div className="ycp-chatMessages">
                        {chatMessages.length === 0 ? (
                          <div className="ycp-chatEmpty">No messages yet. Start the conversation!</div>
                        ) : (
                          chatMessages.map((msg) => (
                            <div key={msg.id} className="ycp-chatMessage">
                              <div className="ycp-chatMsgHeader">
                                <span className="ycp-chatMsgUser">@{msg.user}</span>
                                <span className="ycp-chatMsgTime">{msg.time}</span>
                              </div>
                              <div className="ycp-chatMsgText">{msg.text}</div>
                            </div>
                          ))
                        )}
                        <div ref={chatEndRef} />
                      </div>
                      <div className="ycp-chatInputRow">
                        <input
                          type="text"
                          className="ycp-chatInput"
                          placeholder="Type a message..."
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={handleChatKeyDown}
                          aria-label="Chat message"
                        />
                        <button
                          type="button"
                          className="ycp-chatSendBtn"
                          onClick={handleSendMessage}
                          disabled={!chatInput.trim()}
                          aria-label="Send message"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>
        ) : null}

        {/* Edit mode */}
        {isEditing ? (
          <div className="ycp-editGrid" aria-label="Edit community page">
            {/* Left form */}
            <div className="ycp-editLeft">
              <div className="ycp-editRow">
                <div className="ycp-editLabel">Name</div>
                <input className="ycp-editInput" value={draftName} onChange={(e) => setDraftName(e.target.value)} aria-label="Name" />
              </div>

              <div className="ycp-editRow ycp-editRow--bio">
                <div className="ycp-editLabel">Bio</div>
                <textarea className="ycp-editTextarea" value={draftBio} onChange={(e) => setDraftBio(e.target.value)} aria-label="Bio" />
              </div>

              <div className="ycp-editRow">
                <div className="ycp-editLabel">Links</div>
                <input className="ycp-editInput" value={draftLink} onChange={(e) => setDraftLink(e.target.value)} aria-label="Links" />
              </div>

              <div className="ycp-editRow ycp-editRow--visibility">
                <div className="ycp-editLabel">Visibility</div>

                <div className="ycp-visibilityGroup" role="radiogroup" aria-label="Visibility">
                  <label className="ycp-radio">
                    <input
                      type="radio"
                      name="visibility"
                      value="public"
                      checked={draftVisibility === "public"}
                      onChange={() => setDraftVisibility("public")}
                    />
                    <div className="ycp-radioText">
                      <div className="ycp-radioTitle">Public</div>
                      <div className="ycp-radioSub">Visible to Everyone</div>
                    </div>
                  </label>

                  <label className="ycp-radio">
                    <input
                      type="radio"
                      name="visibility"
                      value="private"
                      checked={draftVisibility === "private"}
                      onChange={() => setDraftVisibility("private")}
                    />
                    <div className="ycp-radioText">
                      <div className="ycp-radioTitle">Private</div>
                      <div className="ycp-radioSub">Visible only to you</div>
                    </div>
                  </label>

                  <label className="ycp-radio">
                    <input
                      type="radio"
                      name="visibility"
                      value="following"
                      checked={draftVisibility === "following"}
                      onChange={() => setDraftVisibility("following")}
                    />
                    <div className="ycp-radioText">
                      <div className="ycp-radioTitle">Following</div>
                      <div className="ycp-radioSub">Visible only to those who follow you</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="ycp-editActions">
                <button type="button" className="ycp-doneBtn" onClick={saveAndClose} disabled={saving}>
                  {saving ? "Saving..." : "Done"}
                </button>
              </div>
            </div>

            {/* Right widgets */}
            <aside className="ycp-editRight" aria-label="Widgets">
              <div className="ycp-widgetsTitle">Widgets</div>

              <div className="ycp-panels ycp-panels--edit">
                {widgets.announcements && (
                  <div className="ycp-panel ycp-panel--edit">
                    <div className="ycp-panelTitle">Recent Posts</div>
                    <div className="ycp-panelBox ycp-panelBox--edit">
                      <button type="button" className="ycp-subtractBtn" aria-label="Remove Recent Posts widget" title="Remove" onClick={() => toggleWidget("announcements")}>
                        <img src={subtractWidgetIcon} alt="" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                )}

                {widgets.donations && (
                  <div className="ycp-panel ycp-panel--edit">
                    <div className="ycp-panelTitle">Donations</div>
                    <div className="ycp-panelBox ycp-panelBox--edit">
                      <button type="button" className="ycp-subtractBtn" aria-label="Remove Donations widget" title="Remove" onClick={() => toggleWidget("donations")}>
                        <img src={subtractWidgetIcon} alt="" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                )}

                {widgets.recentWorks && (
                  <div className="ycp-panel ycp-panel--edit">
                    <div className="ycp-panelTitle">Recent Works</div>
                    <div className="ycp-panelBox ycp-panelBox--edit">
                      <button type="button" className="ycp-subtractBtn" aria-label="Remove Recent Works widget" title="Remove" onClick={() => toggleWidget("recentWorks")}>
                        <img src={subtractWidgetIcon} alt="" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                )}

                {widgets.chatroom && (
                  <div className="ycp-panel ycp-panel--edit">
                    <div className="ycp-panelTitle">Chatroom</div>
                    <div className="ycp-panelBox ycp-panelBox--edit">
                      <button type="button" className="ycp-subtractBtn" aria-label="Remove Chatroom widget" title="Remove" onClick={() => toggleWidget("chatroom")}>
                        <img src={subtractWidgetIcon} alt="" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Add Widget options for disabled widgets */}
              {hasDisabledWidgets && (
                <div className="ycp-addWidgetSection">
                  <div className="ycp-addWidgetTitle">Add Widget</div>
                  <div className="ycp-addWidgetList">
                    {!widgets.announcements && (
                      <button type="button" className="ycp-addWidgetBtn" onClick={() => toggleWidget("announcements")}>
                        + Recent Posts
                      </button>
                    )}
                    {!widgets.donations && (
                      <button type="button" className="ycp-addWidgetBtn" onClick={() => toggleWidget("donations")}>
                        + Donations
                      </button>
                    )}
                    {!widgets.recentWorks && (
                      <button type="button" className="ycp-addWidgetBtn" onClick={() => toggleWidget("recentWorks")}>
                        + Recent Works
                      </button>
                    )}
                    {!widgets.chatroom && (
                      <button type="button" className="ycp-addWidgetBtn" onClick={() => toggleWidget("chatroom")}>
                        + Chatroom
                      </button>
                    )}
                  </div>
                </div>
              )}
            </aside>
          </div>
        ) : null}
      </section>

      {/* Followers/Following Modal */}
      {followModalOpen && (
        <div className="ycp-modal-overlay" onClick={closeFollowModal}>
          <div className="ycp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ycp-modalHeader">
              <div className="ycp-modalTabs">
                <button
                  type="button"
                  className={`ycp-modalTab ${followModalTab === "followers" ? "ycp-modalTab--active" : ""}`}
                  onClick={() => setFollowModalTab("followers")}
                >
                  Followers ({followers.length})
                </button>
                <button
                  type="button"
                  className={`ycp-modalTab ${followModalTab === "following" ? "ycp-modalTab--active" : ""}`}
                  onClick={() => setFollowModalTab("following")}
                >
                  Following ({following.length})
                </button>
              </div>
              <button type="button" className="ycp-modalClose" onClick={closeFollowModal}>
                ✕
              </button>
            </div>

            <div className="ycp-modalBody">
              {loadingFollows ? (
                <div className="ycp-modalEmpty">Loading...</div>
              ) : followModalTab === "followers" ? (
                followers.length === 0 ? (
                  <div className="ycp-modalEmpty">No followers yet</div>
                ) : (
                  <div className="ycp-followList">
                    {followers.map((user) => (
                      <Link
                        key={user._id}
                        to={`/communities/${user.username}`}
                        className="ycp-followItem"
                        onClick={closeFollowModal}
                      >
                        <ListAvatar avatarUrl={user.avatarUrl} name={user.displayName || user.username} />
                        <div className="ycp-followItemInfo">
                          <div className="ycp-followItemUsername">@{user.username}</div>
                          {user.displayName && user.displayName !== user.username && (
                            <div className="ycp-followItemDisplayName">{user.displayName}</div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )
              ) : following.length === 0 ? (
                <div className="ycp-modalEmpty">Not following anyone yet</div>
              ) : (
                <div className="ycp-followList">
                  {following.map((user) => (
                    <Link
                      key={user._id}
                      to={`/communities/${user.username}`}
                      className="ycp-followItem"
                      onClick={closeFollowModal}
                    >
                      <ListAvatar avatarUrl={user.avatarUrl} name={user.displayName || user.username} />
                      <div className="ycp-followItemInfo">
                        <div className="ycp-followItemUsername">@{user.username}</div>
                        {user.displayName && user.displayName !== user.username && (
                          <div className="ycp-followItemDisplayName">{user.displayName}</div>
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
    </div>
  );
}



