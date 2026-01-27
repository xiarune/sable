import React from "react";
import { useNavigate } from "react-router-dom";
import "./Settings.css";

import profileImg from "../assets/images/profile_picture.png";

export default function Settings({ username, onLogout }) {
  const navigate = useNavigate();
  const effectiveUsername = (username || "john.doe").trim();

  const [active, setActive] = React.useState("account"); // account | community | skins
  const [modal, setModal] = React.useState(""); // "" | "banner" | "avatar" | "widgets" | "logout"

  function goToCommunityEdit(extra = {}) {
    // YourCommunityPage auto-opens edit mode with ?edit=1 already
    navigate("/communities/me?edit=1", { state: extra });
  }

  function goToCommunityView() {
    navigate("/communities/me");
  }

  function closeModal() {
    setModal("");
  }

  function confirmLogout() {
    if (typeof onLogout === "function") onLogout();
    navigate("/", { replace: true });
  }

  return (
    <div className="st">
      <div className="st-shell">
        <div className="st-grid">
          {/* LEFT NAV */}
          <aside className="st-side" aria-label="Settings navigation">
            <button
              type="button"
              className={active === "account" ? "st-sideBtn is-active" : "st-sideBtn"}
              onClick={() => setActive("account")}
            >
              Account
            </button>

            <button
              type="button"
              className={active === "community" ? "st-sideBtn is-active" : "st-sideBtn"}
              onClick={() => setActive("community")}
            >
              Community{"\n"}Page
            </button>

            <button
              type="button"
              className={active === "skins" ? "st-sideBtn is-active" : "st-sideBtn"}
              onClick={() => setActive("skins")}
            >
              Skins
            </button>

            <button type="button" className="st-sideBtn" onClick={() => setModal("logout")}>
              Log{"\n"}Out
            </button>
          </aside>

          {/* CENTER */}
          <main className="st-main" aria-label="Settings content">
            {active === "account" && (
              <>
                <div className="st-titleRow">
                  <h1 className="st-title">Settings</h1>
                </div>

                <p className="st-subtitle">
                  Manage account preferences and shortcuts. (Front-end only for now.)
                </p>

                <section className="st-sectionCard" aria-label="Account actions">
                  <div className="st-cardTitleRow">
                    <div className="st-cardTitle">Account</div>
                    <div className="st-cardMeta">Quick actions</div>
                  </div>

                  <div className="st-actionGrid">
                    <div className="st-ctaRow">
                      <button type="button" className="st-actionBtn" onClick={() => navigate("/profile")}>
                        Open Profile
                      </button>

                      <button type="button" className="st-actionBtn" onClick={() => goToCommunityView()}>
                        View Community Page
                      </button>

                      <button type="button" className="st-actionBtn" onClick={() => goToCommunityEdit()}>
                        Edit Community Page
                      </button>
                    </div>
                  </div>
                </section>
              </>
            )}

            {active === "community" && (
              <>
                <div className="st-titleRow">
                  <h1 className="st-title">Community Page</h1>
                </div>

                <p className="st-subtitle">
                  Everything below should now be functional — each option either opens your community page in edit
                  mode or opens a placeholder modal for future uploads.
                </p>

                <section className="st-sectionCard" aria-label="Edit your community page">
                  <div className="st-cardTitleRow">
                    <div className="st-cardTitle">Edit your community page</div>
                    <div className="st-cardMeta">Routes to /communities/me?edit=1</div>
                  </div>

                  <div className="st-pillStack">
                    <button type="button" className="st-pillBtn" onClick={() => goToCommunityEdit()}>
                      Open Editor (Full Page)
                    </button>

                    <button type="button" className="st-pillBtn" onClick={() => setModal("banner")}>
                      Change Banner Image
                    </button>

                    <button type="button" className="st-pillBtn" onClick={() => setModal("avatar")}>
                      Change Profile Picture
                    </button>

                    <button
                      type="button"
                      className="st-pillBtn"
                      onClick={() => {
                        // Opens the same editor, but we pass a "hint" you can use later
                        // (doesn't break anything even if unused)
                        goToCommunityEdit({ focus: "widgets" });
                      }}
                    >
                      Edit Widgets (Announcements / Donations / Recent Works / Chatroom)
                    </button>

                    <button
                      type="button"
                      className="st-pillBtn"
                      onClick={() => {
                        goToCommunityEdit({ focus: "visibility" });
                      }}
                    >
                      Edit Visibility (Public / Private / Following)
                    </button>

                    <button
                      type="button"
                      className="st-pillBtn"
                      onClick={() => {
                        goToCommunityEdit({ focus: "bio" });
                      }}
                    >
                      Edit Bio / Links / Name
                    </button>
                  </div>
                </section>

                <section className="st-sectionCard st-sectionCard--tight" aria-label="Shortcuts">
                  <div className="st-cardTitleRow" style={{ marginBottom: 10 }}>
                    <div className="st-cardTitle">Shortcuts</div>
                    <div className="st-cardMeta">Navigation</div>
                  </div>

                  <div className="st-ctaRow">
                    <button type="button" className="st-actionBtn" onClick={() => navigate("/works")}>
                      Your Works
                    </button>
                    <button type="button" className="st-actionBtn" onClick={() => navigate("/drafts")}>
                      Existing Drafts
                    </button>
                    <button type="button" className="st-actionBtn" onClick={() => navigate("/new-draft")}>
                      New Draft
                    </button>
                  </div>
                </section>
              </>
            )}

            {active === "skins" && (
              <>
                <div className="st-titleRow">
                  <h1 className="st-title">Skins</h1>
                </div>

                <p className="st-subtitle">
                  UI-only placeholders for now. This page is already styled by your CSS — this just makes the buttons do
                  something predictable.
                </p>

                <section className="st-sectionCard" aria-label="Skins library">
                  <div className="st-cardTitleRow">
                    <div className="st-cardTitle">Your Skins</div>
                    <div className="st-cardMeta">Front-end placeholders</div>
                  </div>

                  <div className="st-ctaRow">
                    <button type="button" className="st-newSkinBtn" onClick={() => setModal("widgets")}>
                      <span className="st-newSkinIcon" aria-hidden="true">
                        ✦
                      </span>
                      Create New Skin (Soon)
                    </button>
                  </div>
                </section>
              </>
            )}
          </main>

          {/* RIGHT */}
          <aside className="st-right" aria-label="Profile summary">
            <div className="st-profileCard">
              <div className="st-profileTop">
                <div className="st-avatarWrap">
                  <img className="st-avatar" src={profileImg} alt="Profile" />
                  <button
                    type="button"
                    className="st-avatarEdit"
                    aria-label="Edit profile picture"
                    title="Edit profile picture"
                    onClick={() => setModal("avatar")}
                  >
                    ✎
                  </button>
                </div>

                <div className="st-profileNames">
                  <div className="st-screenName">{effectiveUsername.toUpperCase()}</div>
                  <div className="st-username">@{effectiveUsername}</div>
                  <div className="st-profileHint">Settings are front-end only for now.</div>
                </div>
              </div>
            </div>

            <div className="st-rightCard">
              <div className="st-rightTitle">Quick</div>
              <div className="st-ctaRow">
                <button type="button" className="st-actionBtn" onClick={() => goToCommunityEdit()}>
                  Edit Community
                </button>
                <button type="button" className="st-actionBtn st-actionBtn--danger" onClick={() => setModal("logout")}>
                  Log Out
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* MODALS */}
      {modal ? (
        <div className="st-modalOverlay" role="dialog" aria-modal="true">
          <div className="st-modal">
            <button type="button" className="st-modalClose" onClick={closeModal} aria-label="Close modal">
              ×
            </button>

            {modal === "banner" && (
              <>
                <div className="st-miniModalHead">
                  <div className="st-miniTitle">Change Banner Image</div>
                  <div className="st-miniSub">Placeholder for upload wiring (front-end only)</div>
                </div>

                <div className="st-miniBody">
                  <div className="st-mutedNote">
                    For now, use the full editor and we’ll wire uploads later. Clicking below opens your community page
                    editor immediately.
                  </div>

                  <div className="st-modalActions">
                    <button type="button" className="st-actionBtn" onClick={closeModal}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="st-actionBtn st-actionBtn--primary"
                      onClick={() => {
                        closeModal();
                        goToCommunityEdit({ focus: "banner" });
                      }}
                    >
                      Open Editor
                    </button>
                  </div>
                </div>
              </>
            )}

            {modal === "avatar" && (
              <>
                <div className="st-miniModalHead">
                  <div className="st-miniTitle">Change Profile Picture</div>
                  <div className="st-miniSub">Placeholder for upload wiring (front-end only)</div>
                </div>

                <div className="st-miniBody">
                  <div className="st-mutedNote">
                    This button now does something (opens editor). We can wire real file uploads later.
                  </div>

                  <div className="st-modalActions">
                    <button type="button" className="st-actionBtn" onClick={closeModal}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="st-actionBtn st-actionBtn--primary"
                      onClick={() => {
                        closeModal();
                        goToCommunityEdit({ focus: "avatar" });
                      }}
                    >
                      Open Editor
                    </button>
                  </div>
                </div>
              </>
            )}

            {modal === "widgets" && (
              <>
                <div className="st-miniModalHead">
                  <div className="st-miniTitle">Coming Soon</div>
                  <div className="st-miniSub">This is a functional placeholder</div>
                </div>

                <div className="st-miniBody">
                  <div className="st-mutedNote">
                    This confirms the button works. Next step would be wiring real skin/widget management.
                  </div>

                  <div className="st-modalActions">
                    <button type="button" className="st-actionBtn st-actionBtn--primary" onClick={closeModal}>
                      Okay
                    </button>
                  </div>
                </div>
              </>
            )}

            {modal === "logout" && (
              <>
                <div className="st-goodbye">
                  <div className="st-goodbyeTitle">Goodbye</div>
                  <div className="st-goodbyeMsg">Are you sure you want to log out?</div>

                  <div className="st-goodbyeActions">
                    <button type="button" className="st-goodbyeBtn" onClick={confirmLogout}>
                      Yes
                    </button>
                    <button type="button" className="st-goodbyeBtn" onClick={closeModal}>
                      No
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}


