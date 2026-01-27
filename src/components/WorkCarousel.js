import React from "react";
import "./WorkCarousel.css";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function ChevronLeftIcon() {
  return (
    <svg className="wc-arrowIcon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="wc-arrowIcon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export default function WorkCarousel({
  title,
  items = [],
  subtitle,
  onItemClick,
  ariaLabel,

  // Used by homepages
  titleIcon, // image src (string)
  autoScroll = false,
  autoScrollSpeed = 0.35,
}) {
  const scrollerRef = React.useRef(null);
  const pauseUntilRef = React.useRef(0);
  const [isHoverPaused, setIsHoverPaused] = React.useState(false);

  const loopItems = React.useMemo(() => {
    if (!autoScroll) return items;
    return [...items, ...items]; // doubled for seamless loop
  }, [items, autoScroll]);

  function temporarilyPause(ms = 1400) {
    pauseUntilRef.current = Date.now() + ms;
  }

  function scrollByCards(direction) {
    const el = scrollerRef.current;
    if (!el) return;

    // Pause auto-scroll so the click actually "sticks"
    if (autoScroll) temporarilyPause(1400);

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

  React.useEffect(() => {
    if (!autoScroll) return;

    const el = scrollerRef.current;
    if (!el) return;

    let rafId = 0;
    let last = performance.now();

    const tick = (t) => {
      const dt = t - last;
      last = t;

      const now = Date.now();
      const isTemporarilyPaused = now < pauseUntilRef.current;

      if (!isHoverPaused && !isTemporarilyPaused) {
        el.scrollLeft += autoScrollSpeed * (dt / 16);

        // loop back at halfway point (because items are doubled)
        const half = el.scrollWidth / 2;
        if (half > 0 && el.scrollLeft >= half) {
          el.scrollLeft -= half;
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [autoScroll, autoScrollSpeed, isHoverPaused, loopItems.length]);

  return (
    <section className="wc" aria-label={ariaLabel || title}>
      <div className="wc-head">
        <h2 className="wc-title">{title}</h2>

        {titleIcon ? (
          <img className="wc-titleIcon" src={titleIcon} alt="" aria-hidden="true" />
        ) : (
          <div className="wc-ornament" aria-hidden="true" />
        )}

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
          <ChevronLeftIcon />
        </button>

        <div
          className="wc-track"
          ref={scrollerRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onMouseEnter={() => setIsHoverPaused(true)}
          onMouseLeave={() => setIsHoverPaused(false)}
          onFocus={() => setIsHoverPaused(true)}
          onBlur={() => setIsHoverPaused(false)}
          role="region"
          aria-label={`${title} carousel`}
        >
          {loopItems.map((w, idx) => {
            const safeTitle = w.title || `Work ${idx + 1}`;
            const safeAuthor = w.author || "Author";
            const accent = clamp(Number(w.accent ?? (idx % 6)), 0, 5);
            const hasCover = Boolean(w.cover);

            return (
              <button
                key={w.id ? `${w.id}-${idx}` : `${safeTitle}-${idx}`}
                type="button"
                className="wc-card"
                onClick={() => (onItemClick ? onItemClick(w) : null)}
                aria-label={`${safeTitle} by ${safeAuthor}`}
                title={`${safeTitle} — ${safeAuthor}`}
              >
                <div
                  className={`wc-cover wc-cover--a${accent} ${hasCover ? "wc-cover--image" : ""}`}
                  aria-hidden="true"
                >
                  {hasCover ? (
                    <img className="wc-coverImage" src={w.cover} alt="" aria-hidden="true" />
                  ) : (
                    <div className="wc-coverInner">
                      <div className="wc-coverTitle">{safeTitle}</div>
                      <div className="wc-coverAuthor">{safeAuthor}</div>
                    </div>
                  )}
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
          <ChevronRightIcon />
        </button>
      </div>
    </section>
  );
}


