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
  const [leftTab, setLeftTab] = React.useState("Messages"); // Messages | Files | Group Chats
  const [query, setQuery] = React.useState("");
  const [activeId, setActiveId] = React.useState(MOCK_THREADS[0].id);
  const [draft, setDraft] = React.useState("");

  const threads = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MOCK_THREADS;
    return MOCK_THREADS.filter((t) => (t.name || "").toLowerCase().includes(q));
  }, [query]);

  const active = React.useMemo(() => {
    return MOCK_THREADS.find((t) => t.id === activeId) || MOCK_THREADS[0];
  }, [activeId]);

  function sendMessage() {
    const text = draft.trim();
    if (!text) return;
    // front-end only: just clear draft (no persistence yet)
    setDraft("");
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
              onClick={() => {
                // front-end only
              }}
              aria-label="Compose new message"
              title="Compose"
            >
              + New Message
            </button>
          </div>

          <div className="in-leftNav" role="tablist" aria-label="Inbox tabs">
            {["Messages", "Files", "Group Chats"].map((t) => (
              <button
                key={t}
                type="button"
                className={leftTab === t ? "in-leftNavItem in-leftNavItem--active" : "in-leftNavItem"}
                onClick={() => setLeftTab(t)}
                role="tab"
                aria-selected={leftTab === t ? "true" : "false"}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="in-leftFooter" aria-label="Inbox footer">
            <button type="button" className="in-leftLink" aria-label="Settings">
              Settings
            </button>
            <button type="button" className="in-leftLink" aria-label="Help">
              Help
            </button>
          </div>
        </aside>

        {/* MIDDLE COLUMN */}
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
            {threads.map((t) => (
              <button
                key={t.id}
                type="button"
                className={t.id === activeId ? "in-thread in-thread--active" : "in-thread"}
                onClick={() => setActiveId(t.id)}
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

        {/* RIGHT COLUMN */}
        <section className="in-col in-col--right" aria-label="Conversation">
          <div className="in-chatHeader">
            <div className="in-chatHeaderLeft">
              <Avatar name={active.name} avatar={active.avatar} status={active.status} size="sm" />
              <div className="in-chatTitleWrap">
                <div className="in-chatTitle">{active.name}</div>
                <div className="in-chatSub">{active.status === "online" ? "Active now" : active.status}</div>
              </div>
            </div>

            <div className="in-chatHeaderActions" aria-label="Chat actions">
              <button type="button" className="in-chatIconBtn" aria-label="Search in chat" title="Search">
                🔎
              </button>
              <button type="button" className="in-chatIconBtn" aria-label="Info" title="Info">
                ⓘ
              </button>
            </div>
          </div>

          <div className="in-chatBody" aria-label="Messages">
            {active.messages.map((m) => (
              <div
                key={m.id}
                className={m.from === "me" ? "in-bubbleRow in-bubbleRow--me" : "in-bubbleRow"}
              >
                <div className={m.from === "me" ? "in-bubble in-bubble--me" : "in-bubble"}>{m.text}</div>
              </div>
            ))}
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
      </div>
    </div>
  );
}


