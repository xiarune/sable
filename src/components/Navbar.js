

//         (\_/)
 //    (  =(^Y^)=
 // ____\_(m___m)____Welcome___


import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { authApi } from "../api";
import notificationsApi from "../api/notifications";
import messagesApi from "../api/messages";
import { initSocket, onNotification, onNotificationsRead, onNewMessage } from "../api/socket";
import "./Navbar.css";

// Assets
import sableLogo from "../assets/images/Sable_Logo.png";
import draftNavIcon from "../assets/images/draft_nav.svg";
import inboxNavIcon from "../assets/images/inbox_nav.svg";
import notificationsNavIcon from "../assets/images/notifications_nav.svg";
import searchNavIcon from "../assets/images/search_nav.svg";
import loginGraphic from "../assets/images/login_graphic.png";
import visibleIcon from "../assets/images/Visible.png";
import visibleOffIcon from "../assets/images/Visible_Off.png";

// Helper to check if user needs onboarding
function needsOnboarding(user) {
  return user && !user.interests?.completedOnboarding;
}

export default function Navbar({ isAuthed, username, onLogin, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const path = location.pathname;

  // Show browse bar on browse library index/detail pages
  const showBrowseBar =
    path === "/browse" ||
    path === "/genres" ||
    path.startsWith("/genres/") ||
    path === "/fandoms" ||
    path.startsWith("/fandoms/") ||
    path === "/tags";

  const [query, setQuery] = React.useState("");

  const [isBrowseMenuOpen, setIsBrowseMenuOpen] = React.useState(false);
  const browseMenuRef = React.useRef(null);

  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);
  const [authMode, setAuthMode] = React.useState("login"); // "login" | "signup" | "2fa"

  const [formUsername, setFormUsername] = React.useState("");
  const [formEmail, setFormEmail] = React.useState("");
  const [formPassword, setFormPassword] = React.useState("");
  const [formConfirmPassword, setFormConfirmPassword] = React.useState("");
  const [form2FACode, setForm2FACode] = React.useState("");
  const [pending2FAUserId, setPending2FAUserId] = React.useState(null);
  const [authError, setAuthError] = React.useState("");
  const [authLoading, setAuthLoading] = React.useState(false);

  // Password visibility toggles
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
  const userMenuRef = React.useRef(null);

  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const mobileMenuRef = React.useRef(null);

  // Scroll state for sidebar
  const [isScrolled, setIsScrolled] = React.useState(false);

  // Notification and inbox counts for red dot indicators
  const [notificationCount, setNotificationCount] = React.useState(0);
  const [inboxCount, setInboxCount] = React.useState(0);

  function toggleMobileMenu() {
    setIsMobileMenuOpen((v) => !v);
  }

  function closeMobileMenu() {
    setIsMobileMenuOpen(false);
  }

  function goToSearch(optionalQuery) {
    const q = String(optionalQuery ?? query).trim();
    if (!q) {
      navigate("/search");
      return;
    }
    navigate(`/search?q=${encodeURIComponent(q)}`);
  }

  function handleBrowseSubmit(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    goToSearch(q);
    setIsBrowseMenuOpen(false);
  }

  function openLogin() {
    setAuthMode("login");
    setIsAuthModalOpen(true);
    setAuthError("");
  }

  function closeAuthModal() {
    if (authLoading) return; // Don't close while loading
    setIsAuthModalOpen(false);
    setFormUsername("");
    setFormEmail("");
    setFormPassword("");
    setFormConfirmPassword("");
    setForm2FACode("");
    setPending2FAUserId(null);
    setAuthError("");
    setAuthMode("login");
    setShowPassword(false);
    setShowConfirmPassword(false);
  }

  function resetAuthFieldsForMode(nextMode) {
    if (authLoading) return; // Don't switch modes while loading
    setAuthMode(nextMode);
    setAuthError("");
    setFormEmail("");
    setFormPassword("");
    setFormConfirmPassword("");
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();

    const u = (formUsername || "").trim();
    const em = (formEmail || "").trim();
    const p = formPassword || "";

    if (!u) {
      setAuthError("Please enter a username.");
      return;
    }

    if (authMode === "signup" && !em) {
      setAuthError("Please enter your email address.");
      return;
    }

    if (!p) {
      setAuthError("Please enter a password.");
      return;
    }

    if (authMode === "signup") {
      if (!formConfirmPassword) {
        setAuthError("Please confirm your password.");
        return;
      }
      if (formPassword !== formConfirmPassword) {
        setAuthError("Passwords do not match.");
        return;
      }
    }

    setAuthLoading(true);
    setAuthError("");

    try {
      let data;
      if (authMode === "signup") {
        data = await authApi.register({ username: u, email: em, password: p });
      } else {
        data = await authApi.login({ username: u, password: p });
      }

      // Check if 2FA is required
      if (data.requires2FA) {
        setPending2FAUserId(data.userId);
        setAuthMode("2fa");
        setAuthLoading(false);
        return;
      }

      onLogin(data.user);
      setIsAuthModalOpen(false);
      setFormUsername("");
      setFormEmail("");
      setFormPassword("");
      setFormConfirmPassword("");
      setForm2FACode("");
      setPending2FAUserId(null);
      setAuthError("");

      // Check if user needs onboarding (new signup or existing user without completed onboarding)
      if (needsOnboarding(data.user)) {
        navigate("/onboarding/interests");
      }
    } catch (err) {
      setAuthError(err.message || "Authentication failed. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handle2FASubmit(e) {
    e.preventDefault();

    const code = form2FACode.replace(/\D/g, "");

    if (!code) {
      setAuthError("Please enter your 2FA code.");
      return;
    }

    setAuthLoading(true);
    setAuthError("");

    try {
      const data = await authApi.validate2FA(pending2FAUserId, code);

      onLogin(data.user);
      setIsAuthModalOpen(false);
      setFormUsername("");
      setFormEmail("");
      setFormPassword("");
      setFormConfirmPassword("");
      setForm2FACode("");
      setPending2FAUserId(null);
      setAuthError("");

      // Check if user needs onboarding
      if (needsOnboarding(data.user)) {
        navigate("/onboarding/interests");
      }
    } catch (err) {
      setAuthError(err.message || "Invalid 2FA code. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  }

  function toggleUserMenu() {
    setIsUserMenuOpen((v) => !v);
  }

  function closeUserMenu() {
    setIsUserMenuOpen(false);
  }

  function openBrowseMenu() {
    setIsBrowseMenuOpen(true);
  }

  function closeBrowseMenu() {
    setIsBrowseMenuOpen(false);
  }

  function handleBrowseCategoryClick(category) {
    if (category === "Genre") {
      closeBrowseMenu();
      navigate("/genres");
      return;
    }

    if (category === "Fandom") {
      closeBrowseMenu();
      navigate("/fandoms");
      return;
    }

    if (category === "Tags") {
      closeBrowseMenu();
      navigate("/tags");
      return;
    }

    if (category === "Bookmarks") {
      closeBrowseMenu();

      // Logged-out users should not see Bookmarks in the browse dropdown.
      // But if something somehow triggers it anyway, prompt auth.
      if (!isAuthed) {
        openLogin();
        return;
      }

      navigate("/bookmarks");
      return;
    }
  }

  React.useEffect(() => {
    function onDocMouseDown(e) {
      if (isUserMenuOpen && userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        closeUserMenu();
      }
      if (isBrowseMenuOpen && browseMenuRef.current && !browseMenuRef.current.contains(e.target)) {
        closeBrowseMenu();
      }
      if (isMobileMenuOpen && mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) {
        closeMobileMenu();
      }
    }

    function onKeyDown(e) {
      if (e.key === "Escape") {
        closeUserMenu();
        closeBrowseMenu();
        closeMobileMenu();
        if (isAuthModalOpen) closeAuthModal();
      }
    }

    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isUserMenuOpen, isBrowseMenuOpen, isMobileMenuOpen, isAuthModalOpen]);

  React.useEffect(() => {
    closeUserMenu();
    closeBrowseMenu();
    closeMobileMenu();
  }, [location.pathname]);

  // Scroll detection for sidebar
  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 64);
    };
    window.addEventListener("scroll", handleScroll);
    // Check initial scroll position
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  React.useEffect(() => {
    function onOpenAuth() {
      openLogin();
    }
    window.addEventListener("sable:open-auth", onOpenAuth);
    return () => window.removeEventListener("sable:open-auth", onOpenAuth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch notification and inbox counts when authenticated
  React.useEffect(() => {
    if (!isAuthed) {
      setNotificationCount(0);
      setInboxCount(0);
      return;
    }

    // Fetch initial counts
    const fetchCounts = async () => {
      try {
        const [notifResponse, inboxResponse] = await Promise.all([
          notificationsApi.getCount(),
          messagesApi.getUnreadCount(),
        ]);
        setNotificationCount(notifResponse.count || 0);
        setInboxCount(inboxResponse.total || 0);
      } catch (err) {
        console.error("Failed to fetch counts:", err);
      }
    };

    fetchCounts();

    // Setup real-time notification listeners
    initSocket();

    const unsubNotification = onNotification(() => {
      setNotificationCount((prev) => prev + 1);
    });

    const unsubRead = onNotificationsRead((data) => {
      if (data.all) {
        setNotificationCount(0);
      } else {
        setNotificationCount((prev) => Math.max(0, prev - (data.count || 1)));
      }
    });

    // Listen for new messages to increment inbox count
    const unsubMessage = onNewMessage(() => {
      setInboxCount((prev) => prev + 1);
    });

    // Poll inbox count periodically (every 30 seconds) as backup
    const inboxPollInterval = setInterval(async () => {
      try {
        const response = await messagesApi.getUnreadCount();
        setInboxCount(response.total || 0);
      } catch (err) {
        // Silently ignore polling errors
      }
    }, 30000);

    return () => {
      unsubNotification();
      unsubRead();
      unsubMessage();
      clearInterval(inboxPollInterval);
    };
  }, [isAuthed]);

  const browseItems = isAuthed ? ["Genre", "Fandom", "Tags", "Bookmarks"] : ["Genre", "Fandom", "Tags"];

  return (
    <header className="sable-header">
      <div className="topbar">
        <div className="topbar-left">
          <button
            type="button"
            className="brand"
            aria-label="Go to Home"
            onClick={() => navigate("/")}
          >
            <img className="brand-logo" src={sableLogo} alt="" aria-hidden="true" />
            <span className="brand-text">SABLE</span>
          </button>

          <nav className="topnav topnav--desktop" aria-label="Primary navigation">
            <NavLink
              to="/browse"
              className={({ isActive }) => (isActive ? "navlink active" : "navlink")}
            >
              Browse
            </NavLink>

            <span className="divider" aria-hidden="true" />

            <NavLink
              to="/communities"
              className={({ isActive }) => (isActive ? "navlink active" : "navlink")}
            >
              Communities
            </NavLink>

            <span className="divider" aria-hidden="true" />

            <NavLink
              to="/about"
              className={({ isActive }) => (isActive ? "navlink active" : "navlink")}
            >
              About Us
            </NavLink>

            <span className="divider" aria-hidden="true" />

            <NavLink
              to="/faq"
              className={({ isActive }) => (isActive ? "navlink active" : "navlink")}
            >
              FAQ
            </NavLink>
          </nav>
        </div>

        {/* Hamburger button for mobile */}
        <div className="hamburger-wrap" ref={mobileMenuRef}>
          <button
            type="button"
            className="hamburger-btn"
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
          >
            <span className={`hamburger-icon ${isMobileMenuOpen ? "hamburger-icon--open" : ""}`}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>

          {isMobileMenuOpen && (
            <div className="mobile-menu" role="menu" aria-label="Mobile navigation">
              <nav className="mobile-nav">
                <NavLink
                  to="/browse"
                  className={({ isActive }) => (isActive ? "mobile-navlink active" : "mobile-navlink")}
                  onClick={closeMobileMenu}
                >
                  Browse
                </NavLink>
                <NavLink
                  to="/communities"
                  className={({ isActive }) => (isActive ? "mobile-navlink active" : "mobile-navlink")}
                  onClick={closeMobileMenu}
                >
                  Communities
                </NavLink>
                <NavLink
                  to="/about"
                  className={({ isActive }) => (isActive ? "mobile-navlink active" : "mobile-navlink")}
                  onClick={closeMobileMenu}
                >
                  About Us
                </NavLink>
                <NavLink
                  to="/faq"
                  className={({ isActive }) => (isActive ? "mobile-navlink active" : "mobile-navlink")}
                  onClick={closeMobileMenu}
                >
                  FAQ
                </NavLink>
              </nav>

              <div className="mobile-divider" />

              {isAuthed ? (
                <>
                  <div className="mobile-section-title">Quick Actions</div>
                  <button
                    type="button"
                    className="mobile-navlink"
                    onClick={() => { closeMobileMenu(); goToSearch(); }}
                  >
                    Search
                  </button>
                  <button
                    type="button"
                    className="mobile-navlink"
                    onClick={() => { closeMobileMenu(); navigate("/new-draft"); }}
                  >
                    New Draft
                  </button>
                  <button
                    type="button"
                    className="mobile-navlink mobile-navlink--withBadge"
                    onClick={() => { closeMobileMenu(); navigate("/inbox"); }}
                  >
                    Inbox
                    {inboxCount > 0 && <span className="mobile-badge">{inboxCount}</span>}
                  </button>
                  <button
                    type="button"
                    className="mobile-navlink mobile-navlink--withBadge"
                    onClick={() => { closeMobileMenu(); navigate("/notifications"); }}
                  >
                    Notifications
                    {notificationCount > 0 && <span className="mobile-badge">{notificationCount}</span>}
                  </button>

                  <div className="mobile-divider" />

                  <div className="mobile-section-title">Account</div>
                  <button
                    type="button"
                    className="mobile-navlink"
                    onClick={() => { closeMobileMenu(); navigate("/communities/me"); }}
                  >
                    Your Community Page
                  </button>
                  <button
                    type="button"
                    className="mobile-navlink"
                    onClick={() => { closeMobileMenu(); navigate("/profile"); }}
                  >
                    Profile
                  </button>
                  <button
                    type="button"
                    className="mobile-navlink"
                    onClick={() => { closeMobileMenu(); navigate("/settings"); }}
                  >
                    Settings
                  </button>
                  <button
                    type="button"
                    className="mobile-navlink"
                    onClick={() => { closeMobileMenu(); navigate("/bookmarks"); }}
                  >
                    Bookmarks
                  </button>

                  <div className="mobile-divider" />

                  <button
                    type="button"
                    className="mobile-navlink mobile-navlink--danger"
                    onClick={() => { closeMobileMenu(); onLogout(); navigate("/"); }}
                  >
                    Log Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="mobile-navlink"
                    onClick={() => { closeMobileMenu(); goToSearch(); }}
                  >
                    Search
                  </button>

                  <div className="mobile-divider" />

                  <button
                    type="button"
                    className="mobile-login-btn"
                    onClick={() => { closeMobileMenu(); openLogin(); }}
                  >
                    Log In
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="topbar-right topbar-right--desktop">
          {isAuthed ? (
            <>
              <div className="userMenu" ref={userMenuRef}>
                <button
                  type="button"
                  className="userButton"
                  onClick={toggleUserMenu}
                  aria-haspopup="menu"
                  aria-expanded={isUserMenuOpen ? "true" : "false"}
                >
                  <span className="greetingText">Hi, {username}!</span>
                  <span className="chev" aria-hidden="true">
                    ▾
                  </span>
                </button>

                {isUserMenuOpen ? (
                  <div className="dropdown" role="menu" aria-label="User menu">
                    <button
                      type="button"
                      className="dropItem"
                      role="menuitem"
                      onClick={() => navigate("/communities/me")}
                    >
                      Your Community Page
                    </button>
                    <button
                      type="button"
                      className="dropItem"
                      role="menuitem"
                      onClick={() => navigate("/profile")}
                    >
                      Profile
                    </button>
                    <button
                      type="button"
                      className="dropItem"
                      role="menuitem"
                      onClick={() => navigate("/settings")}
                    >
                      Settings
                    </button>
                    <button
                      type="button"
                      className="dropItem"
                      role="menuitem"
                      onClick={() => navigate("/bookmarks")}
                    >
                      Bookmarks
                    </button>

                    <div className="dropDivider" aria-hidden="true" />

                    <button
                      type="button"
                      className="dropItem danger"
                      role="menuitem"
                      onClick={() => {
                        closeUserMenu();
                        onLogout();
                        navigate("/");
                      }}
                    >
                      Log out
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="iconbar" aria-label="Quick actions">
                <button
                  type="button"
                  className="iconbtn iconbtn--svg"
                  aria-label="Search"
                  onClick={() => goToSearch()}
                  title="Search"
                >
                  <img className="navIcon" src={searchNavIcon} alt="" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  className="iconbtn iconbtn--svg"
                  aria-label="New draft"
                  onClick={() => navigate("/new-draft")}
                  title="New Draft"
                >
                  <img className="navIcon" src={draftNavIcon} alt="" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  className="iconbtn iconbtn--svg iconbtn--withBadge"
                  aria-label={`Inbox${inboxCount > 0 ? ` (${inboxCount} unread)` : ""}`}
                  onClick={() => navigate("/inbox")}
                  title="Inbox"
                >
                  <img className="navIcon" src={inboxNavIcon} alt="" aria-hidden="true" />
                  {inboxCount > 0 && <span className="iconbtn-badge" aria-hidden="true" />}
                </button>

                <button
                  type="button"
                  className="iconbtn iconbtn--svg iconbtn--withBadge"
                  aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount} unread)` : ""}`}
                  onClick={() => navigate("/notifications")}
                  title="Notifications"
                >
                  <img className="navIcon" src={notificationsNavIcon} alt="" aria-hidden="true" />
                  {notificationCount > 0 && <span className="iconbtn-badge" aria-hidden="true" />}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="iconbar" aria-label="Quick actions">
                <button
                  type="button"
                  className="iconbtn iconbtn--svg"
                  aria-label="Search"
                  onClick={() => goToSearch()}
                  title="Search"
                >
                  <img className="navIcon" src={searchNavIcon} alt="" aria-hidden="true" />
                </button>
              </div>

              <button type="button" className="loginBtn" onClick={openLogin}>
                Log In
              </button>
            </>
          )}
        </div>
      </div>

      {showBrowseBar ? (
        <div className="subbar">
          <div className="browseWrap" ref={browseMenuRef}>
            <form className="browseForm" onSubmit={handleBrowseSubmit} role="search">
              <span className="searchIcon" aria-hidden="true">
                🔎
              </span>

              <input
                className="browseInput"
                type="search"
                placeholder="Browse..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={openBrowseMenu}
                onClick={openBrowseMenu}
                aria-label="Browse"
                aria-expanded={isBrowseMenuOpen ? "true" : "false"}
                aria-haspopup="listbox"
              />
            </form>

            {isBrowseMenuOpen ? (
              <div className="browseDropdown" role="listbox" aria-label="Browse categories">
                {browseItems.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="browseDropItem"
                    role="option"
                    onClick={() => handleBrowseCategoryClick(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Sidebar - appears when scrolled past navbar */}
      {isScrolled && !isMobileMenuOpen && (
        <aside className="sable-sidebar" aria-label="Quick navigation">
          <button
            type="button"
            className="sidebar-icon"
            onClick={() => navigate("/")}
            title="Home"
          >
            <img src={sableLogo} alt="Home" />
          </button>

          <button
            type="button"
            className="sidebar-icon"
            onClick={() => navigate("/browse")}
            title="Browse"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
            </svg>
          </button>

          <button
            type="button"
            className="sidebar-icon"
            onClick={() => navigate("/communities")}
            title="Communities"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
          </button>

          <button
            type="button"
            className="sidebar-icon"
            onClick={() => goToSearch()}
            title="Search"
          >
            <img src={searchNavIcon} alt="Search" />
          </button>

          {isAuthed && (
            <>
              <div className="sidebar-divider" />

              <button
                type="button"
                className="sidebar-icon"
                onClick={() => navigate("/inbox")}
                title="Inbox"
              >
                <img src={inboxNavIcon} alt="Inbox" />
                {inboxCount > 0 && <span className="sidebar-badge" />}
              </button>

              <button
                type="button"
                className="sidebar-icon"
                onClick={() => navigate("/notifications")}
                title="Notifications"
              >
                <img src={notificationsNavIcon} alt="Notifications" />
                {notificationCount > 0 && <span className="sidebar-badge" />}
              </button>

              <button
                type="button"
                className="sidebar-icon"
                onClick={toggleUserMenu}
                title="Menu"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </button>
            </>
          )}

          {!isAuthed && (
            <>
              <div className="sidebar-divider" />
              <button
                type="button"
                className="sidebar-icon"
                onClick={openLogin}
                title="Log In"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z"/>
                </svg>
              </button>
            </>
          )}
        </aside>
      )}

      {isAuthModalOpen ? (
        <div
          className="loginOverlay"
          role="dialog"
          aria-modal="true"
          aria-label={authMode === "login" ? "Log in" : "Sign up"}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeAuthModal();
          }}
        >
          <div className="loginCard">
            <button
              type="button"
              className="loginClose"
              onClick={closeAuthModal}
              aria-label="Close"
              title="Close"
            >
              ✕
            </button>

            <img className="loginGraphic" src={loginGraphic} alt="" aria-hidden="true" />

            <h2 className="loginTitle">
              {authMode === "2fa"
                ? "Two-Factor Authentication"
                : authMode === "login"
                ? "Log in now and start reading!"
                : "Sign up and start reading!"}
            </h2>

            <p className="loginSub">
              {authMode === "2fa"
                ? "Enter the code from your authenticator app"
                : "Discover stories and create your own to share with others"}
            </p>

            {authMode !== "2fa" && (
              <>
                <div className="authSwitch">
                  {authMode === "login" ? (
                    <>
                      <span>Dont have an account ? </span>
                      <button
                        type="button"
                        className="authLink"
                        onClick={() => resetAuthFieldsForMode("signup")}
                      >
                        Sign Up
                      </button>
                    </>
                  ) : (
                    <>
                      <span>Already have an account ? </span>
                      <button
                        type="button"
                        className="authLink"
                        onClick={() => resetAuthFieldsForMode("login")}
                      >
                        Log In
                      </button>
                    </>
                  )}
                </div>
              </>
            )}

            {authMode === "2fa" ? (
              <form className="loginForm" onSubmit={handle2FASubmit}>
                <label className="loginField">
                  <span className="loginLabel">Authentication Code</span>
                  <input
                    className="loginInput"
                    value={form2FACode}
                    onChange={(e) => setForm2FACode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                    placeholder="Enter 6-digit code or backup code"
                    autoFocus
                    style={{ textAlign: "center", letterSpacing: 4 }}
                  />
                </label>

                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: -4, marginBottom: 8 }}>
                  You can also use a backup code (format: XXXX-XXXX)
                </p>

                {authError ? <div className="authError">{authError}</div> : null}

                <button type="submit" className="loginPrimary" disabled={authLoading}>
                  {authLoading ? "Verifying..." : "Verify"}
                </button>

                <button
                  type="button"
                  className="authLink"
                  style={{ marginTop: 12, display: "block", width: "100%", textAlign: "center" }}
                  onClick={() => {
                    setAuthMode("login");
                    setPending2FAUserId(null);
                    setForm2FACode("");
                    setAuthError("");
                  }}
                >
                  Back to Login
                </button>
              </form>
            ) : (
            <form className="loginForm" onSubmit={handleAuthSubmit}>
              <label className="loginField">
                <span className="loginLabel">Username</span>
                <input
                  className="loginInput"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="john.doe"
                  autoFocus
                />
              </label>

              {authMode === "signup" ? (
                <label className="loginField">
                  <span className="loginLabel">Email</span>
                  <input
                    className="loginInput"
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </label>
              ) : null}

              <label className="loginField">
                <span className="loginLabel">Password</span>
                <div className="loginInputWrap">
                  <input
                    className="loginInput"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="••••••••"
                    type={showPassword ? "text" : "password"}
                  />
                  <button
                    type="button"
                    className="passwordToggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    <img src={showPassword ? visibleIcon : visibleOffIcon} alt="" style={{ width: 18, height: 18 }} />
                  </button>
                </div>
              </label>

              {authMode === "signup" ? (
                <label className="loginField">
                  <span className="loginLabel">Confirm Password</span>
                  <div className="loginInputWrap">
                    <input
                      className="loginInput"
                      value={formConfirmPassword}
                      onChange={(e) => setFormConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      type={showConfirmPassword ? "text" : "password"}
                    />
                    <button
                      type="button"
                      className="passwordToggle"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      title={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      <img src={showConfirmPassword ? visibleIcon : visibleOffIcon} alt="" style={{ width: 18, height: 18 }} />
                    </button>
                  </div>
                </label>
              ) : null}

              {authMode === "login" ? (
                <div className="forgotPassword">
                  <button
                    type="button"
                    className="authLink"
                    onClick={() => {
                      closeAuthModal();
                      navigate("/forgot-password");
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
              ) : null}

              {authError ? <div className="authError">{authError}</div> : null}

              <button type="submit" className="loginPrimary" disabled={authLoading}>
                {authLoading ? "Please wait..." : authMode === "login" ? "Log In" : "Create Account"}
              </button>

              {authMode === "login" && (
                <div className="adminLoginLink">
                  <button
                    type="button"
                    className="authLink authLink--subtle"
                    onClick={() => {
                      closeAuthModal();
                      navigate("/admin/login");
                    }}
                  >
                    Sable Admin
                  </button>
                </div>
              )}
            </form>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}























