import React from "react";
import "./Inbox.css";

import yourAvatar from "../assets/images/profile_picture.png";
import otherAvatar from "../assets/images/other_profile.png";

const MOCK_THREADS = [
  {
    id: "t1",
    name: "jane.doe",
    last: "Lorem ipsum dolor sit....",
    status: "online", // online | away | offline
    avatar: otherAvatar,
    messages: [
      { id: "m1", from: "them", text: "Lorem ipsum dolor sit...." },
      { id: "m2", from: "me", text: "Nullam dictum felis eu pede mollis pretium." },
      {
        id: "m3",
        from: "them",
        text: "Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus.",
      },
      {
        id: "m4",
        from: "me",
        text: "Nullam dictum felis eu pede mollis pretium. Donec pede justo, fringilla vel, aliquet nec, vulputate eget, arcu.",
      },
    ],
  },
  {
    id: "t2",
    name: "Username",
    last: "Lorem ipsum dolor sit....",
    status: "away",
    avatar: "",
    messages: [
      { id: "m1", from: "them", text: "Lorem ipsum dolor sit...." },
      { id: "m2", from: "me", text: "Got it — I’ll take a look." },
    ],
  },
  {
    id: "t3",
    name: "Username",
    last: "Lorem ipsum dolor sit....",
    status: "offline",
    avatar: "",
    messages: [{ id: "m1", from: "them", text: "Lorem ipsum dolor sit...." }],
  },
];

const MOCK_USERS = [
  { id: "u1", name: "jane.doe", status: "online", avatar: otherAvatar },
  { id: "u2", name: "hadassah", status: "online", avatar: "" },
  { id: "u3", name: "zoey", status: "away", avatar: "" },
  { id: "u4", name: "lilly", status: "offline", avatar: "" },
  { id: "u5", name: "michael", status: "online", avatar: "" },
  { id: "u6", name: "odette", status: "away", avatar: "" },
];

const MOCK_FILES = [
  { id: "f1", name: "Chapter_3_Outline.pdf", meta: "PDF • 214 KB", where: "From: jane.doe", when: "Yesterday" },
  { id: "f2", name: "Sable_Skins_Concept.png", meta: "PNG • 1.2 MB", where: "From: hadassah", when: "2 days ago" },
  { id: "f3", name: "Feedback_Notes.txt", meta: "TXT • 6 KB", where: "Saved", when: "5 days ago" },
  { id: "f4", name: "Draft_Excerpt.docx", meta: "DOCX • 88 KB", where: "From: zoey", when: "1 week ago" },
];

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function StatusDot({ status }) {
  return <span className={`in-statusDot in-statusDot--${status}`} aria-label={status} />;
}

function Avatar({ name, avatar, status, size = "md" }) {
  const letter = (name || "U").trim()[0]?.toUpperCase() || "U";

  return (
    <div className={`in-avatarWrap in-avatarWrap--${size}`} aria-label={`${name} avatar`}>
      {avatar ? (
        <img className="in-avatarImg" src={avatar} alt="" aria-hidden="true" />
      ) : (
        <div className="in-avatarFallback" aria-hidden="true">
          {letter}
        </div>
      )}

      <div className="in-statusWrap" aria-hidden="true">
        <StatusDot status={status} />
      </div>
    </div>
  );
}

export default function Inbox() {
  // Left tabs
  const [leftTab, setLeftTab] = React.useState("Messages"); // Messages | Files

  // Right area modes
  const [rightMode, setRightMode] = React.useState("chat"); // chat | compose | files | settings

  // Threads state
  const [threadsData, setThreadsData] = React.useState(MOCK_THREADS);
  const [activeId, setActiveId] = React.useState(MOCK_THREADS[0].id);

  // Middle column search
  const [query, setQuery] = React.useState("");

  // Composer (sending messages)
  const [draft, setDraft] = React.useState("");

  // Compose-new-message UX
  const [userQuery, setUserQuery] = React.useState("");
  const [composeDraft, setComposeDraft] = React.useState("");

  // Chat search (header 🔎)
  const [isChatSearchOpen, setIsChatSearchOpen] = React.useState(false);
  const [chatSearchQuery, setChatSearchQuery] = React.useState("");

  // Info dropdown (ⓘ)
  const [isInfoOpen, setIsInfoOpen] = React.useState(false);
  const infoMenuRef = React.useRef(null);

  // Files UX
  const [fileQuery, setFileQuery] = React.useState("");
  const [activeFileId, setActiveFileId] = React.useState(MOCK_FILES[0].id);

  // Settings toggles
  const [muted, setMuted] = React.useState(false);
  const [readReceipts, setReadReceipts] = React.useState(true);

  const activeThread = React.useMemo(() => {
    return threadsData.find((t) => t.id === activeId) || threadsData[0];
  }, [threadsData, activeId]);

  const filteredThreads = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return threadsData;
    return threadsData.filter((t) => (t.name || "").toLowerCase().includes(q));
  }, [threadsData, query]);

  const filteredUsers = React.useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    const base = MOCK_USERS;
    if (!q) return base;

    return base.filter((u) => (u.name || "").toLowerCase().includes(q));
  }, [userQuery]);

  const filteredFiles = React.useMemo(() => {
    const q = fileQuery.trim().toLowerCase();
    if (!q) return MOCK_FILES;
    return MOCK_FILES.filter((f) => {
      const hay = `${f.name} ${f.meta} ${f.where} ${f.when}`.toLowerCase();
      return hay.includes(q);
    });
  }, [fileQuery]);

  const activeFile = React.useMemo(() => {
    return MOCK_FILES.find((f) => f.id === activeFileId) || MOCK_FILES[0];
  }, [activeFileId]);

  const visibleMessages = React.useMemo(() => {
    const msgs = activeThread?.messages || [];
    const q = chatSearchQuery.trim().toLowerCase();
    if (!isChatSearchOpen || !q) return msgs;
    return msgs.filter((m) => (m.text || "").toLowerCase().includes(q));
  }, [activeThread, isChatSearchOpen, chatSearchQuery]);

  // Close info dropdown on outside click / Esc
  React.useEffect(() => {
    function onDocMouseDown(e) {
      if (!isInfoOpen) return;
      if (infoMenuRef.current && !infoMenuRef.current.contains(e.target)) {
        setIsInfoOpen(false);
      }
    }
    function onKeyDown(e) {
      if (e.key === "Escape") setIsInfoOpen(false);
    }

    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isInfoOpen]);

  function sendMessage() {
    const text = draft.trim();
    if (!text) return;

    setThreadsData((prev) =>
      prev.map((t) => {
        if (t.id !== activeId) return t;

        const nextMessages = [...t.messages, { id: uid("m"), from: "me", text }];
        return {
          ...t,
          messages: nextMessages,
          last: text,
        };
      })
    );

    setDraft("");
  }

  function openCompose() {
    setLeftTab("Messages");
    setRightMode("compose");
    setIsChatSearchOpen(false);
    setChatSearchQuery("");
    setIsInfoOpen(false);
    setUserQuery("");
    setComposeDraft("");
  }

  function startChatWithUser(user) {
    const existing = threadsData.find((t) => t.name === user.name);
    if (existing) {
      setActiveId(existing.id);
      setRightMode("chat");
      return;
    }

    const newThread = {
      id: uid("t"),
      name: user.name,
      last: "Start a conversation…",
      status: user.status || "offline",
      avatar: user.avatar || "",
      messages: composeDraft.trim()
        ? [{ id: uid("m"), from: "me", text: composeDraft.trim() }]
        : [],
    };

    setThreadsData((prev) => [newThread, ...prev]);
    setActiveId(newThread.id);
    setRightMode("chat");
    setComposeDraft("");
  }

  function openFiles() {
    setLeftTab("Files");
    setRightMode("files");
    setIsChatSearchOpen(false);
    setChatSearchQuery("");
    setIsInfoOpen(false);
  }

  function openSettingsPanel() {
    setRightMode("settings");
    setIsChatSearchOpen(false);
    setChatSearchQuery("");
    setIsInfoOpen(false);
  }

  function openChat() {
    setLeftTab("Messages");
    setRightMode("chat");
  }

  function handleLeftTabClick(tab) {
    setLeftTab(tab);

    if (tab === "Files") {
      openFiles();
      return;
    }

    setRightMode("chat");
  }

  function toggleChatSearch() {
    setIsChatSearchOpen((v) => {
      const next = !v;
      if (!next) setChatSearchQuery("");
      return next;
    });
    setIsInfoOpen(false);
  }

  function toggleInfoDropdown() {
    setIsInfoOpen((v) => !v);
    setIsChatSearchOpen(false);
    setChatSearchQuery("");
  }

  function renderMiddleColumn() {
    if (leftTab === "Files") {
      return (
        <section className="in-col in-col--middle" aria-label="Files list">
          <div className="in-midTop">
            <input
              className="in-search"
              placeholder="Search files..."
              value={fileQuery}
              onChange={(e) => setFileQuery(e.target.value)}
              aria-label="Search files"
            />
          </div>

          <div className="in-threadList" role="list" aria-label="Files">
            {filteredFiles.map((f) => (
              <button
                key={f.id}
                type="button"
                className={f.id === activeFileId ? "in-thread in-thread--active" : "in-thread"}
                onClick={() => setActiveFileId(f.id)}
                role="listitem"
                aria-label={`Open file ${f.name}`}
              >
                <div className="in-threadText">
                  <div className="in-threadNameRow">
                    <div className="in-threadName">{f.name}</div>
                    <div className="in-threadMeta">{f.when}</div>
                  </div>
                  <div className="in-threadLast">
                    {f.meta} • {f.where}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      );
    }

    return (
      <section className="in-col in-col--middle" aria-label="Conversation list">
        <div className="in-midTop">
          <input
            className="in-search"
            placeholder="Search conversations..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search conversations"
          />
        </div>

        <div className="in-threadList" role="list" aria-label="Threads">
          {filteredThreads.map((t) => (
            <button
              key={t.id}
              type="button"
              className={t.id === activeId ? "in-thread in-thread--active" : "in-thread"}
              onClick={() => {
                setActiveId(t.id);
                setRightMode("chat");
                setIsChatSearchOpen(false);
                setChatSearchQuery("");
                setIsInfoOpen(false);
              }}
              role="listitem"
              aria-label={`Open chat with ${t.name}`}
            >
              <Avatar name={t.name} avatar={t.avatar} status={t.status} size="sm" />

              <div className="in-threadText">
                <div className="in-threadNameRow">
                  <div className="in-threadName">{t.name}</div>
                  <div className="in-threadMeta">{t.status}</div>
                </div>
                <div className="in-threadLast">{t.last}</div>
              </div>
            </button>
          ))}
        </div>
      </section>
    );
  }

  function renderRightColumn() {
    if (rightMode === "files") {
      return (
        <section className="in-col in-col--right" aria-label="Files browser">
          <div className="in-chatHeader">
            <div className="in-chatHeaderLeft">
              <div className="in-chatTitleWrap">
                <div className="in-chatTitle">Files</div>
                <div className="in-chatSub">Browse shared & saved attachments</div>
              </div>
            </div>

            <div className="in-chatHeaderActions" aria-label="Files actions">
              <button
                type="button"
                className="in-chatIconBtn"
                aria-label="Back to messages"
                title="Back"
                onClick={openChat}
              >
                ←
              </button>
            </div>
          </div>

          <div className="in-chatBody" aria-label="File details">
            <div className="in-bubbleRow">
              <div className="in-bubble" style={{ maxWidth: "100%" }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{activeFile.name}</div>
                <div style={{ opacity: 0.8, marginBottom: 10 }}>
                  {activeFile.meta} • {activeFile.where} • {activeFile.when}
                </div>

                <div style={{ opacity: 0.85 }}>
                  Front-end preview stub: this is where a PDF/image/text preview would appear.
                </div>

                <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" className="in-sendBtn" onClick={() => {}}>
                    Download
                  </button>
                  <button type="button" className="in-sendBtn" onClick={() => {}}>
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="in-chatComposer" aria-label="Files footer">
            <input
              className="in-composeInput"
              value={fileQuery}
              onChange={(e) => setFileQuery(e.target.value)}
              placeholder="Search files..."
              aria-label="Search files"
            />
            <button type="button" className="in-sendBtn" onClick={() => {}}>
              Upload
            </button>
          </div>
        </section>
      );
    }

    if (rightMode === "settings") {
      return (
        <section className="in-col in-col--right" aria-label="Inbox settings panel">
          <div className="in-chatHeader">
            <div className="in-chatHeaderLeft">
              <div className="in-chatTitleWrap">
                <div className="in-chatTitle">Inbox Settings</div>
                <div className="in-chatSub">Front-end settings window</div>
              </div>
            </div>

            <div className="in-chatHeaderActions" aria-label="Settings actions">
              <button
                type="button"
                className="in-chatIconBtn"
                aria-label="Back to messages"
                title="Back"
                onClick={openChat}
              >
                ←
              </button>
            </div>
          </div>

          <div className="in-chatBody" aria-label="Settings options">
            <div className="in-bubbleRow">
              <div className="in-bubble" style={{ maxWidth: "100%" }}>
                <div style={{ fontWeight: 700, marginBottom: 10 }}>Preferences</div>

                <div style={{ display: "grid", gap: 10 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input
                      type="checkbox"
                      checked={muted}
                      onChange={(e) => setMuted(e.target.checked)}
                      aria-label="Mute notifications"
                    />
                    <span>Mute notifications</span>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input
                      type="checkbox"
                      checked={readReceipts}
                      onChange={(e) => setReadReceipts(e.target.checked)}
                      aria-label="Read receipts"
                    />
                    <span>Read receipts</span>
                  </label>
                </div>

                <div style={{ marginTop: 14, opacity: 0.85 }}>
                  These are front-end toggles only for now.
                </div>
              </div>
            </div>
          </div>

          <div className="in-chatComposer" aria-label="Settings footer">
            <input className="in-composeInput" value="Settings saved automatically" readOnly aria-label="Status" />
            <button type="button" className="in-sendBtn" onClick={openChat}>
              Done
            </button>
          </div>
        </section>
      );
    }

    if (rightMode === "compose") {
      return (
        <section className="in-col in-col--right" aria-label="New message composer">
          <div className="in-chatHeader">
            <div className="in-chatHeaderLeft">
              <div className="in-chatTitleWrap">
                <div className="in-chatTitle">New Message</div>
                <div className="in-chatSub">Search users to start a chat</div>
              </div>
            </div>

            <div className="in-chatHeaderActions" aria-label="Compose actions">
              <button
                type="button"
                className="in-chatIconBtn"
                aria-label="Back to inbox"
                title="Back"
                onClick={() => setRightMode("chat")}
              >
                ←
              </button>
            </div>
          </div>

          <div className="in-chatBody" aria-label="Compose body">
            <input
              className="in-search"
              placeholder="Search users..."
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              aria-label="Search users"
            />

            <div style={{ height: 10 }} />

            <div aria-label="User results" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filteredUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="in-thread"
                  onClick={() => startChatWithUser(u)}
                  aria-label={`Start chat with ${u.name}`}
                >
                  <Avatar name={u.name} avatar={u.avatar} status={u.status} size="sm" />
                  <div className="in-threadText">
                    <div className="in-threadNameRow">
                      <div className="in-threadName">{u.name}</div>
                      <div className="in-threadMeta">{u.status}</div>
                    </div>
                    <div className="in-threadLast">Click to start a chat</div>
                  </div>
                </button>
              ))}
            </div>

            <div style={{ height: 14 }} />

            <div className="in-bubbleRow">
              <div className="in-bubble" style={{ maxWidth: "100%" }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Message (optional)</div>
                <input
                  className="in-composeInput"
                  value={composeDraft}
                  onChange={(e) => setComposeDraft(e.target.value)}
                  placeholder="Write an intro message..."
                  aria-label="Intro message"
                />
                <div style={{ marginTop: 10, opacity: 0.85 }}>
                  Pick a user above to create the thread. (Front-end only.)
                </div>
              </div>
            </div>
          </div>

          <div className="in-chatComposer" aria-label="Compose footer">
            <input className="in-composeInput" value="Select a user to begin" readOnly aria-label="Hint" />
            <button type="button" className="in-sendBtn" onClick={() => setRightMode("chat")}>
              Cancel
            </button>
          </div>
        </section>
      );
    }

    // CHAT MODE
    return (
      <section className="in-col in-col--right" aria-label="Conversation">
        <div className="in-chatHeader">
          <div className="in-chatHeaderLeft">
            <Avatar name={activeThread.name} avatar={activeThread.avatar} status={activeThread.status} size="sm" />
            <div className="in-chatTitleWrap">
              <div className="in-chatTitle">{activeThread.name}</div>
              <div className="in-chatSub">
                {activeThread.status === "online" ? "Active now" : activeThread.status}
              </div>
            </div>
          </div>

          {/* Wrap actions in a positioned container so dropdown can anchor without CSS changes */}
          <div
            className="in-chatHeaderActions"
            aria-label="Chat actions"
            style={{ position: "relative" }}
            ref={infoMenuRef}
          >
            <button
              type="button"
              className="in-chatIconBtn"
              aria-label="Search in chat"
              title="Search"
              onClick={toggleChatSearch}
            >
              🔎
            </button>

            <button
              type="button"
              className="in-chatIconBtn"
              aria-label="Info"
              title="Info"
              onClick={toggleInfoDropdown}
              aria-haspopup="menu"
              aria-expanded={isInfoOpen ? "true" : "false"}
            >
              ⓘ
            </button>

            {isInfoOpen ? (
              <div
                role="menu"
                aria-label="Chat info menu"
                style={{
                  position: "absolute",
                  top: "44px",
                  right: 0,
                  minWidth: 220,
                  background: "#fff",
                  border: "1px solid rgba(0,0,0,0.12)",
                  borderRadius: 10,
                  boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
                  padding: 10,
                  zIndex: 50,
                }}
              >
                <div style={{ padding: "6px 8px", marginBottom: 6, opacity: 0.85, fontWeight: 700 }}>
                  {activeThread.name}
                </div>
                <div style={{ padding: "0 8px 8px", opacity: 0.75, fontSize: 13 }}>
                  Status: {activeThread.status}
                </div>

                <div style={{ height: 1, background: "rgba(0,0,0,0.10)", margin: "8px 0" }} />

                <button
                  type="button"
                  role="menuitem"
                  className="in-thread"
                  style={{ width: "100%" }}
                  onClick={() => {
                    setIsInfoOpen(false);
                  }}
                >
                  View Profile
                </button>

                <button
                  type="button"
                  role="menuitem"
                  className="in-thread"
                  style={{ width: "100%" }}
                  onClick={() => {
                    setMuted(true);
                    setIsInfoOpen(false);
                  }}
                >
                  Mute
                </button>

                <button
                  type="button"
                  role="menuitem"
                  className="in-thread"
                  style={{ width: "100%" }}
                  onClick={() => {
                    setIsInfoOpen(false);
                  }}
                >
                  Block
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="in-chatBody" aria-label="Messages">
          {isChatSearchOpen ? (
            <div className="in-bubbleRow" style={{ marginBottom: 6 }}>
              <div className="in-bubble" style={{ maxWidth: "100%" }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Search in chat</div>
                <input
                  className="in-search"
                  placeholder="Type to filter messages..."
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                  aria-label="Search messages"
                />
                <div style={{ marginTop: 8, opacity: 0.8 }}>
                  Showing {visibleMessages.length} message{visibleMessages.length === 1 ? "" : "s"}.
                </div>
              </div>
            </div>
          ) : null}

          {visibleMessages.length === 0 ? (
            <div className="in-bubbleRow">
              <div className="in-bubble" style={{ maxWidth: "100%" }}>
                No messages match your search.
              </div>
            </div>
          ) : (
            visibleMessages.map((m) => (
              <div
                key={m.id}
                className={m.from === "me" ? "in-bubbleRow in-bubbleRow--me" : "in-bubbleRow"}
              >
                <div className={m.from === "me" ? "in-bubble in-bubble--me" : "in-bubble"}>{m.text}</div>
              </div>
            ))
          )}
        </div>

        <div className="in-chatComposer" aria-label="Message composer">
          <input
            className="in-composeInput"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a message..."
            aria-label="Type a message"
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
          />
          <button type="button" className="in-sendBtn" onClick={sendMessage} aria-label="Send">
            Send
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="in-page">
      <div className="in-shell" aria-label="Inbox layout">
        {/* LEFT COLUMN */}
        <aside className="in-col in-col--left" aria-label="Inbox sidebar">
          <div className="in-leftHeader">
            <div className="in-me">
              <img className="in-meImg" src={yourAvatar} alt="" aria-hidden="true" />
              <div className="in-meMeta">
                <div className="in-meName">john.doe</div>
                <div className="in-meSub">Inbox</div>
              </div>
            </div>

            <button
              type="button"
              className="in-composeBtn"
              onClick={openCompose}
              aria-label="Compose new message"
              title="Compose"
            >
              + New Message
            </button>
          </div>

          <div className="in-leftNav" role="tablist" aria-label="Inbox tabs">
            {["Messages", "Files"].map((t) => (
              <button
                key={t}
                type="button"
                className={leftTab === t ? "in-leftNavItem in-leftNavItem--active" : "in-leftNavItem"}
                onClick={() => handleLeftTabClick(t)}
                role="tab"
                aria-selected={leftTab === t ? "true" : "false"}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="in-leftFooter" aria-label="Inbox footer">
            <button
              type="button"
              className="in-leftLink"
              aria-label="Settings"
              onClick={openSettingsPanel}
            >
              Settings
            </button>
            <button
              type="button"
              className="in-leftLink"
              aria-label="Help"
              onClick={() => {
                setRightMode("settings");
              }}
            >
              Help
            </button>
          </div>
        </aside>

        {/* MIDDLE COLUMN */}
        {renderMiddleColumn()}

        {/* RIGHT COLUMN */}
        {renderRightColumn()}
      </div>
    </div>
  );
}




