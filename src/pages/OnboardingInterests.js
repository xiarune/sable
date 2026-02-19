import React from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api";
import "./OnboardingInterests.css";

export default function OnboardingInterests({ onLogin }) {
  const navigate = useNavigate();
  const [genres, setGenres] = React.useState([]);
  const [fandoms, setFandoms] = React.useState([]);
  const [selectedGenres, setSelectedGenres] = React.useState([]);
  const [selectedFandoms, setSelectedFandoms] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");

  // Load options on mount
  React.useEffect(() => {
    async function loadOptions() {
      try {
        const data = await authApi.getOnboardingOptions();
        setGenres(data.genres || []);
        setFandoms(data.fandoms || []);
      } catch (err) {
        console.error("Failed to load onboarding options:", err);
        setError("Failed to load options. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    }

    loadOptions();
  }, []);

  function toggleGenre(slug) {
    setSelectedGenres((prev) => {
      if (prev.includes(slug)) {
        return prev.filter((g) => g !== slug);
      }
      // Soft limit of 5 genres
      if (prev.length >= 5) {
        return prev;
      }
      return [...prev, slug];
    });
  }

  function toggleFandom(slug) {
    setSelectedFandoms((prev) => {
      if (prev.includes(slug)) {
        return prev.filter((f) => f !== slug);
      }
      // Soft limit of 10 fandoms
      if (prev.length >= 10) {
        return prev;
      }
      return [...prev, slug];
    });
  }

  async function handleContinue() {
    setSubmitting(true);
    setError("");

    try {
      const data = await authApi.saveInterests({
        genres: selectedGenres,
        fandoms: selectedFandoms,
      });
      if (onLogin && data.user) {
        onLogin(data.user);
      }
      navigate("/");
    } catch (err) {
      setError(err.message || "Failed to save interests. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSkip() {
    setSubmitting(true);
    setError("");

    try {
      const data = await authApi.skipOnboarding();
      if (onLogin && data.user) {
        onLogin(data.user);
      }
      navigate("/");
    } catch (err) {
      setError(err.message || "Failed to skip. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="oi-page">
        <div className="oi-shell">
          <p className="oi-loading">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="oi-page">
      <div className="oi-shell">
        <h1 className="oi-title">What do you like to read?</h1>
        <p className="oi-subtitle">
          Select your favorite genres and fandoms to get personalized recommendations.
          You can always update these later in Settings.
        </p>

        {error && <div className="oi-error">{error}</div>}

        {/* Genres Section */}
        <section className="oi-section">
          <h2 className="oi-sectionTitle">
            Genres
            <span className="oi-count">
              {selectedGenres.length}/5 selected
            </span>
          </h2>
          <div className="oi-grid">
            {genres.map((genre) => (
              <button
                key={genre.slug}
                type="button"
                className={`oi-chip ${selectedGenres.includes(genre.slug) ? "oi-chip--selected" : ""}`}
                onClick={() => toggleGenre(genre.slug)}
                disabled={submitting}
              >
                <span className="oi-chipIcon">{genre.icon}</span>
                <span className="oi-chipLabel">{genre.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Fandoms Section */}
        <section className="oi-section">
          <h2 className="oi-sectionTitle">
            Fandoms
            <span className="oi-count">
              {selectedFandoms.length}/10 selected
            </span>
          </h2>
          <div className="oi-grid oi-grid--fandoms">
            {fandoms.map((fandom) => (
              <button
                key={fandom.slug}
                type="button"
                className={`oi-chip oi-chip--fandom ${selectedFandoms.includes(fandom.slug) ? "oi-chip--selected" : ""}`}
                onClick={() => toggleFandom(fandom.slug)}
                disabled={submitting}
              >
                <span className="oi-chipLabel">{fandom.name}</span>
                <span className="oi-chipCategory">{fandom.category}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Actions */}
        <div className="oi-actions">
          <button
            type="button"
            className="oi-skipBtn"
            onClick={handleSkip}
            disabled={submitting}
          >
            Skip for now
          </button>
          <button
            type="button"
            className="oi-continueBtn"
            onClick={handleContinue}
            disabled={submitting}
          >
            {submitting ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
