import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./YourCommunityPage.css";

import bannerImg from "../assets/images/community_banner.png";
import profileImg from "../assets/images/profile_picture.png";

import editBannerIcon from "../assets/images/edit_banner.png";
import editProfileIcon from "../assets/images/edit_profile_picture.png";
import subtractWidgetIcon from "../assets/images/subtract_widget.png";

// localstorage key for widget settings
const WIDGETS_KEY = "sable_community_widgets_v1";

const DEFAULT_WIDGETS = {
  announcements: true,
  donations: true,
  recentWorks: true,
  chatroom: true,
};

function getWidgetSettings() {
  try {
    const saved = localStorage.getItem(WIDGETS_KEY);
    return saved ? { ...DEFAULT_WIDGETS, ...JSON.parse(saved) } : DEFAULT_WIDGETS;
  } catch {
    return DEFAULT_WIDGETS;
  }
}

function saveWidgetSettings(widgets) {
  localStorage.setItem(WIDGETS_KEY, JSON.stringify(widgets));
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

const INITIAL_CHAT_MESSAGES = [
  { id: "m1", user: "amira.salem", text: "Love the new chapter!", time: "2:34 PM" },
  { id: "m2", user: "hadassah", text: "When's the next update coming?", time: "2:36 PM" },
  { id: "m3", user: "zoey", text: "This community is amazing!", time: "2:40 PM" },
];

const DONATION_PRESETS = [5, 10, 25];

const MOCK_RECENT_DONATIONS = [
  { user: "bookworm", amount: "$10", time: "2 hours ago" },
  { user: "storyfan", amount: "$5", time: "Yesterday" },
];

const MOCK_ANNOUNCEMENTS = [
  { id: "a1", text: "New chapter coming this weekend!", date: "2 hours ago", pinned: true },
  { id: "a2", text: "Thank you for 1000 followers!", date: "3 days ago", pinned: false },
  { id: "a3", text: "Taking a short break next week", date: "1 week ago", pinned: false },
];

export default function YourCommunityPage({ username }) {
  const location = useLocation();
  const navigate = useNavigate();

  const initialDisplayName = (username || "john.doe").toUpperCase();

  const [isEditing, setIsEditing] = React.useState(false);

  // Front-end "saved" profile fields
  const [displayName, setDisplayName] = React.useState(initialDisplayName);
  const [handle] = React.useState("@User4658");
  const [bio, setBio] = React.useState(
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus."
  );
  const [link, setLink] = React.useState("x.com/user4658");
  const [visibility, setVisibility] = React.useState("public"); // public | private | following

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

  // Widget settings state
  const [widgets, setWidgets] = React.useState(() => getWidgetSettings());

  // Chatroom state
  const [chatMessages, setChatMessages] = React.useState(INITIAL_CHAT_MESSAGES);
  const [chatInput, setChatInput] = React.useState("");
  const chatEndRef = React.useRef(null);

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

  React.useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  // Donation state (for viewing received donations)
  const [donationHistory] = React.useState(MOCK_RECENT_DONATIONS);
  const [totalReceived] = React.useState("$245.00");

  function handleWorkClick(workId) {
    navigate(`/works/view/${encodeURIComponent(workId)}`);
  }

  function toggleWidget(widgetKey) {
    setWidgets((prev) => {
      const updated = { ...prev, [widgetKey]: !prev[widgetKey] };
      saveWidgetSettings(updated);
      return updated;
    });
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

  function saveAndClose() {
    setDisplayName((draftName || "").trim() || initialDisplayName);
    setBio(draftBio || "");
    setLink((draftLink || "").trim());
    setVisibility(draftVisibility);
    setIsEditing(false);
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

  return (
    <div className="ycp">
      {/* Banner */}
      <section className="ycp-banner" style={{ backgroundImage: `url(${bannerImg})` }} aria-label="Community banner">
        <button
          type="button"
          className="ycp-bannerEditBtn"
          onClick={openEdit}
          aria-label="Edit community page"
          title="Edit"
        >
          <img className="ycp-bannerEditIcon" src={editBannerIcon} alt="" aria-hidden="true" />
        </button>
      </section>

      <section className="ycp-card" aria-label="Community profile">
        {/* Avatar */}
        <div className="ycp-avatarWrap">
          <img className="ycp-avatar" src={profileImg} alt="Profile" />

          {isEditing ? (
            <button
              type="button"
              className="ycp-avatarEditBtn"
              aria-label="Edit profile picture"
              title="Edit profile picture"
              onClick={() => {
                
              }}
            >
              <img className="ycp-avatarEditIcon" src={editProfileIcon} alt="" aria-hidden="true" />
            </button>
          ) : null}
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
                  <div className="ycp-worksRow">
                    {MOCK_WORKS.map((work) => (
                      <div
                        key={work.id}
                        className="ycp-workCard"
                        role="button"
                        tabIndex={0}
                        aria-label={work.title}
                        onClick={() => handleWorkClick(work.id)}
                        onKeyDown={(e) => e.key === "Enter" && handleWorkClick(work.id)}
                      >
                        <div className="ycp-workCover ycp-workCover--placeholder" />
                        <div className="ycp-workInfo">
                          <div className="ycp-workTitle">{work.title}</div>
                          <div className="ycp-workMeta">{work.genre} · {work.wordCount} words</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "reading" && (
                <div className="ycp-tabContent" aria-label="Reading List">
                  <div className="ycp-listItems">
                    {MOCK_READING_LIST.map((item) => (
                      <div key={item.id} className="ycp-listItem">
                        <div className="ycp-listItemMain">
                          <div className="ycp-listItemTitle">{item.title}</div>
                          <div className="ycp-listItemMeta">by @{item.author}</div>
                        </div>
                        <div className="ycp-listItemProgress">{item.progress}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "skins" && (
                <div className="ycp-tabContent" aria-label="Skins">
                  <div className="ycp-listItems">
                    {MOCK_SKINS.map((skin) => (
                      <div key={skin.id} className="ycp-listItem">
                        <div className="ycp-listItemMain">
                          <div className="ycp-listItemTitle">{skin.name}</div>
                          <div className="ycp-listItemMeta">{skin.downloads} downloads · {skin.likes} likes</div>
                        </div>
                        <button type="button" className="ycp-listItemBtn">Preview</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "audios" && (
                <div className="ycp-tabContent" aria-label="Audios">
                  <div className="ycp-listItems">
                    {MOCK_AUDIOS.map((audio) => (
                      <div key={audio.id} className="ycp-listItem">
                        <div className="ycp-listItemMain">
                          <div className="ycp-listItemTitle">{audio.title}</div>
                          <div className="ycp-listItemMeta">{audio.duration} · {audio.plays} plays</div>
                        </div>
                        <button type="button" className="ycp-listItemBtn">▶ Play</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <aside className="ycp-right" aria-label="Community panels">
              <div className="ycp-panels">
                {widgets.announcements && (
                  <div className="ycp-panel ycp-panel--announcements">
                    <div className="ycp-panelTitle">Announcements</div>
                    <div className="ycp-announcementsBox">
                      {MOCK_ANNOUNCEMENTS.map((ann) => (
                        <div key={ann.id} className={`ycp-announcementItem ${ann.pinned ? "ycp-announcementItem--pinned" : ""}`}>
                          {ann.pinned && <span className="ycp-announcementPin">📌</span>}
                          <div className="ycp-announcementContent">
                            <div className="ycp-announcementText">{ann.text}</div>
                            <div className="ycp-announcementDate">{ann.date}</div>
                          </div>
                        </div>
                      ))}
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
                      {MOCK_WORKS.slice(0, 3).map((work) => (
                        <div
                          key={work.id}
                          className="ycp-recentWorkItem"
                          onClick={() => handleWorkClick(work.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === "Enter" && handleWorkClick(work.id)}
                        >
                          <div className="ycp-recentWorkCover" />
                          <div className="ycp-recentWorkInfo">
                            <div className="ycp-recentWorkTitle">{work.title}</div>
                            <div className="ycp-recentWorkMeta">{work.genre} · {work.wordCount}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {widgets.chatroom && (
                  <div className="ycp-panel ycp-panel--chatroom">
                    <div className="ycp-panelTitle">Chatroom</div>
                    <div className="ycp-chatBox">
                      <div className="ycp-chatMessages">
                        {chatMessages.map((msg) => (
                          <div key={msg.id} className="ycp-chatMessage">
                            <div className="ycp-chatMsgHeader">
                              <span className="ycp-chatMsgUser">@{msg.user}</span>
                              <span className="ycp-chatMsgTime">{msg.time}</span>
                            </div>
                            <div className="ycp-chatMsgText">{msg.text}</div>
                          </div>
                        ))}
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
                <button type="button" className="ycp-doneBtn" onClick={saveAndClose}>
                  Done
                </button>
              </div>
            </div>

            {/* Right widgets */}
            <aside className="ycp-editRight" aria-label="Widgets">
              <div className="ycp-widgetsTitle">Widgets</div>

              <div className="ycp-panels ycp-panels--edit">
                {widgets.announcements && (
                  <div className="ycp-panel ycp-panel--edit">
                    <div className="ycp-panelTitle">Announcements</div>
                    <div className="ycp-panelBox ycp-panelBox--edit">
                      <button type="button" className="ycp-subtractBtn" aria-label="Remove Announcements widget" title="Remove" onClick={() => toggleWidget("announcements")}>
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
                        + Announcements
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
    </div>
  );
}



