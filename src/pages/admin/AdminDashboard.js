import React from "react";
import { useNavigate } from "react-router-dom";
import { adminApi } from "../../api";
import "./AdminDashboard.css";

const TABS = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "reports", label: "Reports", icon: "🚨" },
  { id: "users", label: "Users", icon: "👥" },
  { id: "support", label: "Support", icon: "📬" },
  { id: "system", label: "System", icon: "⚙️" },
];

export default function AdminDashboard({ admin: initialAdmin, onLogout }) {
  const navigate = useNavigate();
  const [admin, setAdmin] = React.useState(initialAdmin);
  const [activeTab, setActiveTab] = React.useState("overview");
  const [loading, setLoading] = React.useState(!initialAdmin);

  // Overview data
  const [overview, setOverview] = React.useState(null);

  // Reports data
  const [reports, setReports] = React.useState([]);
  const [reportsLoading, setReportsLoading] = React.useState(false);
  const [reportFilter, setReportFilter] = React.useState("pending");

  // Users data
  const [users, setUsers] = React.useState([]);
  const [usersLoading, setUsersLoading] = React.useState(false);
  const [userSearch, setUserSearch] = React.useState("");

  // Contacts data
  const [contacts, setContacts] = React.useState([]);
  const [contactsLoading, setContactsLoading] = React.useState(false);
  const [contactFilter, setContactFilter] = React.useState("new");

  // System notification
  const [notifTitle, setNotifTitle] = React.useState("");
  const [notifBody, setNotifBody] = React.useState("");
  const [notifSending, setNotifSending] = React.useState(false);

  // Modal state
  const [selectedReport, setSelectedReport] = React.useState(null);
  const [selectedUser, setSelectedUser] = React.useState(null);
  const [selectedContact, setSelectedContact] = React.useState(null);
  const [contactResponse, setContactResponse] = React.useState("");
  const [respondingSending, setRespondingSending] = React.useState(false);

  // Check auth on mount
  React.useEffect(() => {
    async function checkAuth() {
      if (initialAdmin) {
        setAdmin(initialAdmin);
        setLoading(false);
        return;
      }
      try {
        const data = await adminApi.me();
        if (data.admin) {
          setAdmin(data.admin);
        } else {
          navigate("/admin/login");
        }
      } catch {
        navigate("/admin/login");
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [initialAdmin, navigate]);

  // Load overview on mount
  React.useEffect(() => {
    if (admin && activeTab === "overview") {
      loadOverview();
    }
  }, [admin, activeTab]);

  // Load data when tab changes
  React.useEffect(() => {
    if (!admin) return;
    if (activeTab === "reports") loadReports();
    if (activeTab === "users") loadUsers();
    if (activeTab === "support") loadContacts();
  }, [admin, activeTab, reportFilter, contactFilter]);

  async function loadOverview() {
    try {
      const data = await adminApi.getOverview();
      setOverview(data);
    } catch (err) {
      console.error("Failed to load overview:", err);
    }
  }

  async function loadReports() {
    setReportsLoading(true);
    try {
      const data = await adminApi.getReports({ status: reportFilter });
      setReports(data.reports || []);
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setReportsLoading(false);
    }
  }

  async function loadUsers() {
    setUsersLoading(true);
    try {
      const data = await adminApi.getUsers({ search: userSearch });
      setUsers(data.users || []);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setUsersLoading(false);
    }
  }

  async function loadContacts() {
    setContactsLoading(true);
    try {
      const data = await adminApi.getContacts({ status: contactFilter });
      setContacts(data.contacts || []);
    } catch (err) {
      console.error("Failed to load contacts:", err);
    } finally {
      setContactsLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await adminApi.logout();
    } catch {
      // Ignore logout errors
    }
    if (onLogout) onLogout();
    navigate("/admin/login");
  }

  async function handleReportAction(reportId, action) {
    try {
      if (action === "resolve") {
        await adminApi.updateReport(reportId, { status: "resolved" });
      } else if (action === "dismiss") {
        await adminApi.updateReport(reportId, { status: "dismissed" });
      } else if (action === "delete") {
        await adminApi.deleteReportedContent(reportId);
      }
      loadReports();
      setSelectedReport(null);
    } catch (err) {
      alert(err.message || "Action failed");
    }
  }

  async function handleBanUser(userId, ban) {
    const reason = ban ? prompt("Enter ban reason:") : null;
    if (ban && !reason) return;
    try {
      await adminApi.banUser(userId, { ban, reason });
      loadUsers();
      setSelectedUser(null);
    } catch (err) {
      alert(err.message || "Action failed");
    }
  }

  async function handleWarnUser(userId) {
    const reason = prompt("Enter warning reason:");
    if (!reason) return;
    try {
      await adminApi.issueWarning(userId, { reason, severity: "minor" });
      alert("Warning issued");
    } catch (err) {
      alert(err.message || "Action failed");
    }
  }

  async function handleDeleteUser(userId, username) {
    const confirmText = prompt(
      `This will PERMANENTLY delete user @${username} and ALL their data (works, posts, comments, messages, etc.).\n\nThis action CANNOT be undone.\n\nType the username to confirm:`
    );
    if (confirmText !== username) {
      if (confirmText !== null) {
        alert("Username did not match. User was not deleted.");
      }
      return;
    }
    try {
      await adminApi.deleteUser(userId);
      alert(`User @${username} and all their data has been deleted.`);
      loadUsers();
      setSelectedUser(null);
    } catch (err) {
      alert(err.message || "Delete failed");
    }
  }

  async function handleContactAction(contactId, status) {
    try {
      await adminApi.updateContact(contactId, { status });
      loadContacts();
      setSelectedContact(null);
    } catch (err) {
      alert(err.message || "Action failed");
    }
  }

  async function handleDeleteContact(contactId) {
    if (!window.confirm("Are you sure you want to delete this ticket? This cannot be undone.")) {
      return;
    }
    try {
      await adminApi.deleteContact(contactId);
      loadContacts();
      setSelectedContact(null);
    } catch (err) {
      alert(err.message || "Delete failed");
    }
  }

  async function handleRespondToContact(contactId) {
    if (!contactResponse.trim()) {
      alert("Please enter a response message");
      return;
    }
    setRespondingSending(true);
    try {
      await adminApi.respondToContact(contactId, contactResponse.trim());
      alert("Response sent successfully");
      setContactResponse("");
      loadContacts();
      setSelectedContact(null);
    } catch (err) {
      alert(err.message || "Failed to send response");
    } finally {
      setRespondingSending(false);
    }
  }

  async function handleSendNotification() {
    if (!notifTitle.trim() || !notifBody.trim()) {
      alert("Please enter both title and message");
      return;
    }
    setNotifSending(true);
    try {
      await adminApi.sendSystemNotification({
        title: notifTitle.trim(),
        body: notifBody.trim(),
        recipientIds: "all",
      });
      alert("Notification sent to all users");
      setNotifTitle("");
      setNotifBody("");
    } catch (err) {
      alert(err.message || "Failed to send notification");
    } finally {
      setNotifSending(false);
    }
  }

  function handleUserSearch(e) {
    e.preventDefault();
    loadUsers();
  }

  if (loading) {
    return (
      <div className="add add--loading">
        <div className="add-loader">Loading...</div>
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  return (
    <div className="add">
      {/* Sidebar */}
      <aside className="add-sidebar">
        <div className="add-sidebarHeader">
          <h1 className="add-logo">Sable Admin</h1>
          <div className="add-adminInfo">
            <span className="add-adminName">{admin.displayName || admin.username}</span>
            <span className="add-adminRole">{admin.role}</span>
          </div>
        </div>

        <nav className="add-nav">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`add-navItem ${activeTab === tab.id ? "add-navItem--active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="add-navIcon">{tab.icon}</span>
              <span className="add-navLabel">{tab.label}</span>
              {tab.id === "reports" && overview?.moderation?.pendingReports > 0 && (
                <span className="add-navBadge">{overview.moderation.pendingReports}</span>
              )}
              {tab.id === "support" && overview?.moderation?.newContacts > 0 && (
                <span className="add-navBadge">{overview.moderation.newContacts}</span>
              )}
            </button>
          ))}
        </nav>

        <button type="button" className="add-logout" onClick={handleLogout}>
          Sign Out
        </button>
      </aside>

      {/* Main Content */}
      <main className="add-main">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="add-content">
            <h2 className="add-pageTitle">Dashboard Overview</h2>

            {overview ? (
              <div className="add-statsGrid">
                <div className="add-statCard">
                  <div className="add-statValue">{overview.users?.total || 0}</div>
                  <div className="add-statLabel">Total Users</div>
                  <div className="add-statSub">+{overview.users?.newThisWeek || 0} this week</div>
                </div>
                <div className="add-statCard">
                  <div className="add-statValue">{overview.content?.works || 0}</div>
                  <div className="add-statLabel">Published Works</div>
                </div>
                <div className="add-statCard">
                  <div className="add-statValue">{overview.content?.posts || 0}</div>
                  <div className="add-statLabel">Community Posts</div>
                </div>
                <div className="add-statCard">
                  <div className="add-statValue">{overview.users?.activeToday || 0}</div>
                  <div className="add-statLabel">Active Today</div>
                </div>
                <div className="add-statCard add-statCard--alert">
                  <div className="add-statValue">{overview.moderation?.pendingReports || 0}</div>
                  <div className="add-statLabel">Pending Reports</div>
                </div>
                <div className="add-statCard add-statCard--alert">
                  <div className="add-statValue">{overview.moderation?.newContacts || 0}</div>
                  <div className="add-statLabel">New Support Tickets</div>
                </div>
              </div>
            ) : (
              <div className="add-loading">Loading stats...</div>
            )}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === "reports" && (
          <div className="add-content">
            <div className="add-pageHeader">
              <h2 className="add-pageTitle">Content Reports</h2>
              <div className="add-filters">
                {["pending", "reviewed", "resolved", "dismissed"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={`add-filterBtn ${reportFilter === status ? "add-filterBtn--active" : ""}`}
                    onClick={() => setReportFilter(status)}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {reportsLoading ? (
              <div className="add-loading">Loading reports...</div>
            ) : reports.length === 0 ? (
              <div className="add-empty">No {reportFilter} reports</div>
            ) : (
              <div className="add-table">
                <div className="add-tableHeader">
                  <div className="add-tableCell">Type</div>
                  <div className="add-tableCell">Reason</div>
                  <div className="add-tableCell">Reported User</div>
                  <div className="add-tableCell">Reporter</div>
                  <div className="add-tableCell">Date</div>
                  <div className="add-tableCell">Actions</div>
                </div>
                {reports.map((report) => (
                  <div key={report._id} className="add-tableRow">
                    <div className="add-tableCell">
                      <span className="add-badge">{report.targetType}</span>
                    </div>
                    <div className="add-tableCell">{report.reason}</div>
                    <div className="add-tableCell">@{report.targetUserId?.username || "Unknown"}</div>
                    <div className="add-tableCell">@{report.reporterId?.username || "Unknown"}</div>
                    <div className="add-tableCell">{new Date(report.createdAt).toLocaleDateString()}</div>
                    <div className="add-tableCell">
                      <button
                        type="button"
                        className="add-actionBtn"
                        onClick={() => setSelectedReport(report)}
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="add-content">
            <div className="add-pageHeader">
              <h2 className="add-pageTitle">User Management</h2>
              <form className="add-searchForm" onSubmit={handleUserSearch}>
                <input
                  type="text"
                  className="add-searchInput"
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
                <button type="submit" className="add-searchBtn">Search</button>
              </form>
            </div>

            {usersLoading ? (
              <div className="add-loading">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="add-empty">No users found</div>
            ) : (
              <div className="add-table">
                <div className="add-tableHeader">
                  <div className="add-tableCell">User</div>
                  <div className="add-tableCell">Email</div>
                  <div className="add-tableCell">Joined</div>
                  <div className="add-tableCell">Status</div>
                  <div className="add-tableCell">Warnings</div>
                  <div className="add-tableCell">Actions</div>
                </div>
                {users.map((user) => (
                  <div key={user._id} className="add-tableRow">
                    <div className="add-tableCell">
                      <div className="add-userCell">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt="" className="add-userAvatar" />
                        ) : (
                          <div className="add-userAvatar add-userAvatar--placeholder">
                            {(user.username || "U")[0].toUpperCase()}
                          </div>
                        )}
                        <span>@{user.username}</span>
                      </div>
                    </div>
                    <div className="add-tableCell">{user.email}</div>
                    <div className="add-tableCell">{new Date(user.createdAt).toLocaleDateString()}</div>
                    <div className="add-tableCell">
                      {user.isBanned ? (
                        <span className="add-badge add-badge--danger">Banned</span>
                      ) : (
                        <span className="add-badge add-badge--success">Active</span>
                      )}
                    </div>
                    <div className="add-tableCell">{user.warningCount || 0}</div>
                    <div className="add-tableCell">
                      <button
                        type="button"
                        className="add-actionBtn"
                        onClick={() => setSelectedUser(user)}
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Support Tab */}
        {activeTab === "support" && (
          <div className="add-content">
            <div className="add-pageHeader">
              <h2 className="add-pageTitle">Support Tickets</h2>
              <div className="add-filters">
                {["new", "in_progress", "resolved", "closed"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={`add-filterBtn ${contactFilter === status ? "add-filterBtn--active" : ""}`}
                    onClick={() => setContactFilter(status)}
                  >
                    {status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </button>
                ))}
              </div>
            </div>

            {contactsLoading ? (
              <div className="add-loading">Loading tickets...</div>
            ) : contacts.length === 0 ? (
              <div className="add-empty">No {contactFilter.replace("_", " ")} tickets</div>
            ) : (
              <div className="add-table">
                <div className="add-tableHeader">
                  <div className="add-tableCell">Subject</div>
                  <div className="add-tableCell">From</div>
                  <div className="add-tableCell">Email</div>
                  <div className="add-tableCell">Date</div>
                  <div className="add-tableCell">Actions</div>
                </div>
                {contacts.map((contact) => (
                  <div key={contact._id} className="add-tableRow">
                    <div className="add-tableCell">{contact.subject}</div>
                    <div className="add-tableCell">{contact.name}</div>
                    <div className="add-tableCell">{contact.email}</div>
                    <div className="add-tableCell">{new Date(contact.createdAt).toLocaleDateString()}</div>
                    <div className="add-tableCell">
                      <button
                        type="button"
                        className="add-actionBtn"
                        onClick={() => setSelectedContact(contact)}
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* System Tab */}
        {activeTab === "system" && (
          <div className="add-content">
            <h2 className="add-pageTitle">System Management</h2>

            <div className="add-section">
              <h3 className="add-sectionTitle">Send System Notification</h3>
              <p className="add-sectionDesc">Send a notification to all users on the platform.</p>

              <div className="add-formGroup">
                <label className="add-label">Title</label>
                <input
                  type="text"
                  className="add-input"
                  placeholder="Notification title"
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                />
              </div>

              <div className="add-formGroup">
                <label className="add-label">Message</label>
                <textarea
                  className="add-textarea"
                  placeholder="Notification message"
                  rows={4}
                  value={notifBody}
                  onChange={(e) => setNotifBody(e.target.value)}
                />
              </div>

              <button
                type="button"
                className="add-primaryBtn"
                onClick={handleSendNotification}
                disabled={notifSending}
              >
                {notifSending ? "Sending..." : "Send to All Users"}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Report Modal */}
      {selectedReport && (
        <div className="add-modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="add-modal" onClick={(e) => e.stopPropagation()}>
            <div className="add-modalHeader">
              <h3 className="add-modalTitle">Report Details</h3>
              <button type="button" className="add-modalClose" onClick={() => setSelectedReport(null)}>×</button>
            </div>
            <div className="add-modalBody">
              <div className="add-modalField">
                <span className="add-modalLabel">Type:</span>
                <span className="add-badge">{selectedReport.targetType}</span>
              </div>
              <div className="add-modalField">
                <span className="add-modalLabel">Reason:</span>
                <span>{selectedReport.reason}</span>
              </div>
              <div className="add-modalField">
                <span className="add-modalLabel">Reported User:</span>
                <span>@{selectedReport.targetUserId?.username || "Unknown"}</span>
              </div>
              <div className="add-modalField">
                <span className="add-modalLabel">Reporter:</span>
                <span>@{selectedReport.reporterId?.username || "Unknown"}</span>
              </div>
              {selectedReport.description && (
                <div className="add-modalField add-modalField--block">
                  <span className="add-modalLabel">Description:</span>
                  <p className="add-modalText">{selectedReport.description}</p>
                </div>
              )}
            </div>
            <div className="add-modalFooter">
              <button
                type="button"
                className="add-modalBtn add-modalBtn--danger"
                onClick={() => handleReportAction(selectedReport._id, "delete")}
              >
                Delete Content
              </button>
              <button
                type="button"
                className="add-modalBtn"
                onClick={() => handleReportAction(selectedReport._id, "dismiss")}
              >
                Dismiss
              </button>
              <button
                type="button"
                className="add-modalBtn add-modalBtn--primary"
                onClick={() => handleReportAction(selectedReport._id, "resolve")}
              >
                Resolve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Modal */}
      {selectedUser && (
        <div className="add-modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="add-modal" onClick={(e) => e.stopPropagation()}>
            <div className="add-modalHeader">
              <h3 className="add-modalTitle">Manage User</h3>
              <button type="button" className="add-modalClose" onClick={() => setSelectedUser(null)}>×</button>
            </div>
            <div className="add-modalBody">
              <div className="add-modalField">
                <span className="add-modalLabel">Username:</span>
                <span>@{selectedUser.username}</span>
              </div>
              <div className="add-modalField">
                <span className="add-modalLabel">Email:</span>
                <span>{selectedUser.email}</span>
              </div>
              <div className="add-modalField">
                <span className="add-modalLabel">Status:</span>
                {selectedUser.isBanned ? (
                  <span className="add-badge add-badge--danger">Banned</span>
                ) : (
                  <span className="add-badge add-badge--success">Active</span>
                )}
              </div>
              <div className="add-modalField">
                <span className="add-modalLabel">Warnings:</span>
                <span>{selectedUser.warningCount || 0}</span>
              </div>
            </div>
            <div className="add-modalFooter">
              <button
                type="button"
                className="add-modalBtn"
                onClick={() => handleWarnUser(selectedUser._id)}
              >
                Issue Warning
              </button>
              {selectedUser.isBanned ? (
                <button
                  type="button"
                  className="add-modalBtn add-modalBtn--primary"
                  onClick={() => handleBanUser(selectedUser._id, false)}
                >
                  Unban User
                </button>
              ) : (
                <button
                  type="button"
                  className="add-modalBtn add-modalBtn--danger"
                  onClick={() => handleBanUser(selectedUser._id, true)}
                >
                  Ban User
                </button>
              )}
              <button
                type="button"
                className="add-modalBtn add-modalBtn--danger"
                onClick={() => handleDeleteUser(selectedUser._id, selectedUser.username)}
                style={{ marginLeft: "auto" }}
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {selectedContact && (
        <div className="add-modal-overlay" onClick={() => { setSelectedContact(null); setContactResponse(""); }}>
          <div className="add-modal" onClick={(e) => e.stopPropagation()}>
            <div className="add-modalHeader">
              <h3 className="add-modalTitle">Support Ticket</h3>
              <button type="button" className="add-modalClose" onClick={() => { setSelectedContact(null); setContactResponse(""); }}>×</button>
            </div>
            <div className="add-modalBody">
              <div className="add-modalField">
                <span className="add-modalLabel">From:</span>
                <span>{selectedContact.name} ({selectedContact.email})</span>
              </div>
              <div className="add-modalField">
                <span className="add-modalLabel">Subject:</span>
                <span>{selectedContact.subject}</span>
              </div>
              <div className="add-modalField add-modalField--block">
                <span className="add-modalLabel">Message:</span>
                <p className="add-modalText">{selectedContact.message}</p>
              </div>
              {selectedContact.response && (
                <div className="add-modalField add-modalField--block">
                  <span className="add-modalLabel">Previous Response:</span>
                  <p className="add-modalText" style={{ fontStyle: "italic", color: "#666" }}>{selectedContact.response}</p>
                </div>
              )}
              {selectedContact.userId && !selectedContact.response && (
                <div className="add-modalField add-modalField--block">
                  <span className="add-modalLabel">Send Response to User:</span>
                  <textarea
                    className="add-textarea"
                    placeholder="Type your response here. This will be sent as a notification to the user."
                    rows={4}
                    value={contactResponse}
                    onChange={(e) => setContactResponse(e.target.value)}
                    style={{ marginTop: "8px" }}
                  />
                  <button
                    type="button"
                    className="add-primaryBtn"
                    onClick={() => handleRespondToContact(selectedContact._id)}
                    disabled={respondingSending || !contactResponse.trim()}
                    style={{ marginTop: "12px" }}
                  >
                    {respondingSending ? "Sending..." : "Send Response"}
                  </button>
                </div>
              )}
              {!selectedContact.userId && (
                <div className="add-modalField" style={{ marginTop: "12px" }}>
                  <span className="add-modalLabel" style={{ color: "#888", fontStyle: "italic" }}>
                    Note: User was not logged in when submitting. Response cannot be sent via notification - reply via email at {selectedContact.email}.
                  </span>
                </div>
              )}
            </div>
            <div className="add-modalFooter">
              <button
                type="button"
                className="add-modalBtn"
                onClick={() => handleContactAction(selectedContact._id, "in_progress")}
              >
                Mark In Progress
              </button>
              <button
                type="button"
                className="add-modalBtn add-modalBtn--primary"
                onClick={() => handleContactAction(selectedContact._id, "resolved")}
              >
                Mark Resolved
              </button>
              {(selectedContact.status === "resolved" || selectedContact.status === "closed") && (
                <button
                  type="button"
                  className="add-modalBtn add-modalBtn--danger"
                  onClick={() => handleDeleteContact(selectedContact._id)}
                >
                  Delete Ticket
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
