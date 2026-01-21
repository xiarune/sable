import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";

import HomeLoggedIn from "./pages/HomeLoggedIn";
import HomeLoggedOut from "./pages/HomeLoggedOut";

import Browse from "./pages/Browse";
import Communities from "./pages/Communities";
import About from "./pages/About";
import Inbox from "./pages/Inbox";
import Notifications from "./pages/Notifications";
import Search from "./pages/Search";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";

// NEW
import YourCommunityPage from "./pages/YourCommunityPage";

export default function App() {
  // Default to logged OUT on start
  const [isAuthed, setIsAuthed] = React.useState(false);
  const [username, setUsername] = React.useState("");

  function handleLogin(nextUsername) {
    setUsername(nextUsername);
    setIsAuthed(true);
  }

  function handleLogout() {
    setUsername("");
    setIsAuthed(false);
  }

  const effectiveUsername = username || "john.doe";

  return (
    <>
      <Navbar
        isAuthed={isAuthed}
        username={effectiveUsername}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      <main>
        <Routes>
          <Route
            path="/"
            element={isAuthed ? <HomeLoggedIn /> : <HomeLoggedOut />}
          />

          <Route path="/browse" element={<Browse />} />
          <Route path="/communities" element={<Communities />} />
          <Route path="/about" element={<About />} />

          <Route path="/search" element={<Search />} />

          {/* Auth-only pages (front-end gated for now) */}
          <Route
            path="/inbox"
            element={isAuthed ? <Inbox /> : <Navigate to="/" replace />}
          />
          <Route
            path="/notifications"
            element={isAuthed ? <Notifications /> : <Navigate to="/" replace />}
          />

          {/* Your Community Page (from dropdown) */}
          <Route
            path="/communities/me"
            element={
              isAuthed ? (
                <YourCommunityPage username={effectiveUsername} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route
            path="/profile"
            element={isAuthed ? <Profile /> : <Navigate to="/" replace />}
          />
          <Route
            path="/settings"
            element={isAuthed ? <Settings /> : <Navigate to="/" replace />}
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}










