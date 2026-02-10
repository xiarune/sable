import React from "react";
import { useNavigate } from "react-router-dom";
import "./Profile.css";
import { authApi, worksApi, draftsApi } from "../api";

import profileImg from "../assets/images/profile_picture.png";

function Stat({ label, value }) {
  return (
    <div className="pf-stat">
      <div className="pf-statValue">{value}</div>
      <div className="pf-statLabel">{label}</div>
    </div>
  );
}

function NavItem({ active, children, onClick }) {
  return (
    <button
      type="button"
      className={`pf-navItem${active ? " pf-navItem--active" : ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ActionCard({ icon, title, desc, onClick }) {
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
        &rarr;
      </div>
    </button>
  );
}

export default function Profile({ username = "guest" }) {
  const navigate = useNavigate();

  const [active, setActive] = React.useState("Overview");
  const [user, setUser] = React.useState(null);
  const [works, setWorks] = React.useState([]);
  const [drafts, setDrafts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadData() {
      try {
        const [meData, worksData, draftsData] = await Promise.all([
          authApi.me(),
          worksApi.mine().catch(() => ({ works: [] })),
          draftsApi.list().catch(() => ({ drafts: [] })),
        ]);

        setUser(meData.user);
        setWorks(worksData.works || []);
        setDrafts(draftsData.drafts || []);
      } catch (err) {
        console.error("Failed to load profile data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const effectiveUsername = user?.username || username || "guest";
  const displayName = user?.displayName || effectiveUsername;
  const handle = `@${effectiveUsername}`;
  const avatarUrl = user?.avatarUrl || profileImg;
  const stats = user?.stats || { followersCount: 0, followingCount: 0, worksCount: 0 };

  function goToWorksPage() {
    navigate("/works");
  }

  function goToDraftsPage() {
    navigate("/drafts");
  }

  function openWorkView(workId) {
    navigate(`/works/${encodeURIComponent(workId)}`);
  }

  function openWorkEditor(workId) {
    navigate(`/works/edit/${encodeURIComponent(workId)}`);
  }

  function openDraftEditor(draftId) {
    navigate(`/drafts/edit/${encodeURIComponent(draftId)}`);
  }

  const worksCount = works.length;
  const draftsCount = drafts.length;

  if (loading) {
    return (
      <div className="pf">
        <div className="pf-shell">
          <div style={{ padding: 40, textAlign: "center" }}>Loading profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pf">
      <div className="pf-shell">
        {/* Hero */}
        <section className="pf-hero" aria-label="Profile header">
          <div className="pf-heroTop">
            <div className="pf-id">
              <div className="pf-avatarWrap" aria-label="Profile picture">
                <img className="pf-avatar" src={avatarUrl} alt={`${displayName} profile`} />
                <div className="pf-avatarFallback" aria-hidden="true">
                  {displayName.slice(0, 1).toUpperCase()}
                </div>
              </div>

              <div className="pf-idText">
                <h1 className="pf-name">{displayName}</h1>
                <div className="pf-subRow">
                  <span className="pf-handle">{handle}</span>
                  {user?.bio && (
                    <>
                      <span className="pf-dot">&bull;</span>
                      <span className="pf-meta">{user.bio}</span>
                    </>
                  )}
                  <span className="pf-badge">Logged In</span>
                </div>

                <div className="pf-metaRow">
                  <span className="pf-meta">Works: {worksCount}</span>
                  <span className="pf-dot">&bull;</span>
                  <span className="pf-meta">Drafts: {draftsCount}</span>
                  <span className="pf-dot">&bull;</span>
                  <span className="pf-meta">Followers: {stats.followersCount}</span>
                </div>
              </div>
            </div>

            <div className="pf-cta">
              <button type="button" className="pf-btn pf-btn--primary" onClick={() => navigate("/new-draft")}>
                New Draft
              </button>
              <button type="button" className="pf-btn" onClick={() => navigate("/settings")}>
                Settings
              </button>
            </div>
          </div>

          <div className="pf-stats" aria-label="Profile stats">
            <Stat label="Published Works" value={worksCount} />
            <Stat label="Drafts" value={draftsCount} />
            <Stat label="Followers" value={stats.followersCount} />
            <Stat label="Following" value={stats.followingCount} />
          </div>
        </section>

        {/* Grid */}
        <div className="pf-grid">
          {/* Left nav */}
          <aside className="pf-navCard" aria-label="Profile navigation">
            <div className="pf-navTitle">Profile</div>

            <div className="pf-navList">
              <NavItem active={active === "Overview"} onClick={() => setActive("Overview")}>
                Overview
              </NavItem>
              <NavItem active={active === "Works"} onClick={() => setActive("Works")}>
                Works ({worksCount})
              </NavItem>
              <NavItem active={active === "Drafts"} onClick={() => setActive("Drafts")}>
                Drafts ({draftsCount})
              </NavItem>
            </div>

            <div className="pf-navDivider" />

            <button type="button" className="pf-navLink" onClick={goToWorksPage}>
              Go to Works Page
            </button>
            <button type="button" className="pf-navLink" onClick={goToDraftsPage}>
              Go to Drafts Page
            </button>
            <button type="button" className="pf-navLink" onClick={() => navigate("/settings")}>
              Go to Settings
            </button>
          </aside>

          {/* Main */}
          <section className="pf-main" aria-label="Profile content">
            {active === "Overview" && (
              <>
                <div className="pf-card">
                  <div className="pf-cardHead">
                    <div className="pf-cardTitle">Quick actions</div>
                    <div className="pf-cardRight">
                      <span className="pf-softMeta">Shortcuts</span>
                    </div>
                  </div>

                  <div className="pf-cardBody">
                    <div className="pf-actionsGrid">
                      <ActionCard
                        icon="+"
                        title="Write a new draft"
                        desc="Start something fresh in the editor."
                        onClick={() => navigate("/new-draft")}
                      />
                      <ActionCard
                        icon="*"
                        title="View your works"
                        desc="Browse your published library."
                        onClick={goToWorksPage}
                      />
                      <ActionCard
                        icon="#"
                        title="Edit drafts"
                        desc="Jump back into something unfinished."
                        onClick={goToDraftsPage}
                      />
                      <ActionCard
                        icon="?"
                        title="Search"
                        desc="Find works, tags, or keywords."
                        onClick={() => navigate("/search")}
                      />
                    </div>

                    <div className="pf-row" aria-label="Overview highlights">
                      <div className="pf-mini">
                        <div className="pf-miniTitle">Latest work</div>
                        <div className="pf-miniMeta">
                          {worksCount > 0
                            ? works[0]?.title || "Untitled"
                            : "No published works yet."}
                        </div>
                      </div>

                      <div className="pf-mini">
                        <div className="pf-miniTitle">Latest draft</div>
                        <div className="pf-miniMeta">
                          {draftsCount > 0
                            ? drafts[0]?.title || "Untitled"
                            : "No drafts yet."}
                        </div>
                      </div>

                      <div className="pf-mini">
                        <div className="pf-miniTitle">Member since</div>
                        <div className="pf-miniMeta">
                          {user?.createdAt
                            ? new Date(user.createdAt).toLocaleDateString()
                            : "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pf-card">
                  <div className="pf-cardHead">
                    <div className="pf-cardTitle">Library</div>
                    <div className="pf-cardRight">
                      <button type="button" className="pf-linkBtn" onClick={() => setActive("Works")}>
                        View works
                      </button>
                      <button type="button" className="pf-linkBtn" onClick={() => setActive("Drafts")}>
                        View drafts
                      </button>
                    </div>
                  </div>

                  <div className="pf-cardBody">
                    <div className="pf-library" aria-label="Library stats">
                      <div className="pf-libraryItem">
                        <div className="pf-libraryLabel">Published works</div>
                        <div className="pf-libraryValue">{worksCount}</div>
                      </div>
                      <div className="pf-libraryItem">
                        <div className="pf-libraryLabel">Drafts</div>
                        <div className="pf-libraryValue">{draftsCount}</div>
                      </div>
                      <div className="pf-libraryItem">
                        <div className="pf-libraryLabel">Followers</div>
                        <div className="pf-libraryValue">{stats.followersCount}</div>
                      </div>
                      <div className="pf-libraryItem">
                        <div className="pf-libraryLabel">Following</div>
                        <div className="pf-libraryValue">{stats.followingCount}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {active === "Works" && (
              <div className="pf-card">
                <div className="pf-cardHead">
                  <div className="pf-cardTitle">Published works</div>
                  <div className="pf-cardRight">
                    <button type="button" className="pf-linkBtn" onClick={goToWorksPage}>
                      Open Works
                    </button>
                  </div>
                </div>

                <div className="pf-cardBody">
                  {worksCount > 0 ? (
                    <div className="pf-list" aria-label="Works list">
                      {works.slice(0, 10).map((w) => (
                        <div key={w._id} className="pf-listRow">
                          <div>
                            <div className="pf-listTitle">{w.title || "Untitled"}</div>
                            <div className="pf-listMeta">
                              {w.genre || "No genre"} &bull; {w.stats?.viewCount || 0} views &bull;{" "}
                              {new Date(w.publishedAt || w.createdAt).toLocaleDateString()}
                            </div>
                          </div>

                          <div className="pf-cardRight">
                            <button type="button" className="pf-linkBtn" onClick={() => openWorkView(w._id)}>
                              View
                            </button>
                            <button type="button" className="pf-linkBtn" onClick={() => openWorkEditor(w._id)}>
                              Edit
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="pf-softMeta">No published works yet.</div>
                  )}
                </div>
              </div>
            )}

            {active === "Drafts" && (
              <div className="pf-card">
                <div className="pf-cardHead">
                  <div className="pf-cardTitle">Drafts</div>
                  <div className="pf-cardRight">
                    <button type="button" className="pf-linkBtn" onClick={goToDraftsPage}>
                      Open Drafts
                    </button>
                  </div>
                </div>

                <div className="pf-cardBody">
                  {draftsCount > 0 ? (
                    <div className="pf-list" aria-label="Drafts list">
                      {drafts.slice(0, 10).map((d) => (
                        <div key={d._id} className="pf-listRow">
                          <div>
                            <div className="pf-listTitle">{d.title || "Untitled"}</div>
                            <div className="pf-listMeta">
                              Last updated: {new Date(d.updatedAt || d.createdAt).toLocaleDateString()}
                            </div>
                          </div>

                          <div className="pf-cardRight">
                            <button type="button" className="pf-linkBtn" onClick={() => openDraftEditor(d._id)}>
                              Edit
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="pf-softMeta">No drafts yet.</div>
                  )}

                  <div className="pf-actionRow">
                    <button type="button" className="pf-btn pf-btn--primary" onClick={() => navigate("/new-draft")}>
                      Create New Draft
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
