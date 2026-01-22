import React from "react";
import "./WorkCarousel.css";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function WorkCarousel({
  title,
  items = [],
  subtitle,
  onItemClick,
  ariaLabel,
}) {
  const scrollerRef = React.useRef(null);

  function scrollByCards(direction) {
    const el = scrollerRef.current;
    if (!el) return;

    // scroll roughly 3 cards at a time (responsive)
    const card = el.querySelector(".wc-card");
    const cardWidth = card ? card.getBoundingClientRect().width : 240;
    const gap = 18;
    const amount = (cardWidth + gap) * 3 * direction;

    el.scrollBy({ left: amount, behavior: "smooth" });
  }

  function handleKeyDown(e) {
    if (e.key === "ArrowLeft") scrollByCards(-1);
    if (e.key === "ArrowRight") scrollByCards(1);
  }

  return (
    <section className="wc" aria-label={ariaLabel || title}>
      <div className="wc-head">
        <h2 className="wc-title">{title}</h2>
        <div className="wc-ornament" aria-hidden="true" />
        {subtitle ? <div className="wc-subtitle">{subtitle}</div> : null}
      </div>

      <div className="wc-row">
        <button
          type="button"
          className="wc-arrow wc-arrow--left"
          onClick={() => scrollByCards(-1)}
          aria-label="Scroll left"
          title="Scroll left"
        >
          ‹
        </button>

        <div
          className="wc-track"
          ref={scrollerRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          role="region"
          aria-label={`${title} carousel`}
        >
          {items.map((w, idx) => {
            const safeTitle = w.title || `Work ${idx + 1}`;
            const safeAuthor = w.author || "Author";
            const accent = clamp(Number(w.accent ?? (idx % 6)), 0, 5);

            return (
              <button
                key={w.id || `${safeTitle}-${idx}`}
                type="button"
                className="wc-card"
                onClick={() => (onItemClick ? onItemClick(w) : null)}
                aria-label={`${safeTitle} by ${safeAuthor}`}
                title={`${safeTitle} — ${safeAuthor}`}
              >
                <div className={`wc-cover wc-cover--a${accent}`} aria-hidden="true">
                  <div className="wc-coverInner">
                    <div className="wc-coverTitle">{safeTitle}</div>
                    <div className="wc-coverAuthor">{safeAuthor}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="wc-arrow wc-arrow--right"
          onClick={() => scrollByCards(1)}
          aria-label="Scroll right"
          title="Scroll right"
        >
          ›
        </button>
      </div>
    </section>
  );
}
