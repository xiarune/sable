import React from "react";
import "./Notifications.css";

const MOCK_NOTIFS = [
  // Today
  {
    id: "n1",
    day: "Today",
    unread: true,
    type: "comment",
    user: "Username",
    time: "3 hours ago",
    title: "commented on your page",
    body: "Lorem ipsum dolor sit....",
  },
  {
    id: "n2",
    day: "Today",
    unread: true,
    type: "follow",
    user: "Username",
    time: "5 hours ago",
    title: "followed you",
    body: "",
  },
  {
    id: "n3",
    day: "Today",
    unread: false,
    type: "system",
    user: "System",
    time: "6 hours ago",
    title: "Maintenance window scheduled",
    body: "Tonight from 12:00–1:00 AM.",
  },
  {
    id: "n4",
    day: "Today",
    unread: true,
    type: "mention",
    user: "Username",
    time: "8 hours ago",
    title: "mentioned you in a thread",
    body: "“I think this fits the tone perfectly.”",
  },

  // Yesterday
  {
    id: "n5",
    day: "Yesterday",
    unread: false,
    type: "donation",
    user: "Username",
    time: "1 day ago",
    title: "donated $15",
    body: "",
  },
  {
    id: "n6",
    day: "Yesterday",
    unread: true,
    type: "comment",
    user: "Username",
    time: "1 day ago",
    title: "left feedback on your draft",
    body: "Lorem ipsum dolor sit....",
  },
  {
    id: "n7",
    day: "Yesterday",
    unread: false,
    type: "follow",
    user: "Username",
    time: "2 days ago",
    title: "followed you",
    body: "",
  },
];

function TypeIcon({ type }) {
  const map = {
    comment: "💬",
    follow: "➕",
    donation: "💠",
    mention: "@",
    system: "⚙︎",
  };
  return (
    <span className={`no-typeIcon no-typeIcon--${type}`} aria-hidden="true">
      {map[type] || "•"}
    </span>
  );
}

function TypeChip({ type }) {
  const labelMap = {
    comment: "Comment",
    follow: "Follow",
    donation: "Donation",
    mention: "Mention",
    system: "System",
  };

  return <span className={`no-chip no-chip--${type}`}>{labelMap[type] || "Notification"}</span>;
}

function AvatarCircle({ user }) {
  const letter = (user || "U").trim()[0]?.toUpperCase() || "U";
  return <div className="no-avatar" aria-hidden="true">{letter}</div>;
}

export default function Notifications() {
  const [silentMode, setSilentMode] = React.useState(false);
  const [tab, setTab] = React.useState("All"); // All | Unread | Mentions | System
  const [query, setQuery] = React.useState("");

  const unreadCount = React.useMemo(() => MOCK_NOTIFS.filter((n) => n.unread).length, []);

  const filtered = React.useMemo(() => {
    let list = MOCK_NOTIFS;

    if (tab === "Unread") list = list.filter((n) => n.unread);
    if (tab === "Mentions") list = list.filter((n) => n.type === "mention");
    if (tab === "System") list = list.filter((n) => n.type === "system");

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((n) => {
        const hay = `${n.user} ${n.title} ${n.body || ""}`.toLowerCase();
        return hay.includes(q);
      });
    }

    return list;
  }, [tab, query]);

  const grouped = React.useMemo(() => {
    const byDay = new Map();
    for (const n of filtered) {
      if (!byDay.has(n.day)) byDay.set(n.day, []);
      byDay.get(n.day).push(n);
    }
    return Array.from(byDay.entries());
  }, [filtered]);

  return (
    <div className="no-page">
      <div className="no-shell" aria-label="Notifications layout">
        <header className="no-topbar" aria-label="Notifications header">
          <div className="no-titleWrap">
            <h1 className="no-title">Notifications</h1>
            {unreadCount > 0 ? (
              <div className="no-sub">{unreadCount} unread</div>
            ) : (
              <div className="no-sub">You’re all caught up.</div>
            )}
          </div>

          <div className="no-topActions">
            <div className="no-silent">
              <span className="no-silentLabel">Silent</span>
              <button
                type="button"
                className={silentMode ? "no-toggle no-toggle--on" : "no-toggle"}
                onClick={() => setSilentMode((v) => !v)}
                aria-label="Toggle silent mode"
                aria-pressed={silentMode ? "true" : "false"}
              >
                <span className="no-toggleKnob" aria-hidden="true" />
              </button>
            </div>

            <button
              type="button"
              className="no-cta"
              onClick={() => {
                // front-end only for now
              }}
            >
              Mark all read
            </button>
          </div>
        </header>

        <section className="no-card" aria-label="Notifications list">
          <div className="no-toolbar">
            <div className="no-tabs" role="tablist" aria-label="Notification tabs">
              {["All", "Unread", "Mentions", "System"].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={tab === t ? "no-tab no-tab--active" : "no-tab"}
                  onClick={() => setTab(t)}
                  role="tab"
                  aria-selected={tab === t ? "true" : "false"}
                >
                  {t}
                  {t === "Unread" && unreadCount > 0 ? (
                    <span className="no-pillCount" aria-label={`${unreadCount} unread`}>
                      {unreadCount}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            <div className="no-searchWrap">
              <input
                className="no-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search notifications..."
                aria-label="Search notifications"
              />
              {query ? (
                <button
                  type="button"
                  className="no-clearSearch"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  title="Clear"
                >
                  ×
                </button>
              ) : null}
            </div>
          </div>

          <div className="no-list" aria-label="Notifications">
            {grouped.length === 0 ? (
              <div className="no-empty">
                <div className="no-emptyTitle">Nothing here.</div>
                <div className="no-emptySub">Try switching tabs or clearing your search.</div>
              </div>
            ) : (
              grouped.map(([day, items]) => (
                <div key={day} className="no-group">
                  <div className="no-dayRow">
                    <div className="no-day">{day}</div>
                    <div className="no-dayLine" aria-hidden="true" />
                  </div>

                  <div className="no-items">
                    {items.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        className={n.unread ? "no-item no-item--unread" : "no-item"}
                        aria-label={`${n.user} ${n.title}`}
                        onClick={() => {
                          // front-end only: later open source context
                        }}
                      >
                        <div className="no-left">
                          <AvatarCircle user={n.user} />
                        </div>

                        <div className="no-main">
                          <div className="no-topRow">
                            <div className="no-userRow">
                              <TypeIcon type={n.type} />
                              <span className="no-user">{n.user}</span>
                              <span className="no-time">{n.time}</span>
                            </div>

                            <div className="no-rightRow">
                              <TypeChip type={n.type} />
                              {n.unread ? <span className="no-unreadDot" aria-hidden="true" /> : null}
                            </div>
                          </div>

                          <div className="no-titleLine">{n.title}</div>
                          {n.body ? <div className="no-body">{n.body}</div> : null}
                        </div>

                        <div className="no-chevron" aria-hidden="true">
                          ›
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

