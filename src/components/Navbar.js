import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";

// Assets (src/assets/images)
import sableLogo from "../assets/images/Sable_Logo.png";

import draftNavIcon from "../assets/images/draft_nav.svg";
import inboxNavIcon from "../assets/images/inbox_nav.svg";
import notificationsNavIcon from "../assets/images/notifications_nav.svg";
import searchNavIcon from "../assets/images/search_nav.svg";

import loginGraphic from "../assets/images/login_graphic.png";

export default function Navbar({ isAuthed, username, onLogin, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const path = location.pathname;
  const showBrowseBar =
    path === "/browse" || path.startsWith("/library/genre") || path.startsWith("/library/fandom");

  const [query, setQuery] = React.useState("");

  // Browse dropdown
  const [isBrowseMenuOpen, setIsBrowseMenuOpen] = React.useState(false);
  const browseMenuRef = React.useRef(null);

  // Auth modal
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);
  const [authMode, setAuthMode] = React.useState("login"); // "login" | "signup"

  const [formUsername, setFormUsername] = React.useState("");
  const [formPassword, setFormPassword] = React.useState("");
  const [formConfirmPassword, setFormConfirmPassword] = React.useState("");
  const [authError, setAuthError] = React.useState("");

  // User dropdown
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
  const userMenuRef = React.useRef(null);

  function handleBrowseSubmit(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
    setIsBrowseMenuOpen(false);
  }

  function openLogin() {
    setAuthMode("login");
    setIsAuthModalOpen(true);
    setAuthError("");
  }

  function closeAuthModal() {
    setIsAuthModalOpen(false);
    setFormPassword("");
    setFormConfirmPassword("");
    setAuthError("");
  }

  function resetAuthFieldsForMode(nextMode) {
    setAuthMode(nextMode);
    setAuthError("");
    setFormPassword("");
    setFormConfirmPassword("");
  }

  function handleAuthSubmit(e) {
    e.preventDefault();

    const u = (formUsername || "").trim() || "john.doe";

    if (authMode === "signup") {
      if (!formPassword || !formConfirmPassword) {
        setAuthError("Please enter and confirm your password.");
        return;
      }
      if (formPassword !== formConfirmPassword) {
        setAuthError("Passwords do not match.");
        return;
      }
    }

    onLogin(u);
    setIsAuthModalOpen(false);
    setFormPassword("");
    setFormConfirmPassword("");
    setAuthError("");
  }

  function handleGoogleContinue() {
    const u = (formUsername || "").trim() || "john.doe";
    onLogin(u);
    setIsAuthModalOpen(false);
    setFormPassword("");
    setFormConfirmPassword("");
    setAuthError("");
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
      navigate("/library/genre");
      return;
    }

    if (category === "Fandom") {
      closeBrowseMenu();
      navigate("/library/fandom");
      return;
    }

    if (category === "Tags") {
      setQuery("tag: ");
      return;
    }

    if (category === "Bookmarks") {
      setQuery("bookmarks: ");
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
    }

    function onKeyDown(e) {
      if (e.key === "Escape") {
        closeUserMenu();
        closeBrowseMenu();
        if (isAuthModalOpen) closeAuthModal();
      }
    }

    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isUserMenuOpen, isBrowseMenuOpen, isAuthModalOpen]);

  React.useEffect(() => {
    closeUserMenu();
    closeBrowseMenu();
  }, [location.pathname]);

  return (
    <header className="sable-header">
      <div className="topbar">
        <div className="topbar-left">
          <button type="button" className="brand" aria-label="Go to Home" onClick={() => navigate("/")}>
            <img className="brand-logo" src={sableLogo} alt="" aria-hidden="true" />
            <span className="brand-text">SABLE</span>
          </button>

          <nav className="topnav" aria-label="Primary navigation">
            <NavLink to="/browse" className={({ isActive }) => (isActive ? "navlink active" : "navlink")}>
              Browse
            </NavLink>

            <span className="divider" aria-hidden="true" />

            <NavLink to="/communities" className={({ isActive }) => (isActive ? "navlink active" : "navlink")}>
              Communities
            </NavLink>

            <span className="divider" aria-hidden="true" />

            <NavLink to="/about" className={({ isActive }) => (isActive ? "navlink active" : "navlink")}>
              About Us
            </NavLink>
          </nav>
        </div>

        <div className="topbar-right">
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
                  <span className="chev" aria-hidden="true">▾</span>
                </button>

                {isUserMenuOpen ? (
                  <div className="dropdown" role="menu" aria-label="User menu">
                    <button type="button" className="dropItem" role="menuitem" onClick={() => navigate("/communities/me")}>
                      Your Community Page
                    </button>
                    <button type="button" className="dropItem" role="menuitem" onClick={() => navigate("/profile")}>
                      Profile
                    </button>
                    <button type="button" className="dropItem" role="menuitem" onClick={() => navigate("/settings")}>
                      Settings
                    </button>
                    <button type="button" className="dropItem" role="menuitem" onClick={() => navigate("/bookmarks")}>
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
                <button type="button" className="iconbtn iconbtn--svg" aria-label="Search" onClick={() => navigate("/search")} title="Search">
                  <img className="navIcon" src={searchNavIcon} alt="" aria-hidden="true" />
                </button>

                <button type="button" className="iconbtn iconbtn--svg" aria-label="New draft" onClick={() => navigate("/new-draft")} title="New Draft">
                  <img className="navIcon" src={draftNavIcon} alt="" aria-hidden="true" />
                </button>

                <button type="button" className="iconbtn iconbtn--svg" aria-label="Inbox" onClick={() => navigate("/inbox")} title="Inbox">
                  <img className="navIcon" src={inboxNavIcon} alt="" aria-hidden="true" />
                </button>

                <button type="button" className="iconbtn iconbtn--svg" aria-label="Notifications" onClick={() => navigate("/notifications")} title="Notifications">
                  <img className="navIcon" src={notificationsNavIcon} alt="" aria-hidden="true" />
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="iconbar" aria-label="Quick actions">
                <button type="button" className="iconbtn iconbtn--svg" aria-label="Search" onClick={() => navigate("/search")} title="Search">
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

      {/* Green browse bar */}
      {showBrowseBar ? (
        <div className="subbar">
          <div className="browseWrap" ref={browseMenuRef}>
            <form className="browseForm" onSubmit={handleBrowseSubmit} role="search">
              <span className="searchIcon" aria-hidden="true">🔎</span>

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
                {["Genre", "Fandom", "Tags", "Bookmarks"].map((item) => (
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

      {/* Auth modal */}
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
            <button type="button" className="loginClose" onClick={closeAuthModal} aria-label="Close" title="Close">
              ✕
            </button>

            <img className="loginGraphic" src={loginGraphic} alt="" aria-hidden="true" />

            <h2 className="loginTitle">
              {authMode === "login" ? "Log in now and start reading!" : "Sign up and start reading!"}
            </h2>

            <p className="loginSub">Discover stories and create your own to share with others</p>

            <button type="button" className="googleBtn" onClick={handleGoogleContinue}>
              <span className="googleDot" aria-hidden="true">G</span>
              <span className="googleText">Continue with Google</span>
            </button>

            <div className="authSwitch">
              {authMode === "login" ? (
                <>
                  <span>Dont have an account ? </span>
                  <button type="button" className="authLink" onClick={() => resetAuthFieldsForMode("signup")}>
                    Sign Up
                  </button>
                </>
              ) : (
                <>
                  <span>Already have an account ? </span>
                  <button type="button" className="authLink" onClick={() => resetAuthFieldsForMode("login")}>
                    Log In
                  </button>
                </>
              )}
            </div>

            <form className="loginForm" onSubmit={handleAuthSubmit}>
              <label className="loginField">
                <span className="loginLabel">Username</span>
                <input className="loginInput" value={formUsername} onChange={(e) => setFormUsername(e.target.value)} placeholder="john.doe" autoFocus />
              </label>

              <label className="loginField">
                <span className="loginLabel">Password</span>
                <input className="loginInput" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="••••••••" type="password" />
              </label>

              {authMode === "signup" ? (
                <label className="loginField">
                  <span className="loginLabel">Confirm Password</span>
                  <input className="loginInput" value={formConfirmPassword} onChange={(e) => setFormConfirmPassword(e.target.value)} placeholder="••••••••" type="password" />
                </label>
              ) : null}

              {authError ? <div className="authError">{authError}</div> : null}

              <button type="submit" className="loginPrimary">
                {authMode === "login" ? "Log In" : "Create Account"}
              </button>

              <p className="loginNote">Front-end only: this accepts any username/password for now.</p>
            </form>
          </div>
        </div>
      ) : null}
    </header>
  );
}










