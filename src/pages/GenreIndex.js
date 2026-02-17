import React from "react";
import { useNavigate } from "react-router-dom";
import { discoveryApi } from "../api";
import { SableLoader, DropCapTitle, BrowseOrnament } from "../components";
import "./Library.css";

export default function GenreIndex() {
  const navigate = useNavigate();
  const [genres, setGenres] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadGenres() {
      try {
        const data = await discoveryApi.genres();
        setGenres(data.genres || []);
      } catch (err) {
        console.error("Failed to load genres:", err);
      } finally {
        setLoading(false);
      }
    }
    loadGenres();
  }, []);

  if (loading) {
    return (
      <div className="shelfPage">
        <div className="shelfBanner">
          <BrowseOrnament />
          <DropCapTitle title="Genre" variant="banner" />
        </div>
        <SableLoader />
      </div>
    );
  }

  return (
    <div className="shelfPage">
      <div className="shelfBanner">
        <BrowseOrnament />
        <DropCapTitle title="Genre" variant="banner" />
      </div>

      <div className="shelfBody">
        {genres.length === 0 ? (
          <p>No genres yet. Publish a work to create the first genre.</p>
        ) : (
          <div className="cardGrid">
            {genres.map((g) => (
              <button
                key={g.slug}
                type="button"
                className="topicCard"
                onClick={() => navigate(`/genres/${g.slug}`)}
              >
                <div className="topicCardText">{g.name}</div>
                <div className="topicCardCount">{g.worksCount || 0} works</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
