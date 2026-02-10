import React from "react";
import { useNavigate } from "react-router-dom";
import WorkCarousel from "../components/WorkCarousel";
import { discoveryApi } from "../api";
import homeIcon from "../assets/images/home_icon.png";
import defaultCover from "../assets/images/sable_default_cover.png";

export default function Browse() {
  const navigate = useNavigate();

  const [trending, setTrending] = React.useState([]);
  const [featured, setFeatured] = React.useState([]);
  const [newest, setNewest] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadData() {
      try {
        const [trendingData, featuredData, newestData] = await Promise.all([
          discoveryApi.trending("week", 12).catch(() => ({ works: [] })),
          discoveryApi.featured().catch(() => ({ works: [] })),
          discoveryApi.newest(1, 12).catch(() => ({ works: [] })),
        ]);

        // Transform works to carousel format
        const transformWork = (w) => ({
          id: w._id,
          title: w.title || "Untitled",
          author: w.authorUsername || "Unknown Author",
          cover: w.coverImageUrl || defaultCover,
        });

        setTrending((trendingData.works || []).map(transformWork));
        setFeatured((featuredData.works || []).map(transformWork));
        setNewest((newestData.works || []).map(transformWork));
      } catch (err) {
        console.error("Failed to load browse data:", err);
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
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        Loading...
      </div>
    );
  }

  const hasContent = trending.length > 0 || featured.length > 0 || newest.length > 0;

  if (!hasContent) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h2>Browse Works</h2>
        <p>No published works yet. Check back soon or be the first to publish!</p>
        <button
          onClick={() => navigate("/new-draft")}
          style={{
            padding: "12px 24px",
            background: "#1f4a29",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          Create a Draft
        </button>
      </div>
    );
  }

  return (
    <div>
      {trending.length > 0 && (
        <WorkCarousel
          title="Trending"
          subtitle="What readers are binging right now"
          items={trending}
          ariaLabel="Trending works"
          titleIcon={homeIcon}
          autoScroll
          onItemClick={openWork}
        />
      )}

      {featured.length > 0 && (
        <WorkCarousel
          title="Featured"
          subtitle="Curated picks from the front page"
          items={featured}
          ariaLabel="Featured works"
          titleIcon={homeIcon}
          autoScroll
          onItemClick={openWork}
        />
      )}

      {newest.length > 0 && (
        <WorkCarousel
          title="New & Noteworthy"
          subtitle="Fresh works worth a look"
          items={newest}
          ariaLabel="New and noteworthy works"
          titleIcon={homeIcon}
          autoScroll
          onItemClick={openWork}
        />
      )}
    </div>
  );
}
