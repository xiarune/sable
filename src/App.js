import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";

import HomeLoggedIn from "./pages/HomeLoggedIn";
import HomeLoggedOut from "./pages/HomeLoggedOut";

import Browse from "./pages/Browse";
import Communities from "./pages/Communities";
import About from "./pages/About";
import Search from "./pages/Search";

import Inbox from "./pages/Inbox";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Bookmarks from "./pages/Bookmarks";
import NewDraft from "./pages/NewDraft";

import YourCommunityPage from "./pages/YourCommunityPage";
import PublicCommunityPage from "./pages/PublicCommunityPage";

import GenreIndex from "./pages/GenreIndex";
import GenreDetail from "./pages/GenreDetail";
import FandomIndex from "./pages/FandomIndex";
import FandomDetail from "./pages/FandomDetail";

import TagsIndex from "./pages/TagsIndex";

import ExistingDrafts from "./pages/ExistingDrafts";
import YourWorks from "./pages/YourWorks";

export default function App() {
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

  const effectiveUsername = (username || "john.doe").trim();

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
          {/* Home */}
          <Route path="/" element={isAuthed ? <HomeLoggedIn /> : <HomeLoggedOut />} />

          {/* Main nav */}
          <Route path="/browse" element={<Browse />} />
          <Route
            path="/communities"
            element={<Communities isAuthed={isAuthed} username={effectiveUsername} />}
          />
          <Route path="/about" element={<About />} />
          <Route path="/search" element={<Search />} />

          {/* Browse Library routes */}
          <Route path="/genres" element={<GenreIndex />} />
          <Route path="/genres/:genreSlug" element={<GenreDetail />} />
          <Route path="/fandoms" element={<FandomIndex />} />
          <Route path="/fandoms/:fandomSlug" element={<FandomDetail />} />
          <Route path="/tags" element={<TagsIndex />} />

          {/* Communities profiles */}
          <Route
            path="/communities/me"
            element={isAuthed ? <YourCommunityPage username={effectiveUsername} /> : <Navigate to="/" replace />}
          />
          <Route
            path="/communities/:handle"
            element={<PublicCommunityPage isAuthed={isAuthed} username={effectiveUsername} />}
          />

          {/* Works + Drafts */}
          <Route path="/works" element={isAuthed ? <YourWorks /> : <Navigate to="/" replace />} />
          <Route path="/drafts" element={isAuthed ? <ExistingDrafts /> : <Navigate to="/" replace />} />
          <Route path="/new-draft" element={isAuthed ? <NewDraft /> : <Navigate to="/" replace />} />

          {/* Auth-only pages (front-end gated for now) */}
          <Route path="/inbox" element={isAuthed ? <Inbox /> : <Navigate to="/" replace />} />
          <Route
            path="/notifications"
            element={isAuthed ? <Notifications /> : <Navigate to="/" replace />}
          />
          <Route
            path="/profile"
            element={isAuthed ? <Profile username={effectiveUsername} /> : <Navigate to="/" replace />}
          />
          <Route
            path="/settings"
            element={isAuthed ? <Settings username={effectiveUsername} onLogout={handleLogout} /> : <Navigate to="/" replace />}
          />
          <Route path="/bookmarks" element={isAuthed ? <Bookmarks /> : <Navigate to="/" replace />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}


























