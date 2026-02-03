// HomeLoggedOut.js
import React from "react";
import { useNavigate } from "react-router-dom";
import WorkCarousel from "../components/WorkCarousel";
import homeIcon from "../assets/images/home_icon.png";

const POPULAR_WORKS = [
  { id: "p1", title: "Space", author: "Olivia Wilson" },
  { id: "p2", title: "The Girl of Ink & Stars", author: "Kiran Millwood Hargrave" },
  { id: "p3", title: "Timeless", author: "Alexandra Emerson" },
  { id: "p4", title: "Prince of Slytherin", author: "The Sinister Man" },
  { id: "p5", title: "The Ocean’s Daughters", author: "Author Name" },
  { id: "p6", title: "Title", author: "Author" },
  { id: "p7", title: "Title", author: "Author" },
];

const FEATURED_WORKS = [
  { id: "f1", title: "Featured Work", author: "Author" },
  { id: "f2", title: "Featured Work", author: "Author" },
  { id: "f3", title: "Featured Work", author: "Author" },
  { id: "f4", title: "Featured Work", author: "Author" },
  { id: "f5", title: "Featured Work", author: "Author" },
  { id: "f6", title: "Featured Work", author: "Author" },
];

export default function HomeLoggedOut() {
  const navigate = useNavigate();

  function openWork(item) {
    if (!item?.id) return;
    navigate(`/works/${encodeURIComponent(item.id)}`);
  }

  return (
    <div>
      <WorkCarousel
        title="Popular"
        subtitle="Trending across Sable this week"
        items={POPULAR_WORKS}
        ariaLabel="Popular works"
        titleIcon={homeIcon}
        autoScroll
        onItemClick={openWork}
      />

      <WorkCarousel
        title="Featured"
        subtitle="Curated picks from the front page"
        items={FEATURED_WORKS}
        ariaLabel="Featured works"
        titleIcon={homeIcon}
        autoScroll
        onItemClick={openWork}
      />
    </div>
  );
}



