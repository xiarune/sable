import React from "react";
import { useNavigate } from "react-router-dom";
import WorkCarousel from "../components/WorkCarousel";
import homeIcon from "../assets/images/home_icon.png";

const FOR_YOU = [
  { id: "fy1", title: "For You", author: "Based on your likes" },
  { id: "fy2", title: "For You", author: "Based on your likes" },
  { id: "fy3", title: "For You", author: "Based on your likes" },
  { id: "fy4", title: "For You", author: "Based on your likes" },
  { id: "fy5", title: "For You", author: "Based on your likes" },
  { id: "fy6", title: "For You", author: "Based on your likes" },
];

const POPULAR_WORKS = [
  { id: "p1", title: "Space", author: "Olivia Wilson" },
  { id: "p2", title: "The Girl of Ink & Stars", author: "Kiran Millwood Hargrave" },
  { id: "p3", title: "Timeless", author: "Alexandra Emerson" },
  { id: "p4", title: "Prince of Slytherin", author: "The Sinister Man" },
  { id: "p5", title: "The Ocean’s Daughters", author: "Author Name" },
  { id: "p6", title: "Title", author: "Author" },
];

const FEATURED_WORKS = [
  { id: "f1", title: "Featured Work", author: "Author" },
  { id: "f2", title: "Featured Work", author: "Author" },
  { id: "f3", title: "Featured Work", author: "Author" },
  { id: "f4", title: "Featured Work", author: "Author" },
  { id: "f5", title: "Featured Work", author: "Author" },
];

export default function HomeLoggedIn() {
  const navigate = useNavigate();

  function openWork(item) {
    if (!item?.id) return;
    navigate(`/works/${encodeURIComponent(item.id)}`);
  }

  return (
    <div>
      <WorkCarousel
        title="For You"
        subtitle="Recommendations based on your reading & bookmarks"
        items={FOR_YOU}
        ariaLabel="For you works"
        titleIcon={homeIcon}
        onItemClick={openWork}
      />

      <WorkCarousel
        title="Popular"
        subtitle="Trending across Sable this week"
        items={POPULAR_WORKS}
        ariaLabel="Popular works"
        titleIcon={homeIcon}
        onItemClick={openWork}
      />

      <WorkCarousel
        title="Featured"
        subtitle="Curated picks from the front page"
        items={FEATURED_WORKS}
        ariaLabel="Featured works"
        titleIcon={homeIcon}
        onItemClick={openWork}
      />
    </div>
  );
}




