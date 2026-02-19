import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import notificationsApi from "../api/notifications";
import followsApi from "../api/follows";
import { onNotification, onNotificationsRead, initSocket } from "../api/socket";
import "./Notifications.css";

function TypeIcon({ type }) {
  const map = {
    comment: "C",
    follow: "+",
    follow_request: "?",
    donation: "$",
    mention: "@",
    reply: "R",
    like: "L",
    system: "S",
    post: "P",
  };
  return (
    <span className={`no-typeIcon no-typeIcon--${type}`} aria-hidden="true">
      {map[type] || "N"}
    </span>
  );
}

function TypeChip({ type }) {
  const labelMap = {
    comment: "Comment",
    follow: "Follow",
    follow_request: "Request",
    donation: "Donation",
    mention: "Mention",
    reply: "Reply",
    like: "Like",
    system: "System",
    post: "Post",
  };

  return <span className={`no-chip no-chip--${type}`}>{labelMap[type] || "Notification"}</span>;
}

function AvatarCircle({ user, avatarUrl }) {
  const letter = (user || "U").trim()[0]?.toUpperCase() || "U";

  if (avatarUrl) {
    return (
      <div className="no-avatar" aria-hidden="true">
        <img src={avatarUrl} alt="" className="no-avatar-img" />
      </div>
    );
  }

  return <div className="no-avatar" aria-hidden="true">{letter}</div>;
}

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString();
}

function getDayGroup(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const notifDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (notifDate.getTime() === today.getTime()) return "Today";
  if (notifDate.getTime() === yesterday.getTime()) return "Yesterday";

  const daysAgo = Math.floor((today - notifDate) / (1000 * 60 * 60 * 24));
  if (daysAgo < 7) return `${daysAgo} days ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Notifications() {
  const navigate = useNavigate();
  const [silentMode, setSilentMode] = useState(false);
  const [tab, setTab] = useState("All");
  const [query, setQuery] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingRequests, setProcessingRequests] = useState(new Set());

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await notificationsApi.list({ limit: 50 });
      setNotifications(response.notifications || []);
      setUnreadCount(response.unreadCount || 0);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setError("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time notifications via Socket.IO
  useEffect(() => {
    initSocket();

    const unsubNotification = onNotification((newNotif) => {
      // Add to front of list and increment unread count
      setNotifications((prev) => [newNotif, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    const unsubRead = onNotificationsRead((data) => {
      if (data.all) {
        // All marked as read
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      } else if (data.notificationIds) {
        // Specific notifications marked as read
        setNotifications((prev) =>
          prev.map((n) =>
            data.notificationIds.includes(n._id) ? { ...n, read: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - data.count));
      }
    });

    return () => {
      unsubNotification();
      unsubRead();
    };
  }, []);

  // Mark notification as read
  const handleMarkAsRead = useCallback(async (notificationId) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  }, []);

  // Mark all as read
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  }, []);

  // Delete a single notification
  const handleDeleteNotification = useCallback(async (notificationId, e) => {
    e.stopPropagation();
    try {
      await notificationsApi.delete(notificationId);
      setNotifications((prev) => {
        const notif = prev.find((n) => n._id === notificationId);
        if (notif && !notif.read) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return prev.filter((n) => n._id !== notificationId);
      });
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  }, []);

  // Clear all notifications
  const handleClearAll = useCallback(async () => {
    if (!window.confirm("Are you sure you want to clear all notifications?")) return;
    try {
      await notificationsApi.clearAll();
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to clear notifications:", err);
    }
  }, []);

  // Accept follow request
  const handleAcceptRequest = useCallback(async (notification, e) => {
    e.stopPropagation();

    if (!notification.followRequestId) return;

    setProcessingRequests((prev) => new Set(prev).add(notification._id));

    try {
      await followsApi.acceptRequest(notification.followRequestId);
      // Remove the notification from the list or mark it as read
      setNotifications((prev) =>
        prev.filter((n) => n._id !== notification._id)
      );
      setUnreadCount((prev) => (notification.read ? prev : Math.max(0, prev - 1)));
    } catch (err) {
      console.error("Failed to accept follow request:", err);
    } finally {
      setProcessingRequests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(notification._id);
        return newSet;
      });
    }
  }, []);

  // Decline follow request
  const handleDeclineRequest = useCallback(async (notification, e) => {
    e.stopPropagation();

    if (!notification.followRequestId) return;

    setProcessingRequests((prev) => new Set(prev).add(notification._id));

    try {
      await followsApi.declineRequest(notification.followRequestId);
      // Remove the notification from the list
      setNotifications((prev) =>
        prev.filter((n) => n._id !== notification._id)
      );
      setUnreadCount((prev) => (notification.read ? prev : Math.max(0, prev - 1)));
    } catch (err) {
      console.error("Failed to decline follow request:", err);
    } finally {
      setProcessingRequests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(notification._id);
        return newSet;
      });
    }
  }, []);

  // Handle notification click
  const handleNotificationClick = useCallback((notification) => {
    // Mark as read if unread
    if (!notification.read) {
      handleMarkAsRead(notification._id);
    }

    // Navigate based on notification type
    if (notification.workId) {
      navigate(`/work/${notification.workId}`);
    } else if (notification.postId) {
      navigate(`/post/${notification.postId}`);
    } else if (notification.type === "follow_request") {
      // Don't navigate for follow requests - they have action buttons
      return;
    } else if (notification.actorId) {
      const username = notification.actor?.username || notification.actorUsername;
      if (username) {
        navigate(`/user/${username}`);
      }
    }
  }, [handleMarkAsRead, navigate]);

  // Filter notifications based on tab and search
  const filtered = useMemo(() => {
    let list = notifications;

    if (tab === "Unread") list = list.filter((n) => !n.read);
    if (tab === "Mentions") list = list.filter((n) => n.type === "mention");
    if (tab === "System") list = list.filter((n) => n.type === "system");
    if (tab === "Requests") list = list.filter((n) => n.type === "follow_request");
    if (tab === "Posts") list = list.filter((n) => n.type === "post");

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((n) => {
        const actorName = n.actor?.displayName || n.actor?.username || n.actorUsername || "";
        const hay = `${actorName} ${n.title || ""} ${n.body || ""}`.toLowerCase();
        return hay.includes(q);
      });
    }

    return list;
  }, [notifications, tab, query]);

  // Group notifications by day
  const grouped = useMemo(() => {
    const byDay = new Map();
    for (const n of filtered) {
      const day = getDayGroup(n.createdAt);
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day).push(n);
    }
    return Array.from(byDay.entries());
  }, [filtered]);

  // Count follow requests for tab badge
  const requestCount = useMemo(() => {
    return notifications.filter((n) => n.type === "follow_request" && !n.read).length;
  }, [notifications]);

  if (loading) {
    return (
      <div className="no-page">
        <div className="no-shell">
          <div className="no-loading">Loading notifications...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="no-page">
        <div className="no-shell">
          <div className="no-error">{error}</div>
          <button onClick={fetchNotifications} className="no-cta">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="no-page">
      <div className="no-shell" aria-label="Notifications layout">
        <header className="no-topbar" aria-label="Notifications header">
          <div className="no-titleWrap">
            <h1 className="no-title">Notifications</h1>
            {unreadCount > 0 ? (
              <div className="no-sub">{unreadCount} unread</div>
            ) : (
              <div className="no-sub">You're all caught up.</div>
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
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
            >
              Mark all read
            </button>

            <button
              type="button"
              className="no-cta no-cta--danger"
              onClick={handleClearAll}
              disabled={notifications.length === 0}
            >
              Clear all
            </button>
          </div>
        </header>

        <section className="no-card" aria-label="Notifications list">
          <div className="no-toolbar">
            <div className="no-tabs" role="tablist" aria-label="Notification tabs">
              {["All", "Unread", "Requests", "Posts", "Mentions", "System"].map((t) => (
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
                  {t === "Requests" && requestCount > 0 ? (
                    <span className="no-pillCount" aria-label={`${requestCount} requests`}>
                      {requestCount}
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
                  x
                </button>
              ) : null}
            </div>
          </div>

          <div className="no-list" aria-label="Notifications">
            {grouped.length === 0 ? (
              <div className="no-empty">
                <div className="no-emptyTitle">Nothing here.</div>
                <div className="no-emptySub">
                  {tab === "Requests"
                    ? "No pending follow requests."
                    : "Try switching tabs or clearing your search."}
                </div>
              </div>
            ) : (
              grouped.map(([day, items]) => (
                <div key={day} className="no-group">
                  <div className="no-dayRow">
                    <div className="no-day">{day}</div>
                    <div className="no-dayLine" aria-hidden="true" />
                  </div>

                  <div className="no-items">
                    {items.map((n) => {
                      const isProcessing = processingRequests.has(n._id);
                      const actorName = n.actor?.displayName || n.actor?.username || n.actorUsername || "Someone";
                      const actorAvatar = n.actor?.avatarUrl || null;

                      return (
                        <div
                          key={n._id}
                          className={n.read ? "no-item" : "no-item no-item--unread"}
                          onClick={() => handleNotificationClick(n)}
                          role="button"
                          tabIndex={0}
                          aria-label={`${actorName} ${n.title || ""}`}
                        >
                          <div className="no-left">
                            <AvatarCircle user={actorName} avatarUrl={actorAvatar} />
                          </div>

                          <div className="no-main">
                            <div className="no-topRow">
                              <div className="no-userRow">
                                <TypeIcon type={n.type} />
                                <span className="no-user">{actorName}</span>
                                <span className="no-time">{formatTimeAgo(n.createdAt)}</span>
                              </div>

                              <div className="no-rightRow">
                                <TypeChip type={n.type} />
                                {!n.read ? <span className="no-unreadDot" aria-hidden="true" /> : null}
                              </div>
                            </div>

                            <div className="no-titleLine">{n.title}</div>
                            {n.body ? <div className="no-body">{n.body}</div> : null}

                            {n.type === "follow_request" && n.followRequestId && (
                              <div className="no-actions">
                                <button
                                  type="button"
                                  className="no-action no-action--accept"
                                  onClick={(e) => handleAcceptRequest(n, e)}
                                  disabled={isProcessing}
                                >
                                  {isProcessing ? "..." : "Accept"}
                                </button>
                                <button
                                  type="button"
                                  className="no-action no-action--decline"
                                  onClick={(e) => handleDeclineRequest(n, e)}
                                  disabled={isProcessing}
                                >
                                  {isProcessing ? "..." : "Decline"}
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="no-chevron" aria-hidden="true">
                            {n.type !== "follow_request" && ">"}
                          </div>

                          <button
                            type="button"
                            className="no-deleteBtn"
                            onClick={(e) => handleDeleteNotification(n._id, e)}
                            aria-label="Delete notification"
                            title="Delete"
                          >
                            &times;
                          </button>
                        </div>
                      );
                    })}
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
