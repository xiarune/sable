import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { authApi } from "./api";

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

import YourWorks from "./pages/YourWorks";
import WorkEditor from "./pages/WorkEditor";
import WorkView from "./pages/WorkView";

import Drafts from "./pages/Drafts";
import DraftEditor from "./pages/DraftEditor";

import SupportSable from "./pages/SupportSable";
import OnboardingUsername from "./pages/OnboardingUsername";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import TwoFactorSetup from "./pages/TwoFactorSetup";
import FAQ from "./pages/FAQ";

export default function App() {
  const [isAuthed, setIsAuthed] = React.useState(false);
  const [user, setUser] = React.useState(null);
  const [authLoading, setAuthLoading] = React.useState(true);

  // Check if user is already logged in on mount
  React.useEffect(() => {
    async function checkAuth() {
      try {
        const data = await authApi.me();
        if (data.user) {
          setUser(data.user);
          setIsAuthed(true);
        }
      } catch {
        // Not logged in - that's fine
        setUser(null);
        setIsAuthed(false);
      } finally {
        setAuthLoading(false);
      }
    }

    checkAuth();
  }, []);

  function handleLogin(userData) {
    setUser(userData);
    setIsAuthed(true);
  }

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors
    }
    setUser(null);
    setIsAuthed(false);
  }

  const username = user?.username || "";
  const effectiveUsername = username || "guest";

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <>
      <Navbar isAuthed={isAuthed} user={user} username={effectiveUsername} onLogin={handleLogin} onLogout={handleLogout} />

      <main>
        <Routes>
          {/* Home */}
          <Route path="/" element={isAuthed ? <HomeLoggedIn /> : <HomeLoggedOut />} />

          {/* Main nav */}
          <Route path="/browse" element={<Browse />} />
          <Route path="/communities" element={<Communities isAuthed={isAuthed} username={effectiveUsername} />} />
          <Route path="/about" element={<About />} />
          <Route path="/faq" element={<FAQ />} />

          {/* Support / payments */}
          <Route path="/support" element={<SupportSable />} />

          {/* Username onboarding for Google OAuth users */}
          <Route path="/onboarding/username" element={<OnboardingUsername onLogin={handleLogin} />} />

          {/* Email verification and password reset */}
          <Route path="/verify-email/:token" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          {/* Two-Factor Authentication */}
          <Route path="/settings/2fa" element={isAuthed ? <TwoFactorSetup /> : <Navigate to="/" replace />} />

          {/* Search */}
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
          <Route path="/communities/:handle" element={<PublicCommunityPage isAuthed={isAuthed} username={effectiveUsername} />} />

          {/* Published works */}
          <Route path="/works" element={isAuthed ? <YourWorks /> : <Navigate to="/" replace />} />
          <Route path="/works/:workId" element={<WorkView isAuthed={isAuthed} username={effectiveUsername} />} />
          <Route path="/works/edit/:workId" element={isAuthed ? <WorkEditor /> : <Navigate to="/" replace />} />

          {/* Drafts */}
          <Route path="/drafts" element={isAuthed ? <Drafts /> : <Navigate to="/" replace />} />
          <Route path="/drafts/edit/:draftId" element={isAuthed ? <DraftEditor /> : <Navigate to="/" replace />} />

          {/* Create draft */}
          <Route path="/new-draft" element={isAuthed ? <NewDraft /> : <Navigate to="/" replace />} />

          {/* Auth only pages */}
          <Route path="/inbox" element={isAuthed ? <Inbox /> : <Navigate to="/" replace />} />
          <Route path="/notifications" element={isAuthed ? <Notifications /> : <Navigate to="/" replace />} />
          <Route path="/profile" element={isAuthed ? <Profile username={effectiveUsername} /> : <Navigate to="/" replace />} />
          <Route
            path="/settings"
            element={isAuthed ? <Settings username={effectiveUsername} onLogout={handleLogout} /> : <Navigate to="/" replace />}
          />
          <Route path="/bookmarks" element={isAuthed ? <Bookmarks /> : <Navigate to="/" replace />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />
    </>
  );
}
