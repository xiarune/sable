import React from "react";
import { useNavigate } from "react-router-dom";
import "./Settings.css";

import profileImg from "../assets/images/profile_picture.png";

export default function Settings({ username, onLogout }) {
  const navigate = useNavigate();

  const effectiveUsername = (username || "john.doe").trim();
  const screenName = "User4658";

  // Left nav
  const [activeNav, setActiveNav] = React.useState("account");

  // Right-side visibility card 
  const [visibility, setVisibility] = React.useState("public"); // public | private | invisible

  // Modals
  const [activeModal, setActiveModal] = React.useState(null);

  // Generic modal input state
  const [modalValue, setModalValue] = React.useState("");
  const [modalValue2, setModalValue2] = React.useState("");

  // Status line for placeholder actions
  const [modalStatus, setModalStatus] = React.useState("");

  // Download modal state
  const [downloadInclude, setDownloadInclude] = React.useState({
    profile: true,
    works: true,
    drafts: true,
    communities: true,
    bookmarks: true,
    inbox: false,
  });
  const [downloadStatus, setDownloadStatus] = React.useState("");

  // Privacy placeholder state
  const [blockedUsers, setBlockedUsers] = React.useState([
    { id: "u1", handle: "kevin.nguyen", name: "Kevin Nguyen" },
    { id: "u2", handle: "darkacademia_girl", name: "Mira" },
  ]);
  const [mutedWords, setMutedWords] = React.useState(["spoilers", "AI slop"]);
  const [dmSetting, setDmSetting] = React.useState("community"); // everyone | community | mutuals | none
  const [contentFilters, setContentFilters] = React.useState({
    mature: true,
    explicit: false,
    violence: true,
    selfHarm: true,
    spoilers: false,
  });

  // Audio placeholder state
  const [uploadDefaults, setUploadDefaults] = React.useState({
    allowRemixes: true,
    defaultVisibility: "public", // public | private | community
    normalize: true,
  });
  const [playbackPrefs, setPlaybackPrefs] = React.useState({
    autoplay: false,
    crossfade: false,
    crossfadeSeconds: 4,
  });
  const [audioPrivacy, setAudioPrivacy] = React.useState({
    showListeningActivity: true,
    showCollections: true,
    allowDMRequests: true,
  });
  const [audioLibrary, setAudioLibrary] = React.useState([
    { id: "a1", title: "Tuavir Nightwind (Demo)", duration: "1:42" },
    { id: "a2", title: "Parchment Noir Theme", duration: "2:11" },
  ]);

  // Skin modal
  const [skinName, setSkinName] = React.useState("");
  const [skinAppliesTo, setSkinAppliesTo] = React.useState("Community Page");
  const [skinCss, setSkinCss] = React.useState(
    "/* Example */\n.ycp-card {\n  background: rgba(255,255,255,0.8);\n}\n"
  );

  function openModal(key) {
    setActiveModal(key);
    setModalValue("");
    setModalValue2("");
    setModalStatus("");
    setDownloadStatus("");
  }

  function closeModal() {
    setActiveModal(null);
    setModalValue("");
    setModalValue2("");
    setModalStatus("");
    setDownloadStatus("");
  }

  const isGoodbyeModal = activeModal === "delete" || activeModal === "deactivate";
  const isSkinModal = activeModal === "skin";
  const isMiniEditModal = activeModal && !isGoodbyeModal && !isSkinModal;

  function goodbyeActionLabel() {
    return activeModal === "delete" ? "delete" : "deactivate";
  }

  function handleConfirmGoodbye() {
   
    closeModal();

    if (typeof onLogout === "function") {
      onLogout();
    }

    navigate("/", { replace: true });
  }

  function modalTitle() {
    switch (activeModal) {
      // Account
      case "username":
        return "Edit your Username";
      case "screenname":
        return "Edit your Screen name";
      case "password":
        return "Reset your password";
      case "email":
        return "Email Address";
      case "linked":
        return "Linked Accounts";
      case "2fa":
        return "Two-Factor Authentication";
      case "download":
        return "Download Your Data";

      // Privacy
      case "blocked":
        return "Blocked Users";
      case "muted":
        return "Muted Words";
      case "filters":
        return "Content Filters";
      case "dm":
        return "DM Permissions";

      // Audio
      case "uploadDefaults":
        return "Upload Defaults";
      case "playback":
        return "Playback Preferences";
      case "audioPrivacy":
        return "Audio Privacy";
      case "audioLibrary":
        return "Audio Library";

      default:
        return "Edit Setting";
    }
  }

  function handleModalSave() {
    // Front-end placeholder only
    setModalStatus("Saved (placeholder).");
   
  }

  function handleDownloadGenerate() {
    // Front-end placeholder only
    setDownloadStatus(
      "Download package queued (placeholder). In a real app, you’d receive an email link or a file export."
    );
  }

  function handleSkinSave() {
    // Front-end placeholder only 
    setSkinName("");
    setSkinAppliesTo("Community Page");
    setSkinCss("/* Example */\n.ycp-card {\n  background: rgba(255,255,255,0.8);\n}\n");
    closeModal();
  }

  function renderMiniModalBody() {
    
    switch (activeModal) {
     
      case "username":
        return (
          <>
            <div className="st-mutedNote">
              Current username: <strong>{effectiveUsername}</strong>
              <br />
              Usernames should be lowercase, 3–20 characters, and may include dots/underscores. (Placeholder rules.)
            </div>

            <div className="st-field st-field--modal">
              <div className="st-fieldLabel">New username</div>
              <input
                className="st-input"
                value={modalValue}
                onChange={(e) => setModalValue(e.target.value)}
                placeholder="e.g.,  john smith"
                aria-label="New username"
              />
            </div>

            {modalStatus ? <div className="st-mutedNote" style={{ marginTop: 10 }}>{modalStatus}</div> : null}
          </>
        );

      case "screenname":
        return (
          <>
            <div className="st-mutedNote">
              Your screen name is how you appear publicly (display name). Usernames remain for URLs/handles. (Placeholder.)
            </div>

            <div className="st-field st-field--modal">
              <div className="st-fieldLabel">New screen name</div>
              <input
                className="st-input"
                value={modalValue}
                onChange={(e) => setModalValue(e.target.value)}
                placeholder="e.g., Caroline"
                aria-label="New screen name"
              />
            </div>

            <div className="st-mutedNote" style={{ marginTop: 10 }}>
              Preview: <strong>{(modalValue || screenName).toUpperCase()}</strong>
            </div>

            {modalStatus ? <div className="st-mutedNote" style={{ marginTop: 10 }}>{modalStatus}</div> : null}
          </>
        );

      case "password":
        return (
          <>
            <div className="st-mutedNote">
              Password changes normally require confirmation (current password, email verification, etc.).
              This is a front-end placeholder that demonstrates the flow.
            </div>

            <div className="st-field st-field--modal">
              <div className="st-fieldLabel">New password</div>
              <input
                className="st-input"
                value={modalValue}
                onChange={(e) => setModalValue(e.target.value)}
                placeholder="New password"
                type="password"
                aria-label="New password"
              />
            </div>

            <div className="st-field st-field--modal">
              <div className="st-fieldLabel">Confirm new password</div>
              <input
                className="st-input"
                value={modalValue2}
                onChange={(e) => setModalValue2(e.target.value)}
                placeholder="Confirm password"
                type="password"
                aria-label="Confirm password"
              />
            </div>

            {modalStatus ? <div className="st-mutedNote" style={{ marginTop: 10 }}>{modalStatus}</div> : null}
          </>
        );

      case "email":
        return (
          <>
            <div className="st-mutedNote">
              Email is used for account recovery and notifications. Changing it normally requires confirmation. (Placeholder.)
            </div>

            <div className="st-field st-field--modal">
              <div className="st-fieldLabel">New email address</div>
              <input
                className="st-input"
                value={modalValue}
                onChange={(e) => setModalValue(e.target.value)}
                placeholder="e.g., john.smith@gmail.com"
                aria-label="New email address"
              />
            </div>

            <div className="st-mutedNote" style={{ marginTop: 10 }}>
              You’ll receive a verification email (placeholder). Until verified, your old email remains active.
            </div>

            {modalStatus ? <div className="st-mutedNote" style={{ marginTop: 10 }}>{modalStatus}</div> : null}
          </>
        );

      case "linked":
        return (
          <>
            <div className="st-mutedNote">
              Link external accounts to make login easier. These buttons are front-end placeholders.
            </div>

            <div className="st-pillStack" style={{ marginTop: 10 }}>
              <button
                type="button"
                className="st-pillBtn"
                onClick={() => setModalStatus("Google linked (placeholder).")}
              >
                Connect Google
              </button>
              <button
                type="button"
                className="st-pillBtn"
                onClick={() => setModalStatus("Apple linked (placeholder).")}
              >
                Connect Apple
              </button>
              <button
                type="button"
                className="st-pillBtn"
                onClick={() => setModalStatus("Discord linked (placeholder).")}
              >
                Connect Discord
              </button>
            </div>

            {modalStatus ? <div className="st-mutedNote" style={{ marginTop: 10 }}>{modalStatus}</div> : null}
          </>
        );

      case "2fa":
        return (
          <>
            <div className="st-mutedNote">
              Two-factor authentication adds a second step after your password. (Placeholder flow.)
            </div>

            <div className="st-pillStack" style={{ marginTop: 10 }}>
              <button
                type="button"
                className="st-pillBtn"
                onClick={() => setModalStatus("Authenticator App enabled (placeholder).")}
              >
                Enable Authenticator App
              </button>
              <button
                type="button"
                className="st-pillBtn"
                onClick={() => setModalStatus("SMS backup enabled (placeholder).")}
              >
                Enable SMS Backup
              </button>
              <button
                type="button"
                className="st-pillBtn"
                onClick={() => setModalStatus("Backup codes generated (placeholder).")}
              >
                Generate Backup Codes
              </button>
            </div>

            {modalStatus ? <div className="st-mutedNote" style={{ marginTop: 10 }}>{modalStatus}</div> : null}
          </>
        );

      case "download":
        return (
          <>
            <div className="st-mutedNote">
              Choose what to include in your export. (Front-end placeholder — no real file generated.)
            </div>

            <div className="st-pillStack" style={{ marginTop: 10 }}>
              {[
                ["profile", "Profile & Settings"],
                ["works", "Works"],
                ["drafts", "Drafts"],
                ["communities", "Community Posts / Comments"],
                ["bookmarks", "Bookmarks"],
                ["inbox", "Inbox Messages"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className="st-pillBtn"
                  onClick={() =>
                    setDownloadInclude((prev) => ({
                      ...prev,
                      [key]: !prev[key],
                    }))
                  }
                  aria-pressed={downloadInclude[key]}
                >
                  {downloadInclude[key] ? "✓ " : ""}
                  {label}
                </button>
              ))}
            </div>

            {downloadStatus ? (
              <div className="st-mutedNote" style={{ marginTop: 10 }}>
                {downloadStatus}
              </div>
            ) : null}
          </>
        );

      // Privacy

      case "blocked":
        return (
          <>
            <div className="st-mutedNote">
              Blocked users can’t follow you, DM you, or interact with your content. (Placeholder behavior.)
            </div>

            <div className="st-field st-field--modal">
              <div className="st-fieldLabel">Block a user</div>
              <input
                className="st-input"
                value={modalValue}
                onChange={(e) => setModalValue(e.target.value)}
                placeholder="Search by username..."
                aria-label="Block user search"
              />
            </div>

            <div className="st-pillStack" style={{ marginTop: 10 }}>
              <button
                type="button"
                className="st-pillBtn"
                onClick={() => {
                  const v = modalValue.trim();
                  if (!v) return;
                  setBlockedUsers((prev) => [
                    { id: `u_${Date.now()}`, handle: v.replace("@", ""), name: v.replace("@", "") },
                    ...prev,
                  ]);
                  setModalValue("");
                  setModalStatus(`Blocked @${v.replace("@", "")} (placeholder).`);
                }}
              >
                Block
              </button>
            </div>

            <div className="st-mutedNote" style={{ marginTop: 12 }}>
              Currently blocked:
            </div>

            <div className="st-pillStack" style={{ marginTop: 10 }}>
              {blockedUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="st-pillBtn"
                  onClick={() => {
                    setBlockedUsers((prev) => prev.filter((x) => x.id !== u.id));
                    setModalStatus(`Unblocked @${u.handle} (placeholder).`);
                  }}
                >
                  Unblock @{u.handle}
                </button>
              ))}
              {blockedUsers.length === 0 ? (
                <div className="st-mutedNote">No blocked users.</div>
              ) : null}
            </div>

            {modalStatus ? <div className="st-mutedNote" style={{ marginTop: 10 }}>{modalStatus}</div> : null}
          </>
        );

      case "muted":
        return (
          <>
            <div className="st-mutedNote">
              Muted words hide posts/comments containing those terms. (Placeholder behavior.)
            </div>

            <div className="st-field st-field--modal">
              <div className="st-fieldLabel">Add muted word</div>
              <input
                className="st-input"
                value={modalValue}
                onChange={(e) => setModalValue(e.target.value)}
                placeholder="e.g., spoilers"
                aria-label="Add muted word"
              />
            </div>

            <div className="st-pillStack" style={{ marginTop: 10 }}>
              <button
                type="button"
                className="st-pillBtn"
                onClick={() => {
                  const v = modalValue.trim();
                  if (!v) return;
                  if (mutedWords.includes(v)) {
                    setModalStatus("Already muted (placeholder).");
                    return;
                  }
                  setMutedWords((prev) => [v, ...prev]);
                  setModalValue("");
                  setModalStatus(`Muted "${v}" (placeholder).`);
                }}
              >
                Add
              </button>
            </div>

            <div className="st-mutedNote" style={{ marginTop: 12 }}>
              Muted list:
            </div>

            <div className="st-pillStack" style={{ marginTop: 10 }}>
              {mutedWords.map((w) => (
                <button
                  key={w}
                  type="button"
                  className="st-pillBtn"
                  onClick={() => {
                    setMutedWords((prev) => prev.filter((x) => x !== w));
                    setModalStatus(`Unmuted "${w}" (placeholder).`);
                  }}
                >
                  Remove “{w}”
                </button>
              ))}
              {mutedWords.length === 0 ? <div className="st-mutedNote">No muted words.</div> : null}
            </div>

            {modalStatus ? <div className="st-mutedNote" style={{ marginTop: 10 }}>{modalStatus}</div> : null}
          </>
        );

      case "filters":
        return (
          <>
            <div className="st-mutedNote">
              Choose what types of content you want hidden by default. (Placeholder UI.)
            </div>

            <div className="st-pillStack" style={{ marginTop: 10 }}>
              {[
                ["mature", "Mature content"],
                ["explicit", "Explicit content"],
                ["violence", "Graphic violence"],
                ["selfHarm", "Self-harm themes"],
                ["spoilers", "Spoilers"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className="st-pillBtn"
                  aria-pressed={contentFilters[key]}
                  onClick={() =>
                    setContentFilters((prev) => ({
                      ...prev,
                      [key]: !prev[key],
                    }))
                  }
                >
                  {contentFilters[key] ? "✓ " : ""}
                  {label}
                </button>
              ))}
            </div>

            <div className="st-mutedNote" style={{ marginTop: 12 }}>
              These preferences would normally affect Browse/Search/Feed results and blur or hide content accordingly.
            </div>

            {modalStatus ? <div className="st-mutedNote" style={{ marginTop: 10 }}>{modalStatus}</div> : null}
          </>
        );

      case "dm":
        return (
          <>
            <div className="st-mutedNote">
              Control who can DM you. (Placeholder behavior.)
            </div>

            <div className="st-pillStack" style={{ marginTop: 10 }}>
              {[
                ["everyone", "Everyone"],
                ["community", "Community members"],
                ["mutuals", "Mutuals only"],
                ["none", "No one"],
              ].map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  className="st-pillBtn"
                  aria-pressed={dmSetting === val}
                  onClick={() => {
                    setDmSetting(val);
                    setModalStatus(`DM permissions set to: ${label} (placeholder).`);
                  }}
                >
                  {dmSetting === val ? "✓ " : ""}
                  {label}
                </button>
              ))}
            </div>

            {modalStatus ? <div className="st-mutedNote" style={{ marginTop: 10 }}>{modalStatus}</div> : null}
          </>
        );

      // Audio

      case "uploadDefaults":
        return (
          <>
            <div className="st-mutedNote">
              These are your default settings when you upload audio to Sable. (UI placeholder.)
            </div>

            <div className="st-pillStack" style={{ marginTop: 10 }}>
              <button
                type="button"
                className="st-pillBtn"
                aria-pressed={uploadDefaults.allowRemixes}
                onClick={() =>
                  setUploadDefaults((p) => ({ ...p, allowRemixes: !p.allowRemixes }))
                }
              >
                {uploadDefaults.allowRemixes ? "✓ " : ""}
                Allow Remixes
              </button>

              <button
                type="button"
                className="st-pillBtn"
                aria-pressed={uploadDefaults.normalize}
                onClick={() =>
                  setUploadDefaults((p) => ({ ...p, normalize: !p.normalize }))
                }
              >
                {uploadDefaults.normalize ? "✓ " : ""}
                Normalize Volume
              </button>

              <button
                type="button"
                className="st-pillBtn"
                onClick={() => {
                  setUploadDefaults((p) => ({
                    ...p,
                    defaultVisibility:
                      p.defaultVisibility === "public"
                        ? "community"
                        : p.defaultVisibility === "community"
                        ? "private"
                        : "public",
                  }));
                }}
              >
                Default Visibility:{" "}
                {uploadDefaults.defaultVisibility === "public"
                  ? "Public"
                  : uploadDefaults.defaultVisibility === "community"
                  ? "Community"
                  : "Private"}
              </button>
            </div>

            {modalStatus ? <div className="st-mutedNote" style={{ marginTop: 10 }}>{modalStatus}</div> : null}
          </>
        );

      case "playback":
        return (
          <>
            <div className="st-mutedNote">
              Customize how audio behaves during playback. (UI placeholder.)
            </div>

            <div className="st-pillStack" style={{ marginTop: 10 }}>
              <button
                type="button"
                className="st-pillBtn"
                aria-pressed={playbackPrefs.autoplay}
                onClick={() =>
                  setPlaybackPrefs((p) => ({ ...p, autoplay: !p.autoplay }))
                }
              >
                {playbackPrefs.autoplay ? "✓ " : ""}
                Autoplay Next Track
              </button>

              <button
                type="button"
                className="st-pillBtn"
                aria-pressed={playbackPrefs.crossfade}
                onClick={() =>
                  setPlaybackPrefs((p) => ({ ...p, crossfade: !p.crossfade }))
                }
              >
                {playbackPrefs.crossfade ? "✓ " : ""}
                Crossfade
              </button>

              <button
                type="button"
                className="st-pillBtn"
                onClick={() =>
                  setPlaybackPrefs((p) => ({
                    ...p,
                    crossfadeSeconds: Math.min(10, (p.crossfadeSeconds || 0) + 1),
                  }))
                }
              >
                Crossfade Seconds: {playbackPrefs.crossfadeSeconds}
              </button>
            </div>

            <div className="st-mutedNote" style={{ marginTop: 12 }}>
              (Placeholder) In a real implementation these would affect the audio player component.
            </div>

            {modalStatus ? <div className="st-mutedNote" style={{ marginTop: 10 }}>{modalStatus}</div> : null}
          </>
        );

      case "audioPrivacy":
        return (
          <>
            <div className="st-mutedNote">
              Control what others can see about your listening and audio activity. (UI placeholder.)
            </div>

            <div className="st-pillStack" style={{ marginTop: 10 }}>
              {[
                ["showListeningActivity", "Show listening activity"],
                ["showCollections", "Show audio collections"],
                ["allowDMRequests", "Allow DM requests from audio pages"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className="st-pillBtn"
                  aria-pressed={audioPrivacy[key]}
                  onClick={() =>
                    setAudioPrivacy((p) => ({
                      ...p,
                      [key]: !p[key],
                    }))
                  }
                >
                  {audioPrivacy[key] ? "✓ " : ""}
                  {label}
                </button>
              ))}
            </div>

            {modalStatus ? <div className="st-mutedNote" style={{ marginTop: 10 }}>{modalStatus}</div> : null}
          </>
        );

      case "audioLibrary":
        return (
          <>
            <div className="st-mutedNote">
              Your uploaded audio. (Front-end placeholder list.)
            </div>

            <div className="st-pillStack" style={{ marginTop: 10 }}>
              <button
                type="button"
                className="st-pillBtn"
                onClick={() => {
                  const title = modalValue.trim();
                  if (!title) return;
                  setAudioLibrary((prev) => [
                    { id: `a_${Date.now()}`, title, duration: "0:30" },
                    ...prev,
                  ]);
                  setModalValue("");
                  setModalStatus(`Added "${title}" (placeholder).`);
                }}
              >
                Add Track
              </button>
            </div>

            <div className="st-field st-field--modal" style={{ marginTop: 10 }}>
              <div className="st-fieldLabel">New track title</div>
              <input
                className="st-input"
                value={modalValue}
                onChange={(e) => setModalValue(e.target.value)}
                placeholder="e.g., Ambient Tuavir Loop"
                aria-label="New track title"
              />
            </div>

            <div className="st-mutedNote" style={{ marginTop: 12 }}>Library:</div>

            <div className="st-pillStack" style={{ marginTop: 10 }}>
              {audioLibrary.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="st-pillBtn"
                  onClick={() => {
                    setAudioLibrary((prev) => prev.filter((x) => x.id !== t.id));
                    setModalStatus(`Removed "${t.title}" (placeholder).`);
                  }}
                >
                  Remove: {t.title} ({t.duration})
                </button>
              ))}
              {audioLibrary.length === 0 ? <div className="st-mutedNote">No audio uploaded yet.</div> : null}
            </div>

            {modalStatus ? <div className="st-mutedNote" style={{ marginTop: 10 }}>{modalStatus}</div> : null}
          </>
        );

      default:
        return <div className="st-mutedNote">Placeholder modal content.</div>;
    }
  }

  function renderMiniModalActions() {
    if (activeModal === "download") {
      return (
        <div className="st-modalActions">
          <button type="button" className="st-actionBtn" onClick={closeModal}>
            Close
          </button>
          <button
            type="button"
            className="st-actionBtn st-actionBtn--primary"
            onClick={handleDownloadGenerate}
          >
            Generate Download
          </button>
        </div>
      );
    }

    // Some modals feel more like “configure + close” instead of “save”
    const closeOnly = ["linked", "2fa", "blocked", "muted", "filters", "dm", "uploadDefaults", "playback", "audioPrivacy", "audioLibrary"];
    if (closeOnly.includes(activeModal)) {
      return (
        <div className="st-modalActions">
          <button type="button" className="st-actionBtn" onClick={closeModal}>
            Close
          </button>
          <button
            type="button"
            className="st-actionBtn st-actionBtn--primary"
            onClick={() => setModalStatus("Saved (placeholder).")}
          >
            Save
          </button>
        </div>
      );
    }

    return (
      <div className="st-modalActions">
        <button type="button" className="st-actionBtn" onClick={closeModal}>
          Cancel
        </button>
        <button
          type="button"
          className="st-actionBtn st-actionBtn--primary"
          onClick={handleModalSave}
        >
          Save
        </button>
      </div>
    );
  }

  return (
    <div className="st">
      <div className="st-shell">
        <div className="st-grid">

          {/* Left nav */}
          <aside className="st-side" aria-label="Settings navigation">
            <div className="st-sideTitle">Settings</div>

            <button
              type="button"
              className={`st-sideBtn ${activeNav === "account" ? "is-active" : ""}`}
              onClick={() => setActiveNav("account")}
            >
              Account
            </button>

            <button
              type="button"
              className={`st-sideBtn ${activeNav === "personal" ? "is-active" : ""}`}
              onClick={() => setActiveNav("personal")}
            >
              Personal Info
            </button>

            <button
              type="button"
              className={`st-sideBtn ${activeNav === "privacy" ? "is-active" : ""}`}
              onClick={() => setActiveNav("privacy")}
            >
              Privacy
            </button>

            <button
              type="button"
              className={`st-sideBtn ${activeNav === "skins" ? "is-active" : ""}`}
              onClick={() => setActiveNav("skins")}
            >
              Skins
            </button>

            <button
              type="button"
              className={`st-sideBtn ${activeNav === "audio" ? "is-active" : ""}`}
              onClick={() => setActiveNav("audio")}
            >
              Audio
            </button>
          </aside>

          {/* Center */}
          <main className="st-main" aria-label="Settings content">

            {/* Account */}
            {activeNav === "account" && (
              <>
                <h1 className="st-title">ACCOUNT</h1>
                <p className="st-subtitle">
                  Manage core account settings and security. (Front-end placeholder UI.)
                </p>

                <section className="st-sectionCard" aria-label="Account actions">
                  <div className="st-cardTitleRow">
                    <div className="st-cardTitle">Account Actions</div>
                    <div className="st-cardMeta">
                      Buttons now do something (navigate / open edit modal)
                    </div>
                  </div>

                  <div className="st-pillStack">
                    <button
                      type="button"
                      className="st-pillBtn"
                      onClick={() => navigate("/communities/me", { state: { edit: true } })}
                    >
                      Edit your Community Page
                    </button>

                    <button type="button" className="st-pillBtn" onClick={() => openModal("username")}>
                      Edit your Username
                    </button>

                    <button type="button" className="st-pillBtn" onClick={() => openModal("screenname")}>
                      Edit your Screen name
                    </button>

                    <button type="button" className="st-pillBtn" onClick={() => openModal("password")}>
                      Reset your password
                    </button>

                    <button type="button" className="st-pillBtn" onClick={() => openModal("email")}>
                      Email Address
                    </button>

                    <button type="button" className="st-pillBtn" onClick={() => openModal("linked")}>
                      Linked Accounts
                    </button>

                    <button type="button" className="st-pillBtn" onClick={() => openModal("2fa")}>
                      Two-Factor Authentication
                    </button>

                    <div className="st-selectRow" aria-label="System language">
                      <span className="st-selectLabel">System Language</span>
                      <select className="st-select" defaultValue="English" aria-label="System language select">
                        <option value="English">English</option>
                      </select>
                    </div>
                  </div>
                </section>

                <section className="st-sectionCard st-sectionCard--tight" aria-label="Data and account">
                  <div className="st-cardTitleRow">
                    <div className="st-cardTitle">Data &amp; Account</div>
                    <div className="st-cardMeta">Includes confirmation for delete/deactivate</div>
                  </div>

                  <div className="st-ctaRow">
                    <button type="button" className="st-actionBtn" onClick={() => openModal("download")}>
                      Download Your Data
                    </button>

                    <button
                      type="button"
                      className="st-actionBtn"
                      onClick={() => {
                        if (typeof onLogout === "function") onLogout();
                        navigate("/", { replace: true });
                      }}
                    >
                      Log Out
                    </button>
                  </div>

                  <div className="st-ctaRow" style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      className="st-actionBtn st-actionBtn--danger"
                      onClick={() => openModal("delete")}
                    >
                      Delete Account
                    </button>

                    <button
                      type="button"
                      className="st-actionBtn"
                      onClick={() => openModal("deactivate")}
                    >
                      Deactivate Account
                    </button>
                  </div>
                </section>
              </>
            )}

            {/* Personal Info */}
            {activeNav === "personal" && (
              <>
                <h1 className="st-title">Personal Info</h1>
                <p className="st-subtitle">
                  These details help personalize your account experience. (Front-end placeholder.)
                </p>

                <section className="st-sectionCard" aria-label="Personal info form">
                  <div className="st-formGrid">
                    <div className="st-field">
                      <div className="st-fieldLabel">Full Name</div>
                      <input className="st-input" placeholder="e.g., John Smith" />
                    </div>

                    <div className="st-field">
                      <div className="st-fieldLabel">Date of Birth</div>
                      <input className="st-input" placeholder="YYYY-MM-DD" />
                    </div>

                    <div className="st-field">
                      <div className="st-fieldLabel">Time Zone</div>
                      <select className="st-input" defaultValue="America/New_York" aria-label="Time zone">
                        <option value="America/New_York">America/New_York</option>
                      </select>
                    </div>

                    <div className="st-field">
                      <div className="st-fieldLabel">Country</div>
                      <input className="st-input" defaultValue="United States" />
                    </div>

                    <div className="st-field">
                      <div className="st-fieldLabel">Region / State</div>
                      <input className="st-input" placeholder="Region" />
                    </div>

                    <div className="st-field">
                      <div className="st-fieldLabel">Pronouns</div>
                      <input className="st-input" placeholder="e.g., she/her, they/them" />
                    </div>
                  </div>

                  <div className="st-formFooter">
                    <div className="st-mutedNote">Front-end only — no backend persistence yet.</div>
                    <button type="button" className="st-saveBtn">Save Changes</button>
                  </div>
                </section>
              </>
            )}

            {/* Privacy */}
            {activeNav === "privacy" && (
              <>
                <h1 className="st-title">Privacy</h1>
                <p className="st-subtitle">Control how others can interact with you. (UI placeholder.)</p>

                <div className="st-pillStack" aria-label="Privacy options">
                  <button type="button" className="st-pillBtn" onClick={() => openModal("blocked")}>
                    Blocked Users
                  </button>
                  <button type="button" className="st-pillBtn" onClick={() => openModal("muted")}>
                    Muted Words
                  </button>
                  <button type="button" className="st-pillBtn" onClick={() => openModal("filters")}>
                    Content Filters
                  </button>
                  <button type="button" className="st-pillBtn" onClick={() => openModal("dm")}>
                    DM Permissions
                  </button>
                </div>
              </>
            )}

            {/* SKINS */}
            {activeNav === "skins" && (
              <>
                <div className="st-titleRow">
                  <h1 className="st-title st-title--noMargin">Skins</h1>

                  <button type="button" className="st-newSkinBtn" onClick={() => openModal("skin")}>
                    <span className="st-newSkinIcon">✎</span>
                    New Skin
                  </button>
                </div>

                <p className="st-subtitle">
                  Create custom CSS skins. (Front-end placeholder.)
                </p>

                <div className="st-skinsBlock">
                  <h2 className="st-skinsHeader">Community Page Skins</h2>

                  <div className="st-skinTray" aria-label="Community page skins">
                    <button type="button" className="st-skinTile">
                      <div className="st-skinPreview" />
                      <div className="st-skinName">Classic Sable</div>
                    </button>

                    <div className="st-skinTile st-skinTile--empty" aria-hidden="true" />
                    <div className="st-skinTile st-skinTile--empty" aria-hidden="true" />
                    <div className="st-skinTile st-skinTile--empty" aria-hidden="true" />
                  </div>
                </div>

                <div className="st-skinsBlock" style={{ marginTop: 18 }}>
                  <h2 className="st-skinsHeader">Work Skins</h2>

                  <div className="st-skinTray" aria-label="Work skins">
                    <button type="button" className="st-skinTile">
                      <div className="st-skinPreview" />
                      <div className="st-skinName">Parchment Noir</div>
                    </button>

                    <div className="st-skinTile st-skinTile--empty" aria-hidden="true" />
                    <div className="st-skinTile st-skinTile--empty" aria-hidden="true" />
                    <div className="st-skinTile st-skinTile--empty" aria-hidden="true" />
                  </div>
                </div>
              </>
            )}

            {/* Audio */}
            {activeNav === "audio" && (
              <>
                <h1 className="st-title">Audio</h1>
                <p className="st-subtitle">Audio preferences and uploads. (UI placeholder.)</p>

                <div className="st-pillStack" aria-label="Audio options">
                  <button type="button" className="st-pillBtn" onClick={() => openModal("uploadDefaults")}>
                    Upload Defaults
                  </button>
                  <button type="button" className="st-pillBtn" onClick={() => openModal("playback")}>
                    Playback Preferences
                  </button>
                  <button type="button" className="st-pillBtn" onClick={() => openModal("audioPrivacy")}>
                    Audio Privacy
                  </button>
                  <button type="button" className="st-pillBtn" onClick={() => openModal("audioLibrary")}>
                    Audio Library
                  </button>
                </div>
              </>
            )}
          </main>

          {/* RIGHT COLUMN */}
          <aside className="st-right" aria-label="Settings sidebar">
            <section className="st-profileCard" aria-label="Profile card">
              <div className="st-profileTop">
                <div className="st-avatarWrap">
                  <img className="st-avatar" src={profileImg} alt="Profile" />
                </div>

                <div className="st-profileNames">
                  <div className="st-screenName">{screenName.toUpperCase()}</div>
                  <div className="st-username">{effectiveUsername}</div>
                </div>
              </div>

              <div className="st-profileHint">Front-end placeholder profile card</div>
            </section>

            <section className="st-rightCard" aria-label="Account visibility">
              <h2 className="st-rightTitle">Account Visibility</h2>

              <div className="st-radioGroup" role="radiogroup" aria-label="Visibility options">
                <label className="st-radioRow">
                  <input
                    type="radio"
                    name="visibility"
                    value="public"
                    checked={visibility === "public"}
                    onChange={() => setVisibility("public")}
                  />
                  <div>
                    <div className="st-radioLabel">Public</div>
                    <div className="st-radioDesc">Everyone can see your works, posts, and comments</div>
                  </div>
                </label>

                <label className="st-radioRow">
                  <input
                    type="radio"
                    name="visibility"
                    value="private"
                    checked={visibility === "private"}
                    onChange={() => setVisibility("private")}
                  />
                  <div>
                    <div className="st-radioLabel">Private</div>
                    <div className="st-radioDesc">
                      Your works, posts, and comments are visible only to those in your community
                    </div>
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
      </div>

      {/* Goodbye (Delete / Deactivate) */}
      {isGoodbyeModal && (
        <div className="st-modalOverlay" role="dialog" aria-modal="true" onClick={closeModal}>
          <div className="st-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="st-modalClose" onClick={closeModal} aria-label="Close">
              ×
            </button>

            <div className="st-goodbye">
              <div className="st-goodbyeTitle">Sad To See You Go!</div>
              <div className="st-goodbyeMsg">
                Are you sure you want to {goodbyeActionLabel()} your account?
              </div>

              <div className="st-goodbyeActions">
                <button type="button" className="st-goodbyeBtn" onClick={handleConfirmGoodbye}>
                  Yes
                </button>
                <button type="button" className="st-goodbyeBtn" onClick={closeModal}>
                  No
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Skins */}
      {isSkinModal && (
        <div className="st-modalOverlay" role="dialog" aria-modal="true" onClick={closeModal}>
          <div className="st-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="st-modalClose" onClick={closeModal} aria-label="Close">
              ×
            </button>

            <div className="st-skinModalHead">
              <div className="st-skinModalTitle">Create A New Skin</div>
              <div className="st-skinModalSub">Write CSS below. Saved locally for now.</div>
            </div>

            <div className="st-skinForm">
              <div className="st-field">
                <div className="st-fieldLabel">Skin Name</div>
                <input
                  className="st-input"
                  value={skinName}
                  onChange={(e) => setSkinName(e.target.value)}
                  placeholder="e.g., Midnight Ink"
                />
              </div>

              <div className="st-field">
                <div className="st-fieldLabel">Applies To</div>
                <select
                  className="st-input"
                  value={skinAppliesTo}
                  onChange={(e) => setSkinAppliesTo(e.target.value)}
                  aria-label="Applies to"
                >
                  <option value="Community Page">Community Page</option>
                  <option value="Work">Work</option>
                </select>
              </div>

              <div className="st-field">
                <div className="st-fieldLabel">CSS</div>
                <textarea
                  className="st-textarea"
                  value={skinCss}
                  onChange={(e) => setSkinCss(e.target.value)}
                />
              </div>
            </div>

            <div className="st-modalActions">
              <button type="button" className="st-actionBtn" onClick={closeModal}>
                Cancel
              </button>
              <button type="button" className="st-actionBtn st-actionBtn--primary" onClick={handleSkinSave}>
                Save Skin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mini modal */}
      {isMiniEditModal && (
        <div className="st-modalOverlay" role="dialog" aria-modal="true" onClick={closeModal}>
          <div className="st-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="st-modalClose" onClick={closeModal} aria-label="Close">
              ×
            </button>

            <div className="st-miniModalHead">
              <div className="st-miniTitle">{modalTitle()}</div>
              <div className="st-miniSub">
                Front-end placeholder — functional UI and realistic flows.
              </div>
            </div>

            <div className="st-miniBody">{renderMiniModalBody()}</div>

            {renderMiniModalActions()}
          </div>
        </div>
      )}
    </div>
  );
}


