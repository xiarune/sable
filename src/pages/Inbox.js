import React from "react";
import { useNavigate } from "react-router-dom";
import "./Inbox.css";

import { messagesApi, authApi, uploadsApi } from "../api";
import { SableLoader } from "../components";
import {
  initSocket,
  getSocket,
  joinThread,
  leaveThread,
  startTyping,
  stopTyping,
  onTyping,
  onNewMessage,
  onMessageSeen,
  onMessageReaction,
} from "../api/socket";

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

// Format relative time for presence
function formatPresenceTime(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Get presence display text
function getPresenceText(presence) {
  if (!presence) return "";
  const { status, lastSeenAt, lastActiveAt } = presence;

  if (status === "online") return "Active now";
  if (status === "away") {
    const time = formatPresenceTime(lastActiveAt);
    return `Away ${time ? `• ${time}` : ""}`;
  }
  // offline
  const time = formatPresenceTime(lastSeenAt);
  return time ? `Last seen ${time}` : "Offline";
}

function StatusDot({ status }) {
  return <span className={`in-statusDot in-statusDot--${status || "offline"}`} aria-label={status || "offline"} />;
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

      {status && (
        <div className="in-statusWrap" aria-hidden="true">
          <StatusDot status={status} />
        </div>
      )}
    </div>
  );
}

// Reaction picker component with emoji categories
function ReactionPicker({ onSelect, onClose }) {
  const [activeTab, setActiveTab] = React.useState("quick");

  const quickEmojis = ["❤️", "🔥", "👏", "😂", "😮", "😢"];
  const emojiCategories = {
    faces: ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😍", "🥰", "😘", "😋", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "😈", "👿", "💀", "☠️", "💩", "🤡", "👹", "👺", "👻", "👽", "👾", "🤖"],
    gestures: ["👍", "👎", "👊", "✊", "🤛", "🤜", "🤞", "✌️", "🤟", "🤘", "👌", "🤌", "🤏", "👈", "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐️", "🖖", "👋", "🤙", "💪", "🙏", "🤝", "👏", "🙌", "👐", "🤲", "🫶"],
    hearts: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "♥️"],
    symbols: ["⭐", "🌟", "✨", "💫", "🔥", "💥", "💢", "💦", "💨", "🎉", "🎊", "✅", "❌", "❓", "❗", "💯", "🆗", "🆒", "🆕", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣"],
  };

  return (
    <div className="in-reactionPicker" role="menu" onClick={(e) => e.stopPropagation()}>
      <div className="in-emojiTabs">
        <button
          type="button"
          className={`in-emojiTab ${activeTab === "quick" ? "in-emojiTab--active" : ""}`}
          onClick={() => setActiveTab("quick")}
        >
          ⚡
        </button>
        <button
          type="button"
          className={`in-emojiTab ${activeTab === "faces" ? "in-emojiTab--active" : ""}`}
          onClick={() => setActiveTab("faces")}
        >
          😀
        </button>
        <button
          type="button"
          className={`in-emojiTab ${activeTab === "gestures" ? "in-emojiTab--active" : ""}`}
          onClick={() => setActiveTab("gestures")}
        >
          👍
        </button>
        <button
          type="button"
          className={`in-emojiTab ${activeTab === "hearts" ? "in-emojiTab--active" : ""}`}
          onClick={() => setActiveTab("hearts")}
        >
          ❤️
        </button>
        <button
          type="button"
          className={`in-emojiTab ${activeTab === "symbols" ? "in-emojiTab--active" : ""}`}
          onClick={() => setActiveTab("symbols")}
        >
          ⭐
        </button>
        <button
          type="button"
          className="in-emojiTab in-emojiTab--close"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      <div className="in-emojiGrid">
        {(activeTab === "quick" ? quickEmojis : emojiCategories[activeTab] || []).map((emoji) => (
          <button
            key={emoji}
            type="button"
            className="in-reactionBtn"
            onClick={() => {
              onSelect(emoji);
              onClose();
            }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

// Message bubble with reaction indicator on corner (like presence dots)
function MessageBubble({ message, isMe, currentUserId, onAddReaction, onRemoveReaction }) {
  const [showReactionPicker, setShowReactionPicker] = React.useState(false);

  const reactions = message.reactions || [];

  // Get the primary reaction to display (most recent or user's own)
  const myReaction = reactions.find((r) => r.userId === currentUserId);
  const primaryReaction = myReaction || reactions[reactions.length - 1];
  const hasReaction = reactions.length > 0;

  // Handle clicking the reaction indicator
  function handleReactionClick() {
    if (myReaction) {
      // Remove my reaction
      onRemoveReaction(message._id, myReaction.emoji);
    } else {
      // Open picker to add reaction
      setShowReactionPicker(true);
    }
  }

  return (
    <div className={`in-bubbleRow ${isMe ? "in-bubbleRow--me" : ""}`}>
      <div className={`in-bubbleWrap ${isMe ? "in-bubbleWrap--me" : ""}`}>
        <div
          className={isMe ? "in-bubble in-bubble--me" : "in-bubble"}
          onDoubleClick={() => setShowReactionPicker(true)}
        >
          {message.text}

          {message.attachmentUrl && (
            <div className="in-attachment">
              <a href={message.attachmentUrl} target="_blank" rel="noopener noreferrer">
                {message.attachmentName || "Attachment"}
              </a>
            </div>
          )}
        </div>

        {/* Reaction indicator on corner (like presence status dot) */}
        <button
          type="button"
          className={`in-reactionIndicator ${hasReaction ? "in-reactionIndicator--active" : ""} ${myReaction ? "in-reactionIndicator--mine" : ""}`}
          onClick={handleReactionClick}
          onContextMenu={(e) => {
            e.preventDefault();
            setShowReactionPicker(true);
          }}
          title={hasReaction ? `${reactions.length} reaction${reactions.length > 1 ? "s" : ""} - ${reactions.map(r => r.username).join(", ")}` : "Add reaction"}
        >
          {hasReaction ? (
            <>
              <span className="in-reactionEmoji">{primaryReaction.emoji}</span>
              {reactions.length > 1 && <span className="in-reactionBadge">{reactions.length}</span>}
            </>
          ) : (
            <span className="in-reactionPlus">+</span>
          )}
        </button>

        {showReactionPicker && (
          <ReactionPicker
            onSelect={(emoji) => {
              // If user already has a reaction, remove it first
              if (myReaction) {
                onRemoveReaction(message._id, myReaction.emoji);
              }
              onAddReaction(message._id, emoji);
            }}
            onClose={() => setShowReactionPicker(false)}
          />
        )}
      </div>
    </div>
  );
}

export default function Inbox() {
  const navigate = useNavigate();

  // Current user
  const [currentUser, setCurrentUser] = React.useState(null);

  // Left tabs
  const [leftTab, setLeftTab] = React.useState("Messages"); // Messages | Requests | Files

  // Right area modes
  const [rightMode, setRightMode] = React.useState("chat"); // chat | compose | files | settings

  // Threads state
  const [threads, setThreads] = React.useState([]);
  const [requests, setRequests] = React.useState([]);
  const [activeThreadId, setActiveThreadId] = React.useState(null);
  const [activeThread, setActiveThread] = React.useState(null);
  const [messages, setMessages] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  // Middle column search
  const [query, setQuery] = React.useState("");

  // Composer (sending messages)
  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);

  // Compose-new-message UX
  const [userQuery, setUserQuery] = React.useState("");
  const [searchUsers, setSearchUsers] = React.useState([]);
  const [mutuals, setMutuals] = React.useState([]);
  const [composeDraft, setComposeDraft] = React.useState("");

  // Chat search (header search)
  const [isChatSearchOpen, setIsChatSearchOpen] = React.useState(false);
  const [chatSearchQuery, setChatSearchQuery] = React.useState("");

  // Info dropdown
  const [isInfoOpen, setIsInfoOpen] = React.useState(false);
  const infoMenuRef = React.useRef(null);

  // Files
  const [files, setFiles] = React.useState([]);
  const [fileQuery, setFileQuery] = React.useState("");
  const [activeFileId, setActiveFileId] = React.useState(null);

  // Settings
  const [settings, setSettings] = React.useState({ readReceipts: true, showSeenIndicators: true });

  // Typing indicator
  const [typingUsers, setTypingUsers] = React.useState({});
  const typingTimeoutRef = React.useRef(null);

  // Seen indicator
  const [seenInfo, setSeenInfo] = React.useState({});

  // File upload
  const fileInputRef = React.useRef(null);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [deleteInProgress, setDeleteInProgress] = React.useState(false);

  // Load initial data
  React.useEffect(() => {
    async function loadData() {
      try {
        const [meData, threadsData, requestsData, settingsData, mutualsData] = await Promise.all([
          authApi.me(),
          messagesApi.getThreads(),
          messagesApi.getRequests(),
          messagesApi.getSettings(),
          messagesApi.getMutuals(),
        ]);

        setCurrentUser(meData.user);
        setThreads(threadsData.threads || []);
        setRequests(requestsData.requests || []);
        setSettings(settingsData.settings || { readReceipts: true, showSeenIndicators: true });
        setMutuals(mutualsData.mutuals || []);

        if (threadsData.threads?.length > 0) {
          setActiveThreadId(threadsData.threads[0]._id);
        }
      } catch (err) {
        console.error("Failed to load inbox data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
    initSocket();

    // Throttled activity ping (max once per 30 seconds)
    let lastActivityPing = 0;
    function sendActivityPing() {
      const now = Date.now();
      if (now - lastActivityPing > 30000) {
        lastActivityPing = now;
        const socket = getSocket();
        if (socket) {
          socket.emit("activity");
        }
      }
    }

    // Send activity ping every 2 minutes
    const activityInterval = setInterval(sendActivityPing, 2 * 60 * 1000);

    // Also send on user interaction (throttled)
    window.addEventListener("mousemove", sendActivityPing, { passive: true });
    window.addEventListener("keydown", sendActivityPing, { passive: true });

    return () => {
      clearInterval(activityInterval);
      window.removeEventListener("mousemove", sendActivityPing);
      window.removeEventListener("keydown", sendActivityPing);
    };
  }, []);

  // Load active thread messages
  React.useEffect(() => {
    async function loadThread() {
      if (!activeThreadId) return;

      try {
        const data = await messagesApi.getThread(activeThreadId);
        setActiveThread(data.thread);
        setMessages(data.messages || []);

        // Mark as seen
        if (settings.readReceipts) {
          messagesApi.markSeen(activeThreadId).catch(() => {});
        }
      } catch (err) {
        console.error("Failed to load thread:", err);
      }
    }

    loadThread();
  }, [activeThreadId, settings.readReceipts]);

  // Join/leave thread rooms for real-time updates
  React.useEffect(() => {
    if (activeThreadId) {
      joinThread(activeThreadId);
    }

    return () => {
      if (activeThreadId) {
        leaveThread(activeThreadId);
      }
    };
  }, [activeThreadId]);

  // Socket event listeners
  React.useEffect(() => {
    const unsubMessage = onNewMessage(({ threadId, message }) => {
      if (threadId === activeThreadId) {
        setMessages((prev) => [...prev, message]);
        // Mark as seen
        if (settings.readReceipts) {
          messagesApi.markSeen(threadId).catch(() => {});
        }
      }
      // Update thread preview
      setThreads((prev) =>
        prev.map((t) =>
          t._id === threadId
            ? { ...t, lastMessage: message.text, lastMessageAt: message.createdAt }
            : t
        )
      );
    });

    const unsubSeen = onMessageSeen(({ threadId, userId, username, seenAt }) => {
      if (threadId === activeThreadId) {
        setSeenInfo((prev) => ({ ...prev, [userId]: { username, seenAt } }));
      }
    });

    const unsubReaction = onMessageReaction(({ messageId, reaction, action }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m._id !== messageId) return m;
          let reactions = m.reactions || [];
          if (action === "add") {
            reactions = [...reactions, reaction];
          } else {
            reactions = reactions.filter(
              (r) => !(r.userId === reaction.userId && r.emoji === reaction.emoji)
            );
          }
          return { ...m, reactions };
        })
      );
    });

    const unsubTyping = onTyping(({ userId, threadId, typing }) => {
      if (threadId === activeThreadId && userId !== currentUser?._id) {
        setTypingUsers((prev) => {
          if (typing) {
            return { ...prev, [userId]: true };
          } else {
            const next = { ...prev };
            delete next[userId];
            return next;
          }
        });
      }
    });

    return () => {
      unsubMessage();
      unsubSeen();
      unsubReaction();
      unsubTyping();
    };
  }, [activeThreadId, currentUser?._id, settings.readReceipts]);

  // Search users for compose
  React.useEffect(() => {
    const timer = setTimeout(async () => {
      if (userQuery.trim()) {
        try {
          const data = await messagesApi.searchUsers(userQuery);
          setSearchUsers(data.users || []);
        } catch (err) {
          console.error("Failed to search users:", err);
        }
      } else {
        setSearchUsers([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [userQuery]);

  // Get other participant from thread
  function getOtherParticipant(thread) {
    if (!thread || !currentUser) return null;
    const details = thread.participantDetails || [];
    return details.find((p) => p && p._id !== currentUser._id) || details[0];
  }

  const otherUser = activeThread ? getOtherParticipant(activeThread) : null;

  const filteredThreads = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => {
      const other = getOtherParticipant(t);
      return (other?.username || "").toLowerCase().includes(q);
    });
  }, [threads, query, currentUser]);

  const filteredFiles = React.useMemo(() => {
    const q = fileQuery.trim().toLowerCase();
    if (!q) return files;
    return files.filter((f) => {
      const hay = `${f.name} ${f.type} ${f.from}`.toLowerCase();
      return hay.includes(q);
    });
  }, [files, fileQuery]);

  const activeFile = React.useMemo(() => {
    return files.find((f) => f.id === activeFileId) || files[0];
  }, [files, activeFileId]);

  const visibleMessages = React.useMemo(() => {
    const q = chatSearchQuery.trim().toLowerCase();
    if (!isChatSearchOpen || !q) return messages;
    return messages.filter((m) => (m.text || "").toLowerCase().includes(q));
  }, [messages, isChatSearchOpen, chatSearchQuery]);

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

  // Handle typing indicators
  function handleDraftChange(e) {
    setDraft(e.target.value);

    if (activeThreadId) {
      startTyping(activeThreadId);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(activeThreadId);
      }, 2000);
    }
  }

  async function sendMessage() {
    const text = draft.trim();
    if (!text || !activeThreadId || sending) return;

    setSending(true);
    stopTyping(activeThreadId);

    try {
      const data = await messagesApi.sendMessage(activeThreadId, { text });
      setMessages((prev) => [...prev, data.message]);
      setDraft("");

      // Update thread preview
      setThreads((prev) =>
        prev.map((t) =>
          t._id === activeThreadId
            ? { ...t, lastMessage: text, lastMessageAt: new Date().toISOString() }
            : t
        )
      );
    } catch (err) {
      console.error("Failed to send message:", err);
      alert("Failed to send message");
    } finally {
      setSending(false);
    }
  }

  async function handleAddReaction(messageId, emoji) {
    try {
      await messagesApi.addReaction(messageId, emoji);
    } catch (err) {
      console.error("Failed to add reaction:", err);
    }
  }

  async function handleRemoveReaction(messageId, emoji) {
    try {
      await messagesApi.removeReaction(messageId, emoji);
    } catch (err) {
      console.error("Failed to remove reaction:", err);
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !activeThreadId) return;

    try {
      const result = await uploadsApi.file(file);
      if (result.url) {
        await messagesApi.sendMessage(activeThreadId, {
          text: `Sent a file: ${file.name}`,
          attachmentUrl: result.url,
          attachmentType: file.type,
          attachmentName: file.name,
        });
      }
    } catch (err) {
      console.error("Failed to upload file:", err);
      alert("Failed to upload file");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function openCompose() {
    setLeftTab("Messages");
    setRightMode("compose");
    setIsChatSearchOpen(false);
    setChatSearchQuery("");
    setIsInfoOpen(false);
    setUserQuery("");
    setComposeDraft("");
    setSearchUsers([]);

    // Refresh mutuals when opening compose
    try {
      const data = await messagesApi.getMutuals();
      setMutuals(data.mutuals || []);
    } catch (err) {
      console.error("Failed to load mutuals:", err);
    }
  }

  async function startChatWithUser(user) {
    try {
      const data = await messagesApi.createThread(user._id);
      const thread = data.thread;

      // Send initial message if provided
      if (composeDraft.trim() && thread._id) {
        await messagesApi.sendMessage(thread._id, { text: composeDraft.trim() });
      }

      // Refresh threads
      const threadsData = await messagesApi.getThreads();
      setThreads(threadsData.threads || []);

      setActiveThreadId(thread._id);
      setRightMode("chat");
      setComposeDraft("");
    } catch (err) {
      console.error("Failed to start chat:", err);
      alert("Failed to start conversation");
    }
  }

  async function acceptRequest(threadId) {
    try {
      await messagesApi.acceptRequest(threadId);
      // Move from requests to threads
      const req = requests.find((r) => r._id === threadId);
      if (req) {
        setRequests((prev) => prev.filter((r) => r._id !== threadId));
        setThreads((prev) => [{ ...req, isRequest: false }, ...prev]);
        setActiveThreadId(threadId);
        setLeftTab("Messages");
        setRightMode("chat");
      }
    } catch (err) {
      console.error("Failed to accept request:", err);
    }
  }

  async function declineRequest(threadId) {
    try {
      await messagesApi.declineRequest(threadId);
      setRequests((prev) => prev.filter((r) => r._id !== threadId));
    } catch (err) {
      console.error("Failed to decline request:", err);
    }
  }

  async function openFiles() {
    setLeftTab("Files");
    setRightMode("files");
    setIsChatSearchOpen(false);
    setChatSearchQuery("");
    setIsInfoOpen(false);

    try {
      const data = await messagesApi.getFiles();
      setFiles(data.files || []);
      if (data.files?.length > 0) {
        setActiveFileId(data.files[0].id);
      }
    } catch (err) {
      console.error("Failed to load files:", err);
    }
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

    if (tab === "Requests") {
      setRightMode("chat");
      return;
    }

    setRightMode("chat");
  }

  async function updateSetting(key, value) {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      await messagesApi.updateSettings(newSettings);
    } catch (err) {
      console.error("Failed to update settings:", err);
    }
  }

  async function muteThread() {
    if (!activeThreadId) return;
    try {
      await messagesApi.mute(activeThreadId);
      setIsInfoOpen(false);
    } catch (err) {
      console.error("Failed to mute:", err);
    }
  }

  function openDeleteModal() {
    setShowDeleteModal(true);
    setIsInfoOpen(false);
  }

  async function confirmDeleteThread() {
    if (!activeThreadId || deleteInProgress) return;

    setDeleteInProgress(true);

    try {
      await messagesApi.deleteThread(activeThreadId);

      // Remove from threads list
      setThreads((prev) => prev.filter((t) => t._id !== activeThreadId));

      // Clear active thread
      setActiveThreadId(null);
      setActiveThread(null);
      setMessages([]);
      setShowDeleteModal(false);
    } catch (err) {
      console.error("Failed to delete chat:", err);
      alert("Failed to delete chat");
    } finally {
      setDeleteInProgress(false);
    }
  }

  function goToUserProfile(username) {
    if (username) {
      navigate(`/communities/${username}`);
    }
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

  function formatTime(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
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
            {filteredFiles.length === 0 ? (
              <div className="in-emptyState">No files shared yet</div>
            ) : (
              filteredFiles.map((f) => (
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
                      <div className="in-threadMeta">{formatTime(f.createdAt)}</div>
                    </div>
                    <div className="in-threadLast">
                      {f.type} • From: {f.from}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>
      );
    }

    if (leftTab === "Requests") {
      return (
        <section className="in-col in-col--middle" aria-label="Message requests">
          <div className="in-midTop">
            <div className="in-requestsHeader">Message Requests ({requests.length})</div>
          </div>

          <div className="in-threadList" role="list" aria-label="Requests">
            {requests.length === 0 ? (
              <div className="in-emptyState">No message requests</div>
            ) : (
              requests.map((t) => {
                const other = getOtherParticipant(t);
                return (
                  <div key={t._id} className="in-requestRow">
                    <Avatar
                      name={other?.username}
                      avatar={other?.avatarUrl}
                      status={other?.presence?.status}
                      size="sm"
                    />
                    <div className="in-requestInfo">
                      <button
                        type="button"
                        className="in-requestName"
                        onClick={() => goToUserProfile(other?.username)}
                      >
                        @{other?.username || "Unknown"}
                      </button>
                      <div className="in-requestPreview">{t.lastMessage || "Sent a message"}</div>
                    </div>
                    <div className="in-requestActions">
                      <button
                        type="button"
                        className="in-acceptBtn"
                        onClick={() => acceptRequest(t._id)}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="in-declineBtn"
                        onClick={() => declineRequest(t._id)}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      );
    }

    // Filter mutuals to exclude those already in threads
    const existingUsernames = threads.map((t) => {
      const other = getOtherParticipant(t);
      return other?.username;
    }).filter(Boolean);
    const suggestedMutuals = mutuals.filter((m) => !existingUsernames.includes(m.username));

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
          {filteredThreads.length === 0 && suggestedMutuals.length === 0 ? (
            <div className="in-emptyState">
              {loading ? "Loading..." : "No conversations yet"}
            </div>
          ) : (
            <>
              {filteredThreads.map((t) => {
                const other = getOtherParticipant(t);
                const unread = t.unreadCounts?.[currentUser?._id] || 0;

                return (
                  <button
                    key={t._id}
                    type="button"
                    className={t._id === activeThreadId ? "in-thread in-thread--active" : "in-thread"}
                    onClick={() => {
                      setActiveThreadId(t._id);
                      setRightMode("chat");
                      setIsChatSearchOpen(false);
                      setChatSearchQuery("");
                      setIsInfoOpen(false);
                    }}
                    role="listitem"
                    aria-label={`Open chat with ${other?.username}`}
                  >
                    <Avatar
                      name={other?.username}
                      avatar={other?.avatarUrl}
                      status={other?.presence?.status}
                      size="sm"
                    />

                    <div className="in-threadText">
                      <div className="in-threadNameRow">
                        <div className="in-threadName">{other?.username || "Unknown"}</div>
                        <div className="in-threadMeta">{formatTime(t.lastMessageAt)}</div>
                      </div>
                    <div className="in-threadLast">
                      {t.lastMessage || "Start a conversation..."}
                    </div>
                  </div>

                  {unread > 0 && <div className="in-unreadBadge">{unread}</div>}
                </button>
                );
              })}

              {/* Suggested mutuals */}
              {suggestedMutuals.length > 0 && !query.trim() && (
                <>
                  <div className="in-suggestionsHeader">Suggested</div>
                  {suggestedMutuals.slice(0, 5).map((u) => (
                    <button
                      key={u._id}
                      type="button"
                      className="in-thread in-thread--suggestion"
                      onClick={() => startChatWithUser(u)}
                      role="listitem"
                      aria-label={`Start chat with ${u.username}`}
                    >
                      <Avatar
                        name={u.username}
                        avatar={u.avatarUrl}
                        status={u.presence?.status}
                        size="sm"
                      />
                      <div className="in-threadText">
                        <div className="in-threadNameRow">
                          <div className="in-threadName">@{u.username}</div>
                          <div className="in-threadMeta">{getPresenceText(u.presence)}</div>
                        </div>
                        <div className="in-threadLast">
                          {u.displayName || "Start a conversation"}
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </>
          )}
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
                <div className="in-chatSub">Browse shared attachments</div>
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
            {activeFile ? (
              <div className="in-bubbleRow">
                <div className="in-bubble" style={{ maxWidth: "100%" }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{activeFile.name}</div>
                  <div style={{ opacity: 0.8, marginBottom: 10 }}>
                    {activeFile.type} • From: {activeFile.from} • {formatTime(activeFile.createdAt)}
                  </div>

                  <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <a
                      href={activeFile.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="in-sendBtn"
                      style={{ textDecoration: "none" }}
                    >
                      Download
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="in-emptyState">Select a file to view details</div>
            )}
          </div>

          <div className="in-chatComposer" aria-label="Files footer">
            <span style={{ opacity: 0.7 }}>{files.length} file{files.length !== 1 ? "s" : ""} shared</span>
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
                <div className="in-chatSub">Privacy and notification preferences</div>
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
                <div style={{ fontWeight: 700, marginBottom: 10 }}>Privacy</div>

                <div style={{ display: "grid", gap: 10 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input
                      type="checkbox"
                      checked={settings.readReceipts}
                      onChange={(e) => updateSetting("readReceipts", e.target.checked)}
                      aria-label="Read receipts"
                    />
                    <span>Send read receipts</span>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input
                      type="checkbox"
                      checked={settings.showSeenIndicators}
                      onChange={(e) => updateSetting("showSeenIndicators", e.target.checked)}
                      aria-label="Show seen indicators"
                    />
                    <span>Show seen indicators</span>
                  </label>
                </div>

                <div style={{ marginTop: 14, opacity: 0.85 }}>
                  Turn off read receipts to prevent others from knowing when you've read their messages.
                </div>
              </div>
            </div>
          </div>

          <div className="in-chatComposer" aria-label="Settings footer">
            <span style={{ opacity: 0.7 }}>Settings saved automatically</span>
            <button type="button" className="in-sendBtn" onClick={openChat}>
              Done
            </button>
          </div>
        </section>
      );
    }

    if (rightMode === "compose") {
      // Show mutuals if no search, otherwise show search results
      const usersToShow = userQuery.trim() ? searchUsers : mutuals;
      const listTitle = userQuery.trim() ? "Search Results" : "Your Mutuals";

      return (
        <section className="in-col in-col--right" aria-label="New message composer">
          <div className="in-chatHeader">
            <div className="in-chatHeaderLeft">
              <div className="in-chatTitleWrap">
                <div className="in-chatTitle">New Message</div>
                <div className="in-chatSub">Start a conversation with someone</div>
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

            {usersToShow.length > 0 && (
              <div className="in-composeListTitle">{listTitle}</div>
            )}

            <div aria-label="User results" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {usersToShow.length === 0 ? (
                <div className="in-emptyState">
                  {userQuery.trim() ? "No users found" : "No mutuals yet. Follow someone who follows you back!"}
                </div>
              ) : (
                usersToShow.map((u) => (
                  <button
                    key={u._id}
                    type="button"
                    className="in-thread"
                    onClick={() => startChatWithUser(u)}
                    aria-label={`Start chat with ${u.username}`}
                  >
                    <Avatar
                      name={u.username}
                      avatar={u.avatarUrl}
                      status={u.presence?.status}
                      size="sm"
                    />
                    <div className="in-threadText">
                      <div className="in-threadNameRow">
                        <div className="in-threadName">@{u.username}</div>
                        <div className="in-threadMeta">{getPresenceText(u.presence)}</div>
                      </div>
                      <div className="in-threadLast">
                        {u.displayName || "Click to start a chat"}
                      </div>
                    </div>
                  </button>
                ))
              )}
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
                  Pick a user above to start the conversation.
                </div>
              </div>
            </div>
          </div>

          <div className="in-chatComposer" aria-label="Compose footer">
            <span style={{ opacity: 0.7 }}>Select a user to begin</span>
            <button type="button" className="in-sendBtn" onClick={() => setRightMode("chat")}>
              Cancel
            </button>
          </div>
        </section>
      );
    }

    // Chat mode
    const typingUserIds = Object.keys(typingUsers);

    // Show welcome state if no thread selected
    if (!activeThreadId || !otherUser) {
      return (
        <section className="in-col in-col--right" aria-label="Welcome">
          <div className="in-welcomeState">
            <div className="in-welcomeIcon">💬</div>
            <div className="in-welcomeTitle">Welcome to your Inbox</div>
            <div className="in-welcomeText">
              Select a conversation from the left or start a new message.
            </div>
            <button type="button" className="in-sendBtn" onClick={openCompose}>
              + New Message
            </button>
          </div>
        </section>
      );
    }

    // Get presence info for other user
    const otherPresence = otherUser?.presence;
    const presenceText = getPresenceText(otherPresence);

    return (
      <section className="in-col in-col--right" aria-label="Conversation">
        <div className="in-chatHeader">
          <div className="in-chatHeaderLeft">
            <Avatar
              name={otherUser?.username}
              avatar={otherUser?.avatarUrl}
              status={otherPresence?.status}
              size="sm"
            />
            <div className="in-chatTitleWrap">
              <button
                type="button"
                className="in-chatTitleLink"
                onClick={() => goToUserProfile(otherUser?.username)}
              >
                @{otherUser?.username}
              </button>
              <div className="in-chatSub">
                {typingUserIds.length > 0 ? "Typing..." : presenceText || otherUser?.displayName || ""}
              </div>
            </div>
          </div>

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

            {isInfoOpen && (
              <div
                role="menu"
                aria-label="Chat info menu"
                className="in-infoDropdown"
              >
                <div style={{ padding: "6px 8px", marginBottom: 6, opacity: 0.85, fontWeight: 700 }}>
                  @{otherUser?.username}
                </div>
                {otherUser?.displayName && (
                  <div style={{ padding: "0 8px 8px", opacity: 0.75, fontSize: 13 }}>
                    {otherUser.displayName}
                  </div>
                )}

                <div style={{ height: 1, background: "rgba(0,0,0,0.10)", margin: "8px 0" }} />

                <button
                  type="button"
                  role="menuitem"
                  className="in-thread"
                  style={{ width: "100%" }}
                  onClick={() => {
                    goToUserProfile(otherUser?.username);
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
                  onClick={muteThread}
                >
                  Mute
                </button>

                <button
                  type="button"
                  role="menuitem"
                  className="in-thread in-thread--danger"
                  style={{ width: "100%" }}
                  onClick={openDeleteModal}
                >
                  Delete Chat
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="in-chatBody" aria-label="Messages">
          {isChatSearchOpen && (
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
          )}

          {visibleMessages.length === 0 ? (
            <div className="in-emptyState">
              {isChatSearchOpen ? "No messages match your search." : "No messages yet. Say hello!"}
            </div>
          ) : (
            visibleMessages.map((m) => (
              <MessageBubble
                key={m._id}
                message={m}
                isMe={m.senderId === currentUser?._id}
                currentUserId={currentUser?._id}
                onAddReaction={handleAddReaction}
                onRemoveReaction={handleRemoveReaction}
              />
            ))
          )}

          {/* Typing indicator */}
          {typingUserIds.length > 0 && (
            <div className="in-typingIndicator">
              <div className="in-typingDots">
                <span className="in-typingDot" />
                <span className="in-typingDot" />
                <span className="in-typingDot" />
              </div>
              <span>{otherUser?.username} is typing...</span>
            </div>
          )}

          {settings.showSeenIndicators && Object.keys(seenInfo).length > 0 && (
            <div className="in-seenIndicator">
              Seen by {Object.values(seenInfo).map((s) => s.username).join(", ")}
            </div>
          )}
        </div>

        <div className="in-chatComposer" aria-label="Message composer">
          <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileUpload} />
          <button
            type="button"
            className="in-attachBtn"
            onClick={() => fileInputRef.current?.click()}
            title="Attach file"
          >
            📎
          </button>
          <input
            className="in-composeInput"
            value={draft}
            onChange={handleDraftChange}
            placeholder="Write a message..."
            aria-label="Type a message"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <button
            type="button"
            className="in-sendBtn"
            onClick={sendMessage}
            disabled={sending || !draft.trim()}
            aria-label="Send"
          >
            {sending ? "..." : "Send"}
          </button>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <div className="in-page">
        <SableLoader />
      </div>
    );
  }

  return (
    <div className="in-page">
      <div className="in-shell" aria-label="Inbox layout">
        {/* left column */}
        <aside className="in-col in-col--left" aria-label="Inbox sidebar">
          <div className="in-leftHeader">
            <div className="in-me">
              {currentUser?.avatarUrl ? (
                <img className="in-meImg" src={currentUser.avatarUrl} alt="" aria-hidden="true" />
              ) : (
                <div className="in-meImgFallback">
                  {(currentUser?.username || "U")[0].toUpperCase()}
                </div>
              )}
              <div className="in-meMeta">
                <div className="in-meName">@{currentUser?.username || "guest"}</div>
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
            {["Messages", "Requests", "Files"].map((t) => (
              <button
                key={t}
                type="button"
                className={leftTab === t ? "in-leftNavItem in-leftNavItem--active" : "in-leftNavItem"}
                onClick={() => handleLeftTabClick(t)}
                role="tab"
                aria-selected={leftTab === t ? "true" : "false"}
              >
                {t}
                {t === "Requests" && requests.length > 0 && (
                  <span className="in-tabBadge">{requests.length}</span>
                )}
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
          </div>
        </aside>

        {/* middle column */}
        {renderMiddleColumn()}

        {/* Right column */}
        {renderRightColumn()}
      </div>

      {/* Delete Chat Modal */}
      {showDeleteModal && (
        <div className="in-modalOverlay" onClick={() => !deleteInProgress && setShowDeleteModal(false)}>
          <div className="in-modal" onClick={(e) => e.stopPropagation()}>
            <div className="in-modalHeader">
              <h3 className="in-modalTitle">Delete Chat</h3>
              <button
                type="button"
                className="in-modalClose"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteInProgress}
              >
                ✕
              </button>
            </div>
            <div className="in-modalBody">
              <p>Are you sure you want to delete this conversation with <strong>@{otherUser?.username}</strong>?</p>
              <p style={{ opacity: 0.7, marginTop: 8 }}>This action cannot be undone. All messages will be permanently deleted.</p>
            </div>
            <div className="in-modalFooter">
              <button
                type="button"
                className="in-modalBtn in-modalBtn--secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteInProgress}
              >
                Cancel
              </button>
              <button
                type="button"
                className="in-modalBtn in-modalBtn--danger"
                onClick={confirmDeleteThread}
                disabled={deleteInProgress}
              >
                {deleteInProgress ? "Deleting..." : "Delete Chat"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
