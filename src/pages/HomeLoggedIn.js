import React from "react";
import { useNavigate } from "react-router-dom";
import WorkCarousel from "../components/WorkCarousel";
import { SableLoader } from "../components";
import { discoveryApi } from "../api";
import homeIcon from "../assets/images/home_icon.png";
import defaultCover from "../assets/images/sable_default_cover.png";

export default function HomeLoggedIn() {
  const navigate = useNavigate();

  const [forYou, setForYou] = React.useState([]);
  const [trending, setTrending] = React.useState([]);
  const [featured, setFeatured] = React.useState([]);
  const [newest, setNewest] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [hasPersonalized, setHasPersonalized] = React.useState(false);

  React.useEffect(() => {
    async function loadData() {
      try {
        const [forYouData, trendingData, featuredData, newestData] = await Promise.all([
          discoveryApi.forYou(12).catch(() => ({ works: [], personalized: false })),
          discoveryApi.trending("week", 12).catch(() => ({ works: [] })),
          discoveryApi.featured().catch(() => ({ works: [] })),
          discoveryApi.newest(1, 12).catch(() => ({ works: [] })),
        ]);

        // Transform works to carousel format
        const transformWork = (w) => ({
          id: w._id,
          title: w.title || "Untitled",
          author: w.authorName || w.authorUsername || "Unknown Author",
          cover: w.coverImageUrl || defaultCover,
        });

        const forYouWorks = (forYouData.works || []).map(transformWork);
        const trendingWorks = (trendingData.works || []).map(transformWork);
        const featuredWorks = (featuredData.works || []).map(transformWork);
        const newestWorks = (newestData.works || []).map(transformWork);

        // Track if we have personalized recommendations
        setHasPersonalized(forYouData.personalized === true && forYouWorks.length > 0);

        // Deduplicate: remove works that appear in earlier sections
        // Convert IDs to strings for proper Set comparison
        const forYouIds = new Set(forYouWorks.map((w) => String(w.id)));
        const trendingIds = new Set(trendingWorks.map((w) => String(w.id)));
        const featuredIds = new Set(featuredWorks.map((w) => String(w.id)));

        // Trending excludes For You
        const dedupedTrending = trendingWorks.filter((w) => !forYouIds.has(String(w.id)));

        // Featured excludes For You and trending
        const usedIdsForFeatured = new Set([...forYouIds, ...trendingIds]);
        const dedupedFeatured = featuredWorks.filter((w) => !usedIdsForFeatured.has(String(w.id)));

        // Newest excludes all above
        const usedIds = new Set([...forYouIds, ...trendingIds, ...featuredIds]);
        const dedupedNewest = newestWorks.filter((w) => !usedIds.has(String(w.id)));

        setForYou(forYouWorks);
        setTrending(dedupedTrending);
        setFeatured(dedupedFeatured);
        setNewest(dedupedNewest);
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

  // Show placeholder message if no works exist yet
  const hasContent = forYou.length > 0 || trending.length > 0 || featured.length > 0 || newest.length > 0;

  if (!hasContent) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h2>Welcome to Sable</h2>
        <p>No published works yet. Be the first to publish something!</p>
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
      {forYou.length > 0 && hasPersonalized && (
        <WorkCarousel
          title="For You"
          subtitle="Personalized picks based on your interests"
          items={forYou}
          ariaLabel="Personalized recommendations"
          titleIcon={homeIcon}
          onItemClick={openWork}
        />
      )}

      {trending.length > 0 && (
        <WorkCarousel
          title="Trending"
          subtitle="Popular across Sable this week"
          items={trending}
          ariaLabel="Trending works"
          titleIcon={homeIcon}
          onItemClick={openWork}
        />
      )}

      {featured.length > 0 && (
        <WorkCarousel
          title="Featured"
          subtitle="Curated picks from the Sable team"
          items={featured}
          ariaLabel="Featured works"
          titleIcon={homeIcon}
          onItemClick={openWork}
        />
      )}

      {newest.length > 0 && (
        <WorkCarousel
          title="New & Noteworthy"
          subtitle="Fresh stories just published"
          items={newest}
          ariaLabel="New works"
          titleIcon={homeIcon}
          onItemClick={openWork}
        />
      )}
    </div>
  );
}
