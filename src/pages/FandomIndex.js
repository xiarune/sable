import React from "react";
import { Link } from "react-router-dom";
import { discoveryApi } from "../api";
import { SableLoader, DropCapTitle, BrowseOrnament } from "../components";
import "./Library.css";

export default function FandomIndex() {
  const [fandoms, setFandoms] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    async function loadFandoms() {
      try {
        const data = await discoveryApi.fandoms(null, search || null);
        setFandoms(data.fandoms || []);
      } catch (err) {
        console.error("Failed to load fandoms:", err);
      } finally {
        setLoading(false);
      }
    }
    loadFandoms();
  }, [search]);

  if (loading) {
    return (
      <div className="shelfPage">
        <div className="shelfBanner">
          <BrowseOrnament />
          <DropCapTitle title="Fandom" variant="banner" />
        </div>
        <SableLoader />
      </div>
    );
  }

  return (
    <div className="shelfPage">
      <div className="shelfBanner">
        <BrowseOrnament />
        <DropCapTitle title="Fandom" variant="banner" />
      </div>

      <div className="shelfBody">
        <div className="shelfSearch">
          <input
            type="text"
            className="shelfSearchInput"
            placeholder="Search fandoms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {fandoms.length === 0 ? (
          <p>No fandoms yet. Publish a work to create the first fandom.</p>
        ) : (
          <div className="cardGrid">
            {fandoms.map((f) => (
              <Link key={f.slug} className="topicCard" to={`/fandoms/${f.slug}`}>
                <div className="topicCardText">{f.name}</div>
                <div className="topicCardCount">{f.worksCount || 0} works</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
