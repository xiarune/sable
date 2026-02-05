import React from "react";
import { useNavigate } from "react-router-dom";
import "./Profile.css";

import profileImg from "../assets/images/profile_picture.png";

const WORKS_KEY = "sable_published_v1";
const DRAFTS_KEY = "sable_drafts_v1";

// Mock data for audio library
const MOCK_AUDIOS = [
  { id: "a1", title: "Chapter 1 Reading", duration: "12:34", plays: 567, createdAt: "2024-01-15" },
  { id: "a2", title: "Character Voice: Luna", duration: "3:45", plays: 234, createdAt: "2024-01-10" },
  { id: "a3", title: "Ambient Writing Music", duration: "45:00", plays: 1289, createdAt: "2024-01-05" },
  { id: "a4", title: "Story Narration - Part 1", duration: "18:22", plays: 456, createdAt: "2024-01-01" },
];

// Mock data for skins
const MOCK_SKINS = [
  { id: "s1", name: "Dark Academia", downloads: 234, likes: 89, status: "Published" },
  { id: "s2", name: "Cottagecore Dreams", downloads: 156, likes: 67, status: "Published" },
  { id: "s3", name: "Midnight Blue", downloads: 312, likes: 124, status: "Draft" },
];

// Mock data for donations
const MOCK_DONATIONS_GIVEN = [
  { id: "d1", to: "jane.doe", amount: "$5.00", date: "2024-01-20", note: "Love your work!" },
  { id: "d2", to: "amira.salem", amount: "$10.00", date: "2024-01-15", note: "Keep creating!" },
];

const MOCK_DONATIONS_RECEIVED = [
  { id: "r1", from: "hadassah", amount: "$15.00", date: "2024-01-22", note: "Your stories are amazing" },
  { id: "r2", from: "zoey", amount: "$5.00", date: "2024-01-18", note: "Thanks for the audio reads!" },
  { id: "r3", from: "michael", amount: "$20.00", date: "2024-01-10", note: "" },
];

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

function getItemId(item, fallbackPrefix, index) {
  if (!item) return `${fallbackPrefix}-${index}`;
  if (typeof item === "string") return item;

  // Common shapes across mock data / future backend
  return (
    item.id ||
    item.workId ||
    item.draftId ||
    item._id ||
    item.slug ||
    item.title ||
    `${fallbackPrefix}-${index}`
  );
}

function getItemTitle(item, fallback) {
  if (!item) return fallback;
  if (typeof item === "string") return item;

  return item.title || item.name || item.label || fallback;
}

function getItemMeta(item, fallback) {
  if (!item || typeof item === "string") return fallback;

  // Optional nice-to-haves if your stored objects include them
  const bits = [];
  if (item.genre) bits.push(item.genre);
  if (item.fandom) bits.push(item.fandom);
  if (item.updatedAt) bits.push(`Updated ${item.updatedAt}`);
  if (item.createdAt && !item.updatedAt) bits.push(`Created ${item.createdAt}`);

  return bits.length ? bits.join(" • ") : fallback;
}

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
        →
      </div>
    </button>
  );
}

export default function Profile({ username = "john.doe" }) {
  const navigate = useNavigate();

  const [active, setActive] = React.useState("Overview"); // Overview | Works | Drafts | Skins | Audio | Donations
  const [works, setWorks] = React.useState([]);
  const [drafts, setDrafts] = React.useState([]);

  React.useEffect(() => {
    setWorks(loadArray(WORKS_KEY));
    setDrafts(loadArray(DRAFTS_KEY));
  }, []);

  const effectiveUsername = (username || "john.doe").trim();
  const handle = `@${effectiveUsername.replace(/\s+/g, ".").toLowerCase()}`;

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

  // Counts (works/drafts could be strings or objects)
  const worksCount = Array.isArray(works) ? works.length : 0;
  const draftsCount = Array.isArray(drafts) ? drafts.length : 0;

  return (
    <div className="pf">
      <div className="pf-shell">
        {/* HERO */}
        <section className="pf-hero" aria-label="Profile header">
          <div className="pf-heroTop">
            <div className="pf-id">
              <div className="pf-avatarWrap" aria-label="Profile picture">
                <img className="pf-avatar" src={profileImg} alt={`${effectiveUsername} profile`} />
                <div className="pf-avatarFallback" aria-hidden="true">
                  {effectiveUsername.slice(0, 1).toUpperCase()}
                </div>
              </div>

              <div className="pf-idText">
                <h1 className="pf-name">{effectiveUsername}</h1>
                <div className="pf-subRow">
                  <span className="pf-handle">{handle}</span>
                  <span className="pf-dot">•</span>
                  <span className="pf-meta">Sable Reader & Writer</span>
                  <span className="pf-badge">Logged In</span>
                </div>

                <div className="pf-metaRow">
                  <span className="pf-meta">Works: {worksCount}</span>
                  <span className="pf-dot">•</span>
                  <span className="pf-meta">Drafts: {draftsCount}</span>
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
            <Stat label="Bookmarks" value="—" />
            <Stat label="Communities" value="—" />
          </div>
        </section>

        {/* GRID */}
        <div className="pf-grid">
          {/* LEFT NAV */}
          <aside className="pf-navCard" aria-label="Profile navigation">
            <div className="pf-navTitle">Profile</div>

            <div className="pf-navList">
              <NavItem active={active === "Overview"} onClick={() => setActive("Overview")}>
                Overview
              </NavItem>
              <NavItem active={active === "Works"} onClick={() => setActive("Works")}>
                Works
              </NavItem>
              <NavItem active={active === "Drafts"} onClick={() => setActive("Drafts")}>
                Drafts
              </NavItem>
              <NavItem active={active === "Skins"} onClick={() => setActive("Skins")}>
                Skins
              </NavItem>
              <NavItem active={active === "Audio"} onClick={() => setActive("Audio")}>
                Audio Library
              </NavItem>
              <NavItem active={active === "Donations"} onClick={() => setActive("Donations")}>
                Donations
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

          {/* MAIN */}
          <section className="pf-main" aria-label="Profile content">
            {active === "Overview" ? (
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
                        icon="✍️"
                        title="Write a new draft"
                        desc="Start something fresh in the editor."
                        onClick={() => navigate("/new-draft")}
                      />
                      <ActionCard
                        icon="📚"
                        title="View your works"
                        desc="Browse your published library."
                        onClick={goToWorksPage}
                      />
                      <ActionCard
                        icon="🗂️"
                        title="Edit drafts"
                        desc="Jump back into something unfinished."
                        onClick={goToDraftsPage}
                      />
                      <ActionCard
                        icon="🔎"
                        title="Search"
                        desc="Find works, tags, or keywords."
                        onClick={() => navigate("/search")}
                      />
                    </div>

                    <div className="pf-row" aria-label="Overview highlights">
                      <div className="pf-mini">
                        <div className="pf-miniTitle">Latest work</div>
                        <div className="pf-miniMeta">
                          {worksCount
                            ? getItemTitle(works[0], "Untitled")
                            : "No published works yet."}
                        </div>
                      </div>

                      <div className="pf-mini">
                        <div className="pf-miniTitle">Latest draft</div>
                        <div className="pf-miniMeta">
                          {draftsCount
                            ? getItemTitle(drafts[0], "Untitled")
                            : "No drafts yet."}
                        </div>
                      </div>

                      <div className="pf-mini">
                        <div className="pf-miniTitle">Status</div>
                        <div className="pf-miniMeta">Mock data mode (localStorage)</div>
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
                        <div className="pf-libraryLabel">Bookmarks</div>
                        <div className="pf-libraryValue">—</div>
                      </div>
                      <div className="pf-libraryItem">
                        <div className="pf-libraryLabel">Communities</div>
                        <div className="pf-libraryValue">—</div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : null}

            {active === "Works" ? (
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
                  {worksCount ? (
                    <div className="pf-list" aria-label="Works list">
                      {works.slice(0, 8).map((w, i) => {
                        const id = getItemId(w, "work", i);
                        const title = getItemTitle(w, `Work ${i + 1}`);
                        const meta = getItemMeta(w, "Published");

                        return (
                          <div key={id} className="pf-listRow">
                            <div>
                              <div className="pf-listTitle">{title}</div>
                              <div className="pf-listMeta">{meta}</div>
                            </div>

                            <div className="pf-cardRight">
                              <button type="button" className="pf-linkBtn" onClick={() => openWorkView(id)}>
                                View
                              </button>
                              <button type="button" className="pf-linkBtn" onClick={() => openWorkEditor(id)}>
                                Edit
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="pf-softMeta">No published works found yet.</div>
                  )}
                </div>
              </div>
            ) : null}

            {active === "Drafts" ? (
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
                  {draftsCount ? (
                    <div className="pf-list" aria-label="Drafts list">
                      {drafts.slice(0, 10).map((d, i) => {
                        const id = getItemId(d, "draft", i);
                        const title = getItemTitle(d, `Draft ${i + 1}`);
                        const meta = getItemMeta(d, "Unpublished");

                        return (
                          <div key={id} className="pf-listRow">
                            <div>
                              <div className="pf-listTitle">{title}</div>
                              <div className="pf-listMeta">{meta}</div>
                            </div>

                            <div className="pf-cardRight">
                              <button type="button" className="pf-linkBtn" onClick={() => openDraftEditor(id)}>
                                Edit
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="pf-softMeta">No drafts found yet.</div>
                  )}
                </div>
              </div>
            ) : null}

            {active === "Skins" ? (
              <div className="pf-card">
                <div className="pf-cardHead">
                  <div className="pf-cardTitle">Your Skins</div>
                  <div className="pf-cardRight">
                    <button type="button" className="pf-linkBtn" onClick={() => navigate("/settings")}>
                      Manage in Settings
                    </button>
                  </div>
                </div>

                <div className="pf-cardBody">
                  {MOCK_SKINS.length ? (
                    <div className="pf-list" aria-label="Skins list">
                      {MOCK_SKINS.map((skin) => (
                        <div key={skin.id} className="pf-listRow">
                          <div>
                            <div className="pf-listTitle">{skin.name}</div>
                            <div className="pf-listMeta">
                              {skin.downloads} downloads · {skin.likes} likes · {skin.status}
                            </div>
                          </div>

                          <div className="pf-cardRight">
                            <button type="button" className="pf-linkBtn" onClick={() => navigate("/settings")}>
                              Edit
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="pf-softMeta">No skins created yet.</div>
                  )}

                  <div className="pf-actionRow">
                    <button type="button" className="pf-btn pf-btn--primary" onClick={() => navigate("/settings")}>
                      Create New Skin
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {active === "Audio" ? (
              <div className="pf-card">
                <div className="pf-cardHead">
                  <div className="pf-cardTitle">Audio Library</div>
                  <div className="pf-cardRight">
                    <span className="pf-softMeta">{MOCK_AUDIOS.length} files</span>
                  </div>
                </div>

                <div className="pf-cardBody">
                  {MOCK_AUDIOS.length ? (
                    <div className="pf-list" aria-label="Audio files list">
                      {MOCK_AUDIOS.map((audio) => (
                        <div key={audio.id} className="pf-listRow">
                          <div>
                            <div className="pf-listTitle">{audio.title}</div>
                            <div className="pf-listMeta">
                              {audio.duration} · {audio.plays} plays · {audio.createdAt}
                            </div>
                          </div>

                          <div className="pf-cardRight">
                            <button type="button" className="pf-linkBtn">
                              ▶ Play
                            </button>
                            <button type="button" className="pf-linkBtn">
                              Edit
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="pf-softMeta">No audio files yet.</div>
                  )}

                  <div className="pf-actionRow">
                    <button type="button" className="pf-btn pf-btn--primary">
                      Upload Audio
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {active === "Donations" ? (
              <>
                <div className="pf-card">
                  <div className="pf-cardHead">
                    <div className="pf-cardTitle">Donations Received</div>
                    <div className="pf-cardRight">
                      <span className="pf-softMeta">
                        Total: ${MOCK_DONATIONS_RECEIVED.reduce((sum, d) => sum + parseFloat(d.amount.replace("$", "")), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="pf-cardBody">
                    {MOCK_DONATIONS_RECEIVED.length ? (
                      <div className="pf-list" aria-label="Donations received">
                        {MOCK_DONATIONS_RECEIVED.map((donation) => (
                          <div key={donation.id} className="pf-listRow">
                            <div>
                              <div className="pf-listTitle">
                                {donation.amount} from @{donation.from}
                              </div>
                              <div className="pf-listMeta">
                                {donation.date} {donation.note && `· "${donation.note}"`}
                              </div>
                            </div>

                            <div className="pf-cardRight">
                              <button type="button" className="pf-linkBtn" onClick={() => navigate(`/communities/${donation.from}`)}>
                                View Profile
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="pf-softMeta">No donations received yet.</div>
                    )}
                  </div>
                </div>

                <div className="pf-card">
                  <div className="pf-cardHead">
                    <div className="pf-cardTitle">Donations Given</div>
                    <div className="pf-cardRight">
                      <span className="pf-softMeta">
                        Total: ${MOCK_DONATIONS_GIVEN.reduce((sum, d) => sum + parseFloat(d.amount.replace("$", "")), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="pf-cardBody">
                    {MOCK_DONATIONS_GIVEN.length ? (
                      <div className="pf-list" aria-label="Donations given">
                        {MOCK_DONATIONS_GIVEN.map((donation) => (
                          <div key={donation.id} className="pf-listRow">
                            <div>
                              <div className="pf-listTitle">
                                {donation.amount} to @{donation.to}
                              </div>
                              <div className="pf-listMeta">
                                {donation.date} {donation.note && `· "${donation.note}"`}
                              </div>
                            </div>

                            <div className="pf-cardRight">
                              <button type="button" className="pf-linkBtn" onClick={() => navigate(`/communities/${donation.to}`)}>
                                View Profile
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="pf-softMeta">No donations given yet.</div>
                    )}

                    <div className="pf-actionRow">
                      <button type="button" className="pf-btn pf-btn--primary" onClick={() => navigate("/support")}>
                        Support a Creator
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}













