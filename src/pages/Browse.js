// Browse.js
import React from "react";
import WorkCarousel from "../components/WorkCarousel";
import homeIcon from "../assets/images/home_icon.png";
import { works } from "../data/libraryWorks";

export default function Browse() {
  // Front-end placeholder “site” sections (swap for API later)
  const TRENDING = works.slice(0, 7);
  const FEATURED = works.slice(2, 8);
  const NEW_AND_NOTEWORTHY = works.slice(4, 10);

  return (
    <div>
      <WorkCarousel
        title="Trending"
        subtitle="What readers are binging right now"
        items={TRENDING}
        ariaLabel="Trending works"
        titleIcon={homeIcon}
        autoScroll
      />

      <WorkCarousel
        title="Featured"
        subtitle="Curated picks from the front page"
        items={FEATURED}
        ariaLabel="Featured works"
        titleIcon={homeIcon}
        autoScroll
      />

      <WorkCarousel
        title="New & Noteworthy"
        subtitle="Fresh works worth a look"
        items={NEW_AND_NOTEWORTHY}
        ariaLabel="New and noteworthy works"
        titleIcon={homeIcon}
        autoScroll
      />
    </div>
  );
}
