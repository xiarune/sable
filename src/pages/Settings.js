import React from "react";
import { useNavigate } from "react-router-dom";
import "./Settings.css";

// Assets (src/assets/images)
import profileImg from "../assets/images/profile_picture.png";
import editIcon from "../assets/images/edit_profile_picture.png";

const SECTIONS = [
  { id: "account", label: "Account" },
  { id: "personal", label: "Personal\nInfo" },
  { id: "privacy", label: "Privacy" },
  { id: "skins", label: "Skins" },
  { id: "audio", label: "Audio" },
];

const ACCOUNT_ACTIONS = [
  { id: "edit-community", label: "Edit your Community Page" },
  { id: "edit-username", label: "Edit your Username" },
  { id: "edit-screenname", label: "Edit your Screen name" },
  { id: "reset-password", label: "Reset your password" },
  { id: "email", label: "Email Address" },
  { id: "linked", label: "Linked Accounts" },
  { id: "twofa", label: "Two-Factor Authentication" },
];

function downloadJson(filename, data) {
  try {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    // front-end only
  }
}

function ModalShell({ title, children, onClose, ariaLabel }) {
  React.useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="st-modalOverlay" role="presentation" onMouseDown={onClose}>
      <div
        className="st-modal"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button type="button" className="st-modalClose" aria-label="Close" onClick={onClose}>
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

export default function Settings({ username = "john.doe", screenName = "User4658", onLogout }) {
  const navigate = useNavigate();

  const [active, setActive] = React.useState("account");
  const [visibility, setVisibility] = React.useState("public");
  const [language, setLanguage] = React.useState("English");

  // Personal Info (front-end placeholder state)
  const [fullName, setFullName] = React.useState("");
  const [dob, setDob] = React.useState("");
  const [timeZone, setTimeZone] = React.useState("America/New_York");
  const [country, setCountry] = React.useState("United States");
  const [region, setRegion] = React.useState("");
  const [pronouns, setPronouns] = React.useState("");

  // Small “edit” modals (front-end only)
  const [editModal, setEditModal] = React.useState(null); // "username" | "screenname" | "password" | "email" | "linked" | "twofa"
  const [draftUsername, setDraftUsername] = React.useState(username);
  const [draftScreenName, setDraftScreenName] = React.useState(screenName);
  const [draftEmail, setDraftEmail] = React.useState("");

  // Delete/Deactivate confirm modal
  const [confirmModal, setConfirmModal] = React.useState(null); // "delete" | "deactivate"

  // Skins
  const [skinModalOpen, setSkinModalOpen] = React.useState(false);
  const [skinName, setSkinName] = React.useState("");
  const [skinScope, setSkinScope] = React.useState("community"); // community | work
  const [skinCss, setSkinCss] = React.useState("");
  const [skins, setSkins] = React.useState([
    { id: "s1", name: "Classic Sable", scope: "community", css: "/* placeholder */" },
    { id: "s2", name: "Parchment Noir", scope: "work", css: "/* placeholder */" },
  ]);

  function openLoginModal() {
    window.dispatchEvent(new Event("sable:open-auth"));
  }

  function handleAccountAction(actionId) {
    if (actionId === "edit-community") {
      // Works with BOTH query param and navigation state:
      navigate("/communities/me?edit=1", { state: { edit: true } });
      return;
    }

    if (actionId === "edit-username") {
      setDraftUsername(username);
      setEditModal("username");
      return;
    }

    if (actionId === "edit-screenname") {
      setDraftScreenName(screenName);
      setEditModal("screenname");
      return;
    }

    if (actionId === "reset-password") {
      setEditModal("password");
      return;
    }

    if (actionId === "email") {
      setEditModal("email");
      return;
    }

    if (actionId === "linked") {
      setEditModal("linked");
      return;
    }

    if (actionId === "twofa") {
      setEditModal("twofa");
      return;
    }
  }

  function handleLogout() {
    if (typeof onLogout === "function") {
      onLogout();
      navigate("/");
      return;
    }
    openLoginModal();
  }

  function handleDownloadData() {
    const payload = {
      user: { username, screenName },
      settings: { visibility, language },
      personalInfo: { fullName, dob, timeZone, country, region, pronouns },
      skins: skins.map((s) => ({ name: s.name, scope: s.scope, css: s.css })),
      generatedAt: new Date().toISOString(),
      note: "Front-end placeholder export (no backend).",
    };
    downloadJson("sable-account-export.json", payload);
  }

  function saveNewSkin() {
    const name = (skinName || "").trim();
    const css = (skinCss || "").trim();
    if (!name || !css) return;

    setSkins((prev) => [{ id: `skin_${Date.now()}`, name, scope: skinScope, css }, ...prev]);
    setSkinName("");
    setSkinCss("");
    setSkinScope("community");
    setSkinModalOpen(false);
  }

  function renderAccount() {
    return (
      <>
        <h1 className="st-title">Account</h1>
        <p className="st-subtitle">Manage core account settings and security. (Front-end placeholder UI.)</p>

        <div className="st-sectionCard">
          <div className="st-cardTitleRow">
            <div className="st-cardTitle">Account Actions</div>
            <div className="st-cardMeta">Buttons now do something (navigate / open edit modal)</div>
          </div>

          <div className="st-actionGrid" aria-label="Account action buttons">
            {ACCOUNT_ACTIONS.map((a) => (
              <button key={a.id} type="button" className="st-pillBtn" onClick={() => handleAccountAction(a.id)}>
                {a.label}
              </button>
            ))}

            <label className="st-selectRow">
              <span className="st-selectLabel">System Language</span>
              <select className="st-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option>English</option>
                <option>Spanish</option>
                <option>French</option>
                <option>Vietnamese</option>
              </select>
            </label>
          </div>
        </div>

        <div className="st-sectionCard st-sectionCard--tight">
          <div className="st-cardTitleRow">
            <div className="st-cardTitle">Data & Account</div>
            <div className="st-cardMeta">Includes confirmation for delete/deactivate</div>
          </div>

          <div className="st-ctaRow" aria-label="Account data actions">
            <button type="button" className="st-actionBtn" onClick={handleDownloadData}>
              Download Your Data
            </button>

            <button type="button" className="st-actionBtn" onClick={handleLogout}>
              Log Out
            </button>

            <button type="button" className="st-actionBtn st-actionBtn--danger" onClick={() => setConfirmModal("delete")}>
              Delete Account
            </button>

            <button type="button" className="st-actionBtn" onClick={() => setConfirmModal("deactivate")}>
              Deactivate Account
            </button>
          </div>
        </div>
      </>
    );
  }

  function renderPersonalInfo() {
    return (
      <>
        <h1 className="st-title">Personal Info</h1>
        <p className="st-subtitle">These details help personalize your account experience. (Front-end placeholder.)</p>

        <div className="st-sectionCard">
          <div className="st-formGrid" aria-label="Personal info form">
            <label className="st-field">
              <span className="st-fieldLabel">Full Name</span>
              <input className="st-input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g., Caroline Clark" />
            </label>

            <label className="st-field">
              <span className="st-fieldLabel">Date of Birth</span>
              <input className="st-input" value={dob} onChange={(e) => setDob(e.target.value)} placeholder="YYYY-MM-DD" />
            </label>

            <label className="st-field">
              <span className="st-fieldLabel">Time Zone</span>
              <select className="st-input" value={timeZone} onChange={(e) => setTimeZone(e.target.value)}>
                <option value="America/New_York">America/New_York</option>
                <option value="America/Chicago">America/Chicago</option>
                <option value="America/Denver">America/Denver</option>
                <option value="America/Los_Angeles">America/Los_Angeles</option>
                <option value="Europe/London">Europe/London</option>
                <option value="Europe/Paris">Europe/Paris</option>
                <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh</option>
              </select>
            </label>

            <label className="st-field">
              <span className="st-fieldLabel">Country</span>
              <input className="st-input" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" />
            </label>

            <label className="st-field">
              <span className="st-fieldLabel">Region / State</span>
              <input className="st-input" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Region" />
            </label>

            <label className="st-field">
              <span className="st-fieldLabel">Pronouns</span>
              <input className="st-input" value={pronouns} onChange={(e) => setPronouns(e.target.value)} placeholder="e.g., she/her, they/them" />
            </label>
          </div>

          <div className="st-formFooter">
            <div className="st-mutedNote">Front-end only — no backend persistence yet.</div>
            <button type="button" className="st-saveBtn" onClick={() => {}}>
              Save Changes
            </button>
          </div>
        </div>
      </>
    );
  }

  function renderPrivacy() {
    return (
      <>
        <h1 className="st-title">Privacy</h1>
        <p className="st-subtitle">Control how others can interact with you. (UI placeholder.)</p>

        <div className="st-pillStack">
          {["Blocked Users", "Muted Words", "Content Filters", "DM Permissions"].map((item) => (
            <button key={item} type="button" className="st-pillBtn">
              {item}
            </button>
          ))}
        </div>
      </>
    );
  }

  function renderSkins() {
    const communitySkins = skins.filter((s) => s.scope === "community");
    const workSkins = skins.filter((s) => s.scope === "work");

    return (
      <>
        <div className="st-titleRow">
          <h1 className="st-title st-title--noMargin">Skins</h1>

          <button type="button" className="st-newSkinBtn" onClick={() => setSkinModalOpen(true)}>
            <span className="st-newSkinIcon" aria-hidden="true">
              ✎
            </span>
            New Skin
          </button>
        </div>

        <p className="st-subtitle">Create custom CSS skins like AO3. (Front-end placeholder.)</p>

        <div className="st-skinsBlock">
          <div className="st-skinsHeader">Community Page Skins</div>
          <div className="st-skinTray" aria-label="Community page skins">
            {communitySkins.length ? (
              communitySkins.slice(0, 4).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="st-skinTile"
                  title={s.name}
                  onClick={() => {
                    setSkinName(s.name);
                    setSkinScope("community");
                    setSkinCss(s.css);
                    setSkinModalOpen(true);
                  }}
                >
                  <div className="st-skinPreview" aria-hidden="true" />
                  <div className="st-skinName">{s.name}</div>
                </button>
              ))
            ) : (
              <>
                <div className="st-skinTile st-skinTile--empty" aria-hidden="true" />
                <div className="st-skinTile st-skinTile--empty" aria-hidden="true" />
                <div className="st-skinTile st-skinTile--empty" aria-hidden="true" />
                <div className="st-skinTile st-skinTile--empty" aria-hidden="true" />
              </>
            )}
          </div>
        </div>

        <div className="st-skinsBlock">
          <div className="st-skinsHeader">Work Skins</div>
          <div className="st-skinTray" aria-label="Work skins">
            {workSkins.length ? (
              workSkins.slice(0, 4).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="st-skinTile"
                  title={s.name}
                  onClick={() => {
                    setSkinName(s.name);
                    setSkinScope("work");
                    setSkinCss(s.css);
                    setSkinModalOpen(true);
                  }}
                >
                  <div className="st-skinPreview" aria-hidden="true" />
                  <div className="st-skinName">{s.name}</div>
                </button>
              ))
            ) : (
              <>
                <div className="st-skinTile st-skinTile--empty" aria-hidden="true" />
                <div className="st-skinTile st-skinTile--empty" aria-hidden="true" />
                <div className="st-skinTile st-skinTile--empty" aria-hidden="true" />
                <div className="st-skinTile st-skinTile--empty" aria-hidden="true" />
              </>
            )}
          </div>
        </div>

        {skinModalOpen ? (
          <ModalShell
            title="New Skin"
            ariaLabel="Create a new skin"
            onClose={() => {
              setSkinModalOpen(false);
              setSkinName("");
              setSkinCss("");
              setSkinScope("community");
            }}
          >
            <div className="st-skinModalHead">
              <div className="st-skinModalTitle">Create a New Skin</div>
              <div className="st-skinModalSub">Write CSS below (AO3-style). Saved locally for now.</div>
            </div>

            <div className="st-skinForm">
              <label className="st-field st-field--modal">
                <span className="st-fieldLabel">Skin Name</span>
                <input className="st-input" value={skinName} onChange={(e) => setSkinName(e.target.value)} placeholder="e.g., Midnight Ink" />
              </label>

              <label className="st-field st-field--modal">
                <span className="st-fieldLabel">Applies To</span>
                <select className="st-input" value={skinScope} onChange={(e) => setSkinScope(e.target.value)}>
                  <option value="community">Community Page</option>
                  <option value="work">Works</option>
                </select>
              </label>

              <label className="st-field st-field--modal">
                <span className="st-fieldLabel">CSS</span>
                <textarea
                  className="st-textarea"
                  value={skinCss}
                  onChange={(e) => setSkinCss(e.target.value)}
                  placeholder={`/* Example */
.ycp-card { 
  background: rgba(255,255,255,0.8);
}`}
                />
              </label>

              <div className="st-modalActions">
                <button
                  type="button"
                  className="st-actionBtn"
                  onClick={() => {
                    setSkinModalOpen(false);
                    setSkinName("");
                    setSkinCss("");
                    setSkinScope("community");
                  }}
                >
                  Cancel
                </button>
                <button type="button" className="st-actionBtn st-actionBtn--primary" onClick={saveNewSkin}>
                  Save Skin
                </button>
              </div>
            </div>
          </ModalShell>
        ) : null}
      </>
    );
  }

  function renderAudio() {
    return (
      <>
        <h1 className="st-title">Audio</h1>
        <p className="st-subtitle">Audio preferences and uploads. (UI placeholder.)</p>

        <div className="st-pillStack">
          {["Upload Defaults", "Playback Preferences", "Audio Privacy", "Audio Library"].map((item) => (
            <button key={item} type="button" className="st-pillBtn">
              {item}
            </button>
          ))}
        </div>
      </>
    );
  }

  function renderCenter() {
    if (active === "account") return renderAccount();
    if (active === "personal") return renderPersonalInfo();
    if (active === "privacy") return renderPrivacy();
    if (active === "skins") return renderSkins();
    if (active === "audio") return renderAudio();
    return null;
  }

  function confirmTitle() {
    if (confirmModal === "delete") return "Delete Account";
    if (confirmModal === "deactivate") return "Deactivate Account";
    return "Confirm";
  }

  function confirmMessage() {
    if (confirmModal === "delete") return "Are you sure you want to delete your account? This action cannot be undone.";
    if (confirmModal === "deactivate") return "Are you sure you want to dactivate your account?";
    return "Are you sure?";
  }

  function confirmYes() {
    if (confirmModal === "delete") {
      setConfirmModal(null);
      navigate("/");
      return;
    }
    if (confirmModal === "deactivate") {
      setConfirmModal(null);
      handleLogout();
      return;
    }
    setConfirmModal(null);
  }

  return (
    <div className="st">
      <div className="st-shell">
        <div className="st-grid">
          <aside className="st-side" aria-label="Settings sections">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`st-sideBtn ${active === s.id ? "is-active" : ""}`}
                onClick={() => setActive(s.id)}
              >
                {s.label}
              </button>
            ))}
          </aside>

          <main className="st-main">{renderCenter()}</main>

          <aside className="st-right" aria-label="Account visibility and profile">
            <section className="st-profileCard" aria-label="Profile">
              <div className="st-profileTop">
                <div className="st-avatarWrap" aria-label="Profile picture">
                  <img className="st-avatar" src={profileImg} alt="Profile" />
                  <button type="button" className="st-avatarEdit" aria-label="Edit profile picture">
                    <img src={editIcon} alt="" />
                  </button>
                </div>

                <div className="st-profileNames">
                  <div className="st-screenName">{screenName}</div>
                  <div className="st-username">{username}</div>
                </div>
              </div>

              <div className="st-profileHint">Front-end placeholder profile card</div>
            </section>

            <section className="st-rightCard">
              <h2 className="st-rightTitle">Account Visibility</h2>

              <div className="st-radioGroup" role="radiogroup" aria-label="Account visibility">
                <label className="st-radioRow">
                  <input type="radio" name="visibility" value="public" checked={visibility === "public"} onChange={() => setVisibility("public")} />
                  <div>
                    <div className="st-radioLabel">Public</div>
                    <div className="st-radioDesc">Everyone can see your works, posts, and comments</div>
                  </div>
                </label>

                <label className="st-radioRow">
                  <input type="radio" name="visibility" value="private" checked={visibility === "private"} onChange={() => setVisibility("private")} />
                  <div>
                    <div className="st-radioLabel">Private</div>
                    <div className="st-radioDesc">Your works, posts, and comments are visible only to those in your community</div>
                  </div>
                </label>

                <label className="st-radioRow">
                  <input
                    type="radio"
                    name="visibility"
                    value="invisible"
                    checked={visibility === "invisible"}
                    onChange={() => setVisibility("invisible")}
                  />
                  <div>
                    <div className="st-radioLabel">Invisible</div>
                    <div className="st-radioDesc">Your works, posts, and comments are visible only to you.</div>
                  </div>
                </label>
              </div>
            </section>
          </aside>
        </div>

        {confirmModal ? (
          <ModalShell title={confirmTitle()} ariaLabel={confirmTitle()} onClose={() => setConfirmModal(null)}>
            <div className="st-goodbye">
              <div className="st-goodbyeTitle">SAD TO SEE YOU GO!</div>
              <div className="st-goodbyeMsg">{confirmMessage()}</div>

              <div className="st-goodbyeActions" aria-label="Confirmation buttons">
                <button type="button" className="st-goodbyeBtn" onClick={confirmYes}>
                  Yes
                </button>
                <button type="button" className="st-goodbyeBtn" onClick={() => setConfirmModal(null)}>
                  No
                </button>
              </div>
            </div>
          </ModalShell>
        ) : null}
      </div>
    </div>
  );
}






