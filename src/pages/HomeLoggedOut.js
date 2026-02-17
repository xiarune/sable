// HomeLoggedOut.js
import React from "react";
import { useNavigate } from "react-router-dom";
import WorkCarousel from "../components/WorkCarousel";
import { SableLoader } from "../components";
import { discoveryApi } from "../api";
import homeIcon from "../assets/images/home_icon.png";
import defaultCover from "../assets/images/sable_default_cover.png";

export default function HomeLoggedOut() {
  const navigate = useNavigate();

  const [works, setWorks] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadData() {
      try {
        // Load newest published works for logged out users
        const newestData = await discoveryApi.newest(1, 20).catch(() => ({ works: [] }));

        // Transform works to carousel format
        const transformWork = (w) => ({
          id: w._id,
          title: w.title || "Untitled",
          author: w.authorName || w.authorUsername || "Unknown Author",
          cover: w.coverImageUrl || defaultCover,
        });

        setWorks((newestData.works || []).map(transformWork));
      } catch (err) {
        console.error("Failed to load home data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  function openWork(item) {
    if (!item?.id) return;
    navigate(`/works/${encodeURIComponent(item.id)}`);
  }

  if (loading) {
    return <SableLoader />;
  }

  if (works.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h2>Welcome to Sable</h2>
        <p>No published works yet. Sign up to be the first to publish!</p>
      </div>
    );
  }

  return (
    <div>
      <WorkCarousel
        title="Discover"
        subtitle="Published works on Sable"
        items={works}
        ariaLabel="Published works"
        titleIcon={homeIcon}
        onItemClick={openWork}
      />
    </div>
  );
}



