import React from "react";
import { useNavigate } from "react-router-dom";
import "./Profile.css";

import profileImg from "../assets/images/profile_picture.png";

const WORKS_KEY = "sable_published_v1";
const DRAFTS_KEY = "sable_drafts_v1";

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function loadArray(key) {
  const raw = localStorage.getItem(key);
  const parsed = safeParse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

function initialsFromUsername(u) {
  const s = String(u || "john.doe").trim();
  const parts = s.split(".").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (s[0] || "J").toUpperCase();
}

function prettyNameFromUsername(u) {
  const s = String(u || "john.doe").trim();
  const parts = s.split(".").filter(Boolean);
  if (parts.length >= 2) {
    const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
    return `${cap(parts[0])} ${cap(parts[1])}`;
  }
  return s.toUpperCase();
}

function Stat({ label, value }) {
  return (
    <div className="pf-stat" role="group" aria-label={`${label}: ${value}`}>
      <div className="pf-statValue">{value}</div>
      <div className="pf-statLabel">{label}</div>
    </div>
  );
}

function QuickAction({ icon, title, desc, onClick }) {
  return (
    <button type="button" className="pf-actionCard" onClick={onClick}>
      <div className="pf-actionIcon" aria-hidden="true">
        {icon}
      </div>
      <div className="pf-actionText">
        <div className="pf-actionTitle">{title}</div>
        <div className="pf-actionDesc">{desc}</div>
      </div>
      <div className="pf-actionChev" aria-hidden="true">
        →
      </div>
    </button>
  );
}

function RowCard({ title, children, right }) {
  return (
    <section className="pf-card" aria-label={title}>
      <div className="pf-cardHead">
        <div className="pf-cardTitle">{title}</div>
        {right ? <div className="pf-cardRight">{right}</div> : null}
      </div>
      <div className="pf-cardBody">{children}</div>
    </section>
  );
}

export default function Profile({ username = "john.doe" }) {
  const navigate = useNavigate();

  const displayUsername = String(username || "john.doe").trim();
  const prettyName = prettyNameFromUsername(displayUsername);

  const [active, setActive] = React.useState("Overview"); // Overview | Works | Drafts
  const [works, setWorks] = React.useState([]);
  const [drafts, setDrafts] = React.useState([]);

  // Front-end placeholders
  const email = `${displayUsername}@sable.app`;
  const membership = "Reader + Creator";
  const joined = "Joined Jan 2026";

  React.useEffect(() => {
    setWorks(loadArray(WORKS_KEY));
    setDrafts(loadArray(DRAFTS_KEY));
  }, []);

  function goToDraftsPage() {
    navigate("/drafts");
  }

  function goToWorksPage() {
    navigate("/works");
  }

  function openWorkEditor(workId) {
    navigate(`/works/edit/${encodeURIComponent(workId)}`);
  }

  function openDraftEditor(draftId) {
    // Your NewDraft.js now redirects correctly, but going direct is cleaner.
    navigate(`/drafts/edit/${encodeURIComponent(draftId)}`);
  }

  const worksPreview = works.slice(0, 2);
  const draftsPreview = drafts.slice(0, 2);

  return (
    <div className="pf">
      <div className="pf-shell">
        {/* HEADER */}
        <header className="pf-hero" aria-label="Profile overview header">
          <div className="pf-heroTop">
            <div className="pf-id">
              <div className="pf-avatarWrap" aria-hidden="true">
                <img className="pf-avatar" src={profileImg} alt="" aria-hidden="true" />
                <div className="pf-avatarFallback" aria-hidden="true">
                  {initialsFromUsername(displayUsername)}
                </div>
              </div>

              <div className="pf-idText">
                <h1 className="pf-name">{prettyName}</h1>

                <div className="pf-subRow">
                  <span className="pf-handle">@{displayUsername}</span>
                  <span className="pf-dot" aria-hidden="true">
                    •
                  </span>
                  <span className="pf-meta">{email}</span>
                </div>

                <div className="pf-metaRow">
                  <span className="pf-badge">{membership}</span>
                  <span className="pf-meta">{joined}</span>
                </div>
              </div>
            </div>

            {/* ✅ IMPORTANT: pf-cta stays a sibling of pf-id (CSS expects this) */}
            <div className="pf-cta">
              <button
                type="button"
                className="pf-btn pf-btn--primary"
                onClick={() => navigate("/new-draft")}
              >
                New Draft
              </button>
              <button type="button" className="pf-btn" onClick={() => navigate("/settings")}>
                Settings
              </button>
            </div>
          </div>

          <div className="pf-stats" aria-label="Account stats">
            <Stat label="Published Works" value={String(works.length)} />
            <Stat label="Drafts" value={String(drafts.length)} />
            <Stat label="Bookmarks" value="18" />
            <Stat label="Followers" value="8.7k" />
          </div>
        </header>

        <div className="pf-grid">
          {/* LEFT NAV */}
          <aside className="pf-left" aria-label="Profile navigation">
            <div className="pf-navCard">
              <div className="pf-navTitle">Your Dashboard</div>

              <div className="pf-navList" role="tablist" aria-label="Profile sections">
                {["Overview", "Works", "Drafts"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={active === t ? "pf-navItem pf-navItem--active" : "pf-navItem"}
                    onClick={() => setActive(t)}
                    role="tab"
                    aria-selected={active === t ? "true" : "false"}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="pf-navDivider" aria-hidden="true" />

              <button type="button" className="pf-navLink" onClick={() => navigate("/communities/me")}>
                Your Community Page →
              </button>

              {/* ✅ Added: skins access (routes to settings where skins live) */}
              <button type="button" className="pf-navLink" onClick={() => navigate("/settings")}>
                Your Skins →
              </button>

              {/* ✅ Removed: duplicate "Your Works" and "Your Drafts" links (per your request) */}

              <button type="button" className="pf-navLink" onClick={() => navigate("/communities")}>
                Communities →
              </button>
            </div>
          </aside>

          {/* MAIN */}
          <main className="pf-main" aria-label="Profile content">
            {active === "Overview" ? (
              <>
                <div className="pf-actionsGrid" aria-label="Quick actions">
                  <QuickAction
                    icon="✍︎"
                    title="Continue writing"
                    desc="Jump back into your latest draft."
                    onClick={goToDraftsPage}
                  />
                  <QuickAction
                    icon="🗣"
                    title="Go to Communities"
                    desc="Post updates, reply, and follow creators."
                    onClick={() => navigate("/communities")}
                  />
                  <QuickAction
                    icon="⚙︎"
                    title="Account settings"
                    desc="Privacy, skins, personal info."
                    onClick={() => navigate("/settings")}
                  />
                  <QuickAction
                    icon="📌"
                    title="Bookmarks"
                    desc="Your saved library and reading list."
                    onClick={() => navigate("/bookmarks")}
                  />
                </div>

                <RowCard
                  title="Recently Viewed"
                  right={
                    <button className="pf-linkBtn" type="button" onClick={() => navigate("/browse")}>
                      Browse
                    </button>
                  }
                >
                  <div className="pf-row">
                    {[
                      { title: "Night in The Woods", meta: "last opened • 2h ago" },
                      { title: "Rain on Glass — Audio", meta: "last opened • yesterday" },
                      { title: "Parchment Noir Skin", meta: "last opened • 4d ago" },
                    ].map((x) => (
                      <div key={x.title} className="pf-mini">
                        <div className="pf-miniTitle">{x.title}</div>
                        <div className="pf-miniMeta">{x.meta}</div>
                      </div>
                    ))}
                  </div>
                </RowCard>
              </>
            ) : null}

            {active === "Works" ? (
              <RowCard
                title="Published Works"
                right={
                  <div>
                    <button className="pf-linkBtn" type="button" onClick={goToWorksPage}>
                      View all
                    </button>
                    <button className="pf-linkBtn" type="button" onClick={() => navigate("/new-draft")}>
                      New
                    </button>
                  </div>
                }
              >
                <div className="pf-covers">
                  {worksPreview.length === 0 ? (
                    <div className="pf-coverCard">
                      <div className="pf-cover" />
                      <div className="pf-coverTitle">No published works yet</div>
                      <div className="pf-coverMeta">Post a draft to publish</div>
                      <button type="button" className="pf-linkBtn" onClick={() => navigate("/new-draft")}>
                        Start a draft
                      </button>
                    </div>
                  ) : (
                    worksPreview.map((w) => (
                      <div key={String(w.id)} className="pf-coverCard">
                        <div className="pf-cover" />
                        <div className="pf-coverTitle">{w.title || "Untitled"}</div>
                        <div className="pf-coverMeta">published</div>
                        <button type="button" className="pf-linkBtn" onClick={() => openWorkEditor(w.id)}>
                          Edit
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </RowCard>
            ) : null}

            {active === "Drafts" ? (
              <RowCard
                title="Drafts"
                right={
                  <div>
                    <button className="pf-linkBtn" type="button" onClick={goToDraftsPage}>
                      View all
                    </button>
                    <button className="pf-linkBtn" type="button" onClick={() => navigate("/new-draft")}>
                      New
                    </button>
                  </div>
                }
              >
                <div className="pf-covers">
                  {draftsPreview.length === 0 ? (
                    <div className="pf-coverCard">
                      <div className="pf-cover" />
                      <div className="pf-coverTitle">No drafts yet</div>
                      <div className="pf-coverMeta">Start writing</div>
                      <button type="button" className="pf-linkBtn" onClick={() => navigate("/new-draft")}>
                        New Draft
                      </button>
                    </div>
                  ) : (
                    draftsPreview.map((d) => (
                      <div key={String(d.id)} className="pf-coverCard">
                        <div className="pf-cover" />
                        <div className="pf-coverTitle">{d.title || "Untitled"}</div>
                        <div className="pf-coverMeta">unpublished</div>
                        <button type="button" className="pf-linkBtn" onClick={() => openDraftEditor(d.id)}>
                          Edit
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </RowCard>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}











