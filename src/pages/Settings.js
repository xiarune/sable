import React from "react";
import { useNavigate } from "react-router-dom";
import "./Settings.css";
import { settingsApi, usersApi, authApi, skinsApi } from "../api";
import { SableLoader } from "../components";

import profileImg from "../assets/images/profile_picture.png";
import visibleIcon from "../assets/images/Visible.png";
import visibleOffIcon from "../assets/images/Visible_Off.png";

export default function Settings({ username, onLogout }) {
  const navigate = useNavigate();

  // User data from API
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  // Left nav
  const [activeNav, setActiveNav] = React.useState("account");

  // Right-side visibility card
  const [visibility, setVisibility] = React.useState("public");

  // Modals
  const [activeModal, setActiveModal] = React.useState(null);

  // Generic modal input state
  const [modalValue, setModalValue] = React.useState("");
  const [modalValue2, setModalValue2] = React.useState("");
  const [modalValue3, setModalValue3] = React.useState("");

  // Status line for actions
  const [modalStatus, setModalStatus] = React.useState("");
  const [modalLoading, setModalLoading] = React.useState(false);

  // Password visibility toggles
  const [showPassword, setShowPassword] = React.useState(false);
  const [showPassword2, setShowPassword2] = React.useState(false);
  const [showPassword3, setShowPassword3] = React.useState(false);

  // Privacy state
  const [blockedUsers, setBlockedUsers] = React.useState([]);
  const [mutedUsers, setMutedUsers] = React.useState([]);
  const [mutedWords, setMutedWords] = React.useState([]);
  const [dmSetting, setDmSetting] = React.useState("everyone");
  const [contentFilters, setContentFilters] = React.useState({
    mature: true,
    explicit: false,
    violence: true,
    selfHarm: true,
    spoilers: false,
  });
  const [privacySettings, setPrivacySettings] = React.useState({
    showListeningActivity: true,
    showCollections: true,
    allowDMRequests: true,
  });

  // Personal info form state
  const [personalInfo, setPersonalInfo] = React.useState({
    displayName: "",
    dateOfBirth: "",
    timezone: "America/New_York",
    country: "",
    region: "",
    pronouns: "",
  });

  // Sessions state
  const [sessions, setSessions] = React.useState([]);

  // Connected accounts state
  const [connectedAccounts, setConnectedAccounts] = React.useState([]);
  const [hasPassword, setHasPassword] = React.useState(true);

  // Audio preferences state
  const [audioPrefs, setAudioPrefs] = React.useState({
    autoplay: false,
    crossfade: false,
    crossfadeSeconds: 4,
  });

  // Skin modal
  const [skinName, setSkinName] = React.useState("");
  const [skinAppliesTo, setSkinAppliesTo] = React.useState("work");
  const [skinCss, setSkinCss] = React.useState(
    "/* Example */\n.wv-card {\n  background: rgba(255,255,255,0.8);\n}\n"
  );
  const [skinSaving, setSkinSaving] = React.useState(false);
  const [skinError, setSkinError] = React.useState("");
  const [editingSkin, setEditingSkin] = React.useState(null); // skin object being edited

  // Custom skins list
  const [customSkins, setCustomSkins] = React.useState([]);
  const [skinsLoading, setSkinsLoading] = React.useState(false);

  // Reading preferences / interests
  const [interestOptions, setInterestOptions] = React.useState({ genres: [], fandoms: [] });
  const [selectedGenres, setSelectedGenres] = React.useState([]);
  const [selectedFandoms, setSelectedFandoms] = React.useState([]);
  const [interestsSaving, setInterestsSaving] = React.useState(false);

  // Load user data on mount
  React.useEffect(() => {
    async function loadData() {
      try {
        const [meData, blockedData, mutedUsersData, mutedData, privacyData, sessionsData, accountsData, skinsData, optionsData] = await Promise.all([
          authApi.me(),
          usersApi.getBlockedUsers().catch(() => ({ blockedUsers: [] })),
          usersApi.getMutedUsers().catch(() => ({ mutedUsers: [] })),
          settingsApi.getMutedWords().catch(() => ({ mutedWords: [] })),
          settingsApi.getPrivacy().catch(() => ({ privacy: {} })),
          settingsApi.getSessions().catch(() => ({ sessions: [] })),
          settingsApi.getConnectedAccounts().catch(() => ({ accounts: [], hasPassword: true })),
          skinsApi.list().catch(() => ({ skins: [] })),
          authApi.getOnboardingOptions().catch(() => ({ genres: [], fandoms: [] })),
        ]);

        setUser(meData.user);
        setBlockedUsers(blockedData.blockedUsers || []);
        setMutedUsers(mutedUsersData.mutedUsers || []);
        setMutedWords(mutedData.mutedWords || []);
        setPrivacySettings(privacyData.privacy || {});
        setSessions(sessionsData.sessions || []);
        setConnectedAccounts(accountsData.accounts || []);
        setHasPassword(accountsData.hasPassword !== false);
        setCustomSkins(skinsData.skins || []);
        setInterestOptions(optionsData);

        // Load current user interests
        if (meData.user?.interests) {
          setSelectedGenres(meData.user.interests.genres || []);
          setSelectedFandoms(meData.user.interests.fandoms || []);
        }

        // Set visibility from user preferences
        if (meData.user?.preferences?.visibility) {
          setVisibility(meData.user.preferences.visibility);
        }
        if (meData.user?.preferences?.dmSetting) {
          setDmSetting(meData.user.preferences.dmSetting);
        }
        if (meData.user?.contentFilters) {
          setContentFilters(meData.user.contentFilters);
        }
        if (meData.user?.preferences?.audioPrefs) {
          setAudioPrefs(meData.user.preferences.audioPrefs);
        }

        // Set personal info
        setPersonalInfo({
          displayName: meData.user?.displayName || "",
          dateOfBirth: meData.user?.dateOfBirth || "",
          timezone: meData.user?.timezone || "America/New_York",
          country: meData.user?.country || "",
          region: meData.user?.region || "",
          pronouns: meData.user?.pronouns || "",
        });
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const effectiveUsername = user?.username || username || "guest";
  const displayName = user?.displayName || effectiveUsername;

  function openModal(key) {
    setActiveModal(key);
    setModalValue("");
    setModalValue2("");
    setModalValue3("");
    setModalStatus("");
    setModalLoading(false);
    setShowPassword(false);
    setShowPassword2(false);
    setShowPassword3(false);
  }

  function closeModal() {
    setActiveModal(null);
    setModalValue("");
    setModalValue2("");
    setModalValue3("");
    setModalStatus("");
    setModalLoading(false);
    setShowPassword(false);
    setShowPassword2(false);
    setShowPassword3(false);
  }

  const isGoodbyeModal = activeModal === "delete" || activeModal === "deactivate";
  const isSkinModal = activeModal === "skin";
  const isMiniEditModal = activeModal && !isGoodbyeModal && !isSkinModal;

  function goodbyeActionLabel() {
    return activeModal === "delete" ? "delete" : "deactivate";
  }

  async function handleConfirmGoodbye() {
    if (activeModal === "delete") {
      setModalLoading(true);
      try {
        await settingsApi.deleteAccount(modalValue);
        closeModal();
        if (typeof onLogout === "function") {
          onLogout();
        }
        navigate("/", { replace: true });
      } catch (err) {
        setModalStatus(err.message || "Failed to delete account");
        setModalLoading(false);
      }
    } else {
      // Deactivate is just a placeholder for now
      closeModal();
      if (typeof onLogout === "function") {
        onLogout();
      }
      navigate("/", { replace: true });
    }
  }

  function modalTitle() {
    switch (activeModal) {
      case "username": return "Edit your Username";
      case "screenname": return "Edit your Screen name";
      case "password": return "Change your password";
      case "email": return "Change Email Address";
      case "linked": return "Linked Accounts";
      case "2fa": return "Two-Factor Authentication";
      case "download": return "Download Your Data";
      case "sessions": return "Active Sessions";
      case "blocked": return "Blocked Users";
      case "mutedusers": return "Muted Users";
      case "muted": return "Muted Words";
      case "filters": return "Content Filters";
      case "dm": return "DM Permissions";
      case "playback": return "Playback Preferences";
      case "audioPrivacy": return "Audio Privacy";
      default: return "Edit Setting";
    }
  }

  // Update visibility
  async function handleVisibilityChange(newVisibility) {
    setVisibility(newVisibility);
    try {
      await usersApi.updatePreferences({ visibility: newVisibility });
    } catch (err) {
      console.error("Failed to update visibility:", err);
    }
  }

  // Save personal info
  async function handleSavePersonalInfo() {
    try {
      await usersApi.updateProfile({
        displayName: personalInfo.displayName,
        pronouns: personalInfo.pronouns,
        country: personalInfo.country,
        region: personalInfo.region,
        timezone: personalInfo.timezone,
      });
      setModalStatus("Saved successfully!");
    } catch (err) {
      setModalStatus(err.message || "Failed to save");
    }
  }

  // Handle data export
  async function handleDownloadData() {
    setModalLoading(true);
    try {
      const data = await settingsApi.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sable-data-export-${effectiveUsername}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setModalStatus("Download started!");
    } catch (err) {
      setModalStatus(err.message || "Failed to export data");
    } finally {
      setModalLoading(false);
    }
  }

  function renderMiniModalBody() {
    switch (activeModal) {
      case "username":
        return (
          <>
            <div className="st-mutedNote">
              Current username: <strong>{effectiveUsername}</strong>
              <br />
              Usernames must be 3-30 characters and can only contain letters, numbers, and underscores.
            </div>

            <div className="st-field st-field--modal">
              <div className="st-fieldLabel">New username</div>
              <input
                className="st-input"
                value={modalValue}
                onChange={(e) => setModalValue(e.target.value)}
                placeholder="e.g., john_smith"
              />
            </div>

            <div className="st-field st-field--modal">
              <div className="st-fieldLabel">Current password</div>
              <div className="st-inputWrap">
                <input
                  className="st-input"
                  type={showPassword2 ? "text" : "password"}
                  value={modalValue2}
                  onChange={(e) => setModalValue2(e.target.value)}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="st-passwordToggle"
                  onClick={() => setShowPassword2((v) => !v)}
                  aria-label={showPassword2 ? "Hide password" : "Show password"}
                >
                  <img src={showPassword2 ? visibleIcon : visibleOffIcon} alt="" style={{ width: 18, height: 18 }} />
                </button>
              </div>
            </div>

            {modalStatus && <div className="st-mutedNote" style={{ marginTop: 10, color: modalStatus.includes("success") ? "green" : "inherit" }}>{modalStatus}</div>}
          </>
        );

      case "screenname":
        return (
          <>
            <div className="st-mutedNote">
              Your screen name is how you appear publicly (display name).
            </div>

            <div className="st-field st-field--modal">
              <div className="st-fieldLabel">New screen name</div>
              <input
                className="st-input"
                value={modalValue}
                onChange={(e) => setModalValue(e.target.value)}
                placeholder="e.g., Caroline"
              />
            </div>

            <div className="st-mutedNote" style={{ marginTop: 10 }}>
              Preview: <strong>{(modalValue || displayName).toUpperCase()}</strong>
            </div>

            {modalStatus && <div className="st-mutedNote" style={{ marginTop: 10 }}>{modalStatus}</div>}
          </>
        );

      case "password":
        return (
          <>
            <div className="st-mutedNote">
              Enter your current password and choose a new one.
            </div>

            <div className="st-field st-field--modal">
              <div className="st-fieldLabel">Current password</div>
              <div className="st-inputWrap">
                <input
                  className="st-input"
                  value={modalValue3}
                  onChange={(e) => setModalValue3(e.target.value)}
                  placeholder="Current password"
                  type={showPassword3 ? "text" : "password"}
                />
                <button
                  type="button"
                  className="st-passwordToggle"
                  onClick={() => setShowPassword3((v) => !v)}
                  aria-label={showPassword3 ? "Hide password" : "Show password"}
                >
                  <img src={showPassword3 ? visibleIcon : visibleOffIcon} alt="" style={{ width: 18, height: 18 }} />
                </button>
              </div>
            </div>

            <div className="st-field st-field--modal">
              <div className="st-fieldLabel">New password</div>
              <div className="st-inputWrap">
                <input
                  className="st-input"
                  value={modalValue}
                  onChange={(e) => setModalValue(e.target.value)}
                  placeholder="New password (min 6 characters)"
                  type={showPassword ? "text" : "password"}
                />
                <button
                  type="button"
                  className="st-passwordToggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <img src={showPassword ? visibleIcon : visibleOffIcon} alt="" style={{ width: 18, height: 18 }} />
                </button>
              </div>
            </div>

            <div className="st-field st-field--modal">
              <div className="st-fieldLabel">Confirm new password</div>
              <div className="st-inputWrap">
                <input
                  className="st-input"
                  value={modalValue2}
                  onChange={(e) => setModalValue2(e.target.value)}
                  placeholder="Confirm password"
                  type={showPassword2 ? "text" : "password"}
                />
                <button
                  type="button"
                  className="st-passwordToggle"
                  onClick={() => setShowPassword2((v) => !v)}
                  aria-label={showPassword2 ? "Hide password" : "Show password"}
                >
                  <img src={showPassword2 ? visibleIcon : visibleOffIcon} alt="" style={{ width: 18, height: 18 }} />
                </button>
              </div>
            </div>

            {modalStatus && <div className="st-mutedNote" style={{ marginTop: 10, color: modalStatus.includes("success") ? "green" : "red" }}>{modalStatus}</div>}
          </>
        );

      case "email":
        return (
          <>
            <div className="st-mutedNote">
              Current email: <strong>{user?.email || "Not set"}</strong>
              <br />
              A verification email will be sent to your new address.
            </div>

            <div className="st-field st-field--modal">
              <div className="st-fieldLabel">New email address</div>
              <input
                className="st-input"
                value={modalValue}
                onChange={(e) => setModalValue(e.target.value)}
                placeholder="e.g., john.smith@gmail.com"
              />
            </div>

            <div className="st-field st-field--modal">
              <div className="st-fieldLabel">Current password</div>
              <div className="st-inputWrap">
                <input
                  className="st-input"
                  type={showPassword2 ? "text" : "password"}
                  value={modalValue2}
                  onChange={(e) => setModalValue2(e.target.value)}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="st-passwordToggle"
                  onClick={() => setShowPassword2((v) => !v)}
                  aria-label={showPassword2 ? "Hide password" : "Show password"}
                >
                  <img src={showPassword2 ? visibleIcon : visibleOffIcon} alt="" style={{ width: 18, height: 18 }} />
                </button>
              </div>
            </div>

            {modalStatus && <div className="st-mutedNote" style={{ marginTop: 10, color: modalStatus.includes("sent") ? "green" : "red" }}>{modalStatus}</div>}
          </>
        );

      case "linked":
        return (
          <>
            <div className="st-mutedNote">
              Link external accounts to make login easier.
            </div>

            <div className="st-pillStack" style={{ marginTop: 10 }}>
              {connectedAccounts.map((acc) => (
                <button
                  key={acc.provider}
                  type="button"
                  className="st-pillBtn"
                  onClick={async () => {
                    if (!hasPassword && connectedAccounts.length <= 1) {
                      setModalStatus("Cannot disconnect - you need at least one login method. Set a password first.");
                      return;
                    }
                    try {
                      await settingsApi.disconnectAccount(acc.provider);
                      setConnectedAccounts((prev) => prev.filter((a) => a.provider !== acc.provider));
                      setModalStatus(`${acc.provider} disconnected.`);
                    } catch (err) {
                      setModalStatus(err.message || "Failed to disconnect");
                    }
                  }}
                >
                  Disconnect {acc.provider} ({acc.email || acc.username})
                </button>
              ))}
              {connectedAccounts.length === 0 && (
                <div className="st-mutedNote">No accounts connected.</div>
              )}
            </div>

            <div className="st-mutedNote" style={{ marginTop: 12 }}>
              To connect a new account, log out and sign in with that provider.
            </div>

            {modalStatus && <div className="st-mutedNote" style={{ marginTop: 10 }}>{modalStatus}</div>}
          </>
        );

      case "2fa":
        return (
          <>
            <div className="st-mutedNote">
              Two-factor authentication adds a second step after your password.
              {user?.twoFactor?.enabled ? " 2FA is currently enabled." : " 2FA is not enabled."}
            </div>

            <div className="st-pillStack" style={{ marginTop: 10 }}>
              <button
                type="button"
                className="st-pillBtn st-pillBtn--primary"
                onClick={() => navigate("/settings/2fa")}
              >
                {user?.twoFactor?.enabled ? "Manage 2FA Settings" : "Enable Authenticator App"}
              </button>
            </div>

            {modalStatus && <div className="st-mutedNote" style={{ marginTop: 10 }}>{modalStatus}</div>}
          </>
        );

      case "download":
        return (
          <>
            <div className="st-mutedNote">
              Download all your data in JSON format. This includes your profile, works, drafts, and more.
            </div>

            {modalStatus && (
              <div className="st-mutedNote" style={{ marginTop: 10, color: "green" }}>
                {modalStatus}
              </div>
            )}
          </>
        );

      case "sessions":
        return (
          <>
            <div className="st-mutedNote">
              These are your active login sessions. You can log out of any session.
            </div>

            <div className="st-pillStack" style={{ marginTop: 10 }}>
              {sessions.map((s) => (
                <div key={s.id} className="st-sessionItem">
                  <div className="st-sessionInfo">
                    <strong>{s.browser}</strong> on {s.os} ({s.device})
                    {s.isCurrent && <span className="st-currentBadge"> (Current)</span>}
                    <br />
                    <span className="st-sessionMeta">
                      Last active: {new Date(s.lastActive).toLocaleString()}
                    </span>
                  </div>
                  {!s.isCurrent && (
                    <button
                      type="button"
                      className="st-pillBtn st-pillBtn--small"
                      onClick={async () => {
                        try {
                          await settingsApi.deleteSession(s.id);
                          setSessions((prev) => prev.filter((x) => x.id !== s.id));
                          setModalStatus("Session terminated.");
                        } catch (err) {
                          setModalStatus(err.message || "Failed to terminate session");
                        }
                      }}
                    >
                      Log out
                    </button>
                  )}
                </div>
              ))}
            </div>

            {sessions.length > 1 && (
              <button
                type="button"
                className="st-pillBtn"
                style={{ marginTop: 12 }}
                onClick={async () => {
                  try {
                    await settingsApi.deleteAllOtherSessions();
                    setSessions((prev) => prev.filter((s) => s.isCurrent));
                    setModalStatus("All other sessions terminated.");
                  } catch (err) {
                    setModalStatus(err.message || "Failed to terminate sessions");
                  }
                }}
              >
                Log out all other sessions
              </button>
            )}

            {modalStatus && <div className="st-mutedNote" style={{ marginTop: 10 }}>{modalStatus}</div>}
          </>
        );

      case "blocked":
        return (
          <>
            <div className="st-mutedNote">
              Blocked users cannot follow you, DM you, or interact with your content.
            </div>

            <div className="st-mutedNote" style={{ marginTop: 12 }}>
              Currently blocked:
            </div>

            <div className="st-pillStack" style={{ marginTop: 10 }}>
              {blockedUsers.map((u) => (
                <button
                  key={u._id}
                  type="button"
                  className="st-pillBtn"
                  onClick={async () => {
                    try {
                      await usersApi.unblockUser(u._id);
                      setBlockedUsers((prev) => prev.filter((x) => x._id !== u._id));
                      setModalStatus(`Unblocked @${u.username}`);
                    } catch (err) {
                      setModalStatus(err.message || "Failed to unblock");
                    }
                  }}
                >
                  Unblock @{u.username}
                </button>
              ))}
              {blockedUsers.length === 0 && <div className="st-mutedNote">No blocked users.</div>}
            </div>

            {modalStatus && <div className="st-mutedNote" style={{ marginTop: 10 }}>{modalStatus}</div>}
          </>
        );

      case "mutedusers":
        return (
          <>
            <div className="st-mutedNote">
              Muted users' posts won't appear in your feed, but they can still follow and message you.
            </div>

            <div className="st-mutedNote" style={{ marginTop: 12 }}>
              Currently muted:
            </div>

            <div className="st-pillStack" style={{ marginTop: 10 }}>
              {mutedUsers.map((u) => (
                <button
                  key={u._id}
                  type="button"
                  className="st-pillBtn"
                  onClick={async () => {
                    try {
                      await usersApi.unmuteUser(u._id);
                      setMutedUsers((prev) => prev.filter((x) => x._id !== u._id));
                      setModalStatus(`Unmuted @${u.username}`);
                    } catch (err) {
                      setModalStatus(err.message || "Failed to unmute");
                    }
                  }}
                >
                  Unmute @{u.username}
                </button>
              ))}
              {mutedUsers.length === 0 && <div className="st-mutedNote">No muted users.</div>}
            </div>

            {modalStatus && <div className="st-mutedNote" style={{ marginTop: 10 }}>{modalStatus}</div>}
          </>
        );

      case "muted":
        return (
          <>
            <div className="st-mutedNote">
              Muted words hide posts/comments containing those terms.
            </div>

            <div className="st-field st-field--modal">
              <div className="st-fieldLabel">Add muted word</div>
              <input
                className="st-input"
                value={modalValue}
                onChange={(e) => setModalValue(e.target.value)}
                placeholder="e.g., spoilers"
              />
            </div>

            <div className="st-pillStack" style={{ marginTop: 10 }}>
              <button
                type="button"
                className="st-pillBtn"
                disabled={modalLoading}
                onClick={async () => {
                  const v = modalValue.trim();
                  if (!v) return;
                  setModalLoading(true);
                  try {
                    await settingsApi.addMutedWord(v);
                    setMutedWords((prev) => [v, ...prev]);
                    setModalValue("");
                    setModalStatus(`Muted "${v}"`);
                  } catch (err) {
                    setModalStatus(err.message || "Failed to add word");
                  } finally {
                    setModalLoading(false);
                  }
                }}
              >
                Add
              </button>
            </div>

            <div className="st-mutedNote" style={{ marginTop: 12 }}>Muted list:</div>

            <div className="st-pillStack" style={{ marginTop: 10 }}>
              {mutedWords.map((w) => (
                <button
                  key={w}
                  type="button"
                  className="st-pillBtn"
                  onClick={async () => {
                    try {
                      await settingsApi.removeMutedWord(w);
                      setMutedWords((prev) => prev.filter((x) => x !== w));
                      setModalStatus(`Unmuted "${w}"`);
                    } catch (err) {
                      setModalStatus(err.message || "Failed to remove word");
                    }
                  }}
                >
                  Remove "{w}"
                </button>
              ))}
              {mutedWords.length === 0 && <div className="st-mutedNote">No muted words.</div>}
            </div>

            {modalStatus && <div className="st-mutedNote" style={{ marginTop: 10 }}>{modalStatus}</div>}
          </>
        );

      case "filters":
        return (
          <>
            <div className="st-mutedNote">
              Choose what types of content you want hidden by default.
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
                  onClick={async () => {
                    const newFilters = { ...contentFilters, [key]: !contentFilters[key] };
                    setContentFilters(newFilters);
                    try {
                      await usersApi.updateContentFilters(newFilters);
                    } catch (err) {
                      console.error("Failed to update filters:", err);
                    }
                  }}
                >
                  {contentFilters[key] ? "Hide " : "Show "}
                  {label}
                </button>
              ))}
            </div>

            {modalStatus && <div className="st-mutedNote" style={{ marginTop: 10 }}>{modalStatus}</div>}
          </>
        );

      case "dm":
        return (
          <>
            <div className="st-mutedNote">Control who can DM you.</div>

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
                  onClick={async () => {
                    setDmSetting(val);
                    try {
                      await usersApi.updatePreferences({ dmSetting: val });
                      setModalStatus(`DM permissions set to: ${label}`);
                    } catch (err) {
                      console.error("Failed to update DM setting:", err);
                    }
                  }}
                >
                  {dmSetting === val ? "* " : ""}
                  {label}
                </button>
              ))}
            </div>

            {modalStatus && <div className="st-mutedNote" style={{ marginTop: 10 }}>{modalStatus}</div>}
          </>
        );

      case "playback":
        return (
          <>
            <div className="st-mutedNote">
              Customize how audio behaves during playback.
            </div>

            <div className="st-pillStack" style={{ marginTop: 10 }}>
              <button
                type="button"
                className="st-pillBtn"
                aria-pressed={audioPrefs.autoplay}
                onClick={async () => {
                  const newPrefs = { ...audioPrefs, autoplay: !audioPrefs.autoplay };
                  setAudioPrefs(newPrefs);
                  try {
                    await usersApi.updatePreferences({ audioPrefs: newPrefs });
                  } catch (err) {
                    console.error("Failed to update audio prefs:", err);
                  }
                }}
              >
                {audioPrefs.autoplay ? "* " : ""}
                Autoplay Next Track
              </button>

              <button
                type="button"
                className="st-pillBtn"
                aria-pressed={audioPrefs.crossfade}
                onClick={async () => {
                  const newPrefs = { ...audioPrefs, crossfade: !audioPrefs.crossfade };
                  setAudioPrefs(newPrefs);
                  try {
                    await usersApi.updatePreferences({ audioPrefs: newPrefs });
                  } catch (err) {
                    console.error("Failed to update audio prefs:", err);
                  }
                }}
              >
                {audioPrefs.crossfade ? "* " : ""}
                Crossfade
              </button>

              <button
                type="button"
                className="st-pillBtn"
                onClick={async () => {
                  const newSeconds = Math.min(10, (audioPrefs.crossfadeSeconds || 0) + 1);
                  const newPrefs = { ...audioPrefs, crossfadeSeconds: newSeconds > 10 ? 1 : newSeconds };
                  setAudioPrefs(newPrefs);
                  try {
                    await usersApi.updatePreferences({ audioPrefs: newPrefs });
                  } catch (err) {
                    console.error("Failed to update audio prefs:", err);
                  }
                }}
              >
                Crossfade Seconds: {audioPrefs.crossfadeSeconds}
              </button>
            </div>

            {modalStatus && <div className="st-mutedNote" style={{ marginTop: 10 }}>{modalStatus}</div>}
          </>
        );

      case "audioPrivacy":
        return (
          <>
            <div className="st-mutedNote">
              Control what others can see about your listening and audio activity.
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
                  aria-pressed={privacySettings[key]}
                  onClick={async () => {
                    const newSettings = { ...privacySettings, [key]: !privacySettings[key] };
                    setPrivacySettings(newSettings);
                    try {
                      await settingsApi.updatePrivacy(newSettings);
                    } catch (err) {
                      console.error("Failed to update privacy:", err);
                    }
                  }}
                >
                  {privacySettings[key] ? "* " : ""}
                  {label}
                </button>
              ))}
            </div>

            {modalStatus && <div className="st-mutedNote" style={{ marginTop: 10 }}>{modalStatus}</div>}
          </>
        );

      default:
        return <div className="st-mutedNote">No settings available.</div>;
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
            onClick={handleDownloadData}
            disabled={modalLoading}
          >
            {modalLoading ? "Downloading..." : "Download Data"}
          </button>
        </div>
      );
    }

    // Username change
    if (activeModal === "username") {
      return (
        <div className="st-modalActions">
          <button type="button" className="st-actionBtn" onClick={closeModal}>
            Cancel
          </button>
          <button
            type="button"
            className="st-actionBtn st-actionBtn--primary"
            disabled={modalLoading}
            onClick={async () => {
              if (!modalValue.trim() || !modalValue2.trim()) {
                setModalStatus("Please fill in all fields");
                return;
              }
              setModalLoading(true);
              try {
                await settingsApi.changeUsername(modalValue.trim(), modalValue2);
                setModalStatus("Username updated successfully!");
                setUser((prev) => ({ ...prev, username: modalValue.trim().toLowerCase() }));
              } catch (err) {
                setModalStatus(err.message || "Failed to update username");
              } finally {
                setModalLoading(false);
              }
            }}
          >
            {modalLoading ? "Saving..." : "Save"}
          </button>
        </div>
      );
    }

    // Screen name change
    if (activeModal === "screenname") {
      return (
        <div className="st-modalActions">
          <button type="button" className="st-actionBtn" onClick={closeModal}>
            Cancel
          </button>
          <button
            type="button"
            className="st-actionBtn st-actionBtn--primary"
            disabled={modalLoading}
            onClick={async () => {
              if (!modalValue.trim()) {
                setModalStatus("Please enter a screen name");
                return;
              }
              setModalLoading(true);
              try {
                await usersApi.updateProfile({ displayName: modalValue.trim() });
                setModalStatus("Screen name updated!");
                setUser((prev) => ({ ...prev, displayName: modalValue.trim() }));
              } catch (err) {
                setModalStatus(err.message || "Failed to update screen name");
              } finally {
                setModalLoading(false);
              }
            }}
          >
            {modalLoading ? "Saving..." : "Save"}
          </button>
        </div>
      );
    }

    // Password change
    if (activeModal === "password") {
      return (
        <div className="st-modalActions">
          <button type="button" className="st-actionBtn" onClick={closeModal}>
            Cancel
          </button>
          <button
            type="button"
            className="st-actionBtn st-actionBtn--primary"
            disabled={modalLoading}
            onClick={async () => {
              if (modalValue !== modalValue2) {
                setModalStatus("Passwords do not match");
                return;
              }
              if (modalValue.length < 6) {
                setModalStatus("Password must be at least 6 characters");
                return;
              }
              setModalLoading(true);
              try {
                await settingsApi.changePassword(modalValue3, modalValue);
                setModalStatus("Password updated successfully!");
                setModalValue("");
                setModalValue2("");
                setModalValue3("");
              } catch (err) {
                setModalStatus(err.message || "Failed to update password");
              } finally {
                setModalLoading(false);
              }
            }}
          >
            {modalLoading ? "Saving..." : "Save"}
          </button>
        </div>
      );
    }

    // Email change
    if (activeModal === "email") {
      return (
        <div className="st-modalActions">
          <button type="button" className="st-actionBtn" onClick={closeModal}>
            Cancel
          </button>
          <button
            type="button"
            className="st-actionBtn st-actionBtn--primary"
            disabled={modalLoading}
            onClick={async () => {
              if (!modalValue.trim() || !modalValue2.trim()) {
                setModalStatus("Please fill in all fields");
                return;
              }
              setModalLoading(true);
              try {
                await settingsApi.changeEmail(modalValue.trim(), modalValue2);
                setModalStatus("Verification email sent to your new address!");
              } catch (err) {
                setModalStatus(err.message || "Failed to update email");
              } finally {
                setModalLoading(false);
              }
            }}
          >
            {modalLoading ? "Saving..." : "Send Verification"}
          </button>
        </div>
      );
    }

    // Close-only modals
    const closeOnly = ["linked", "2fa", "blocked", "muted", "filters", "dm", "playback", "audioPrivacy", "sessions"];
    if (closeOnly.includes(activeModal)) {
      return (
        <div className="st-modalActions">
          <button type="button" className="st-actionBtn st-actionBtn--primary" onClick={closeModal}>
            Done
          </button>
        </div>
      );
    }

    return (
      <div className="st-modalActions">
        <button type="button" className="st-actionBtn" onClick={closeModal}>
          Cancel
        </button>
        <button type="button" className="st-actionBtn st-actionBtn--primary" onClick={closeModal}>
          Save
        </button>
      </div>
    );
  }

  async function handleSkinSave() {
    if (!skinName.trim()) {
      setSkinError("Please enter a skin name.");
      return;
    }
    if (!skinCss.trim()) {
      setSkinError("Please enter some CSS.");
      return;
    }

    setSkinSaving(true);
    setSkinError("");

    try {
      const appliesTo = skinAppliesTo === "Community Page" ? "community" : "work";
      const data = await skinsApi.create(skinName.trim(), appliesTo, skinCss.trim());

      // Add to local list
      setCustomSkins((prev) => [data.skin, ...prev]);

      // Reset form
      setSkinName("");
      setSkinAppliesTo("work");
      setSkinCss("/* Example */\n.wv-card {\n  background: rgba(255,255,255,0.8);\n}\n");
      closeModal();
    } catch (err) {
      setSkinError(err.message || "Failed to save skin. Please try again.");
    } finally {
      setSkinSaving(false);
    }
  }

  async function handleSkinDelete(skinId) {
    if (!window.confirm("Are you sure you want to delete this skin?")) return;

    try {
      await skinsApi.delete(skinId);
      setCustomSkins((prev) => prev.filter((s) => s._id !== skinId));
    } catch (err) {
      console.error("Failed to delete skin:", err);
    }
  }

  function handleSkinEdit(skin) {
    setEditingSkin(skin);
    setSkinName(skin.name);
    setSkinAppliesTo(skin.appliesTo === "community" ? "Community Page" : "work");
    setSkinCss(skin.css);
    setSkinError("");
    openModal("createSkin");
  }

  async function handleSkinUpdate() {
    if (!skinName.trim()) {
      setSkinError("Please enter a skin name.");
      return;
    }
    if (!skinCss.trim()) {
      setSkinError("Please enter some CSS.");
      return;
    }

    setSkinSaving(true);
    setSkinError("");

    try {
      const appliesTo = skinAppliesTo === "Community Page" ? "community" : "work";
      const data = await skinsApi.update(editingSkin._id, {
        name: skinName.trim(),
        appliesTo,
        css: skinCss.trim(),
      });

      // Update in local list
      setCustomSkins((prev) =>
        prev.map((s) => (s._id === editingSkin._id ? data.skin : s))
      );

      // Reset form
      setEditingSkin(null);
      setSkinName("");
      setSkinAppliesTo("work");
      setSkinCss("/* Example */\n.wv-card {\n  background: rgba(255,255,255,0.8);\n}\n");
      closeModal();
    } catch (err) {
      setSkinError(err.message || "Failed to update skin. Please try again.");
    } finally {
      setSkinSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="st">
        <SableLoader />
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

            <button
              type="button"
              className={`st-sideBtn ${activeNav === "interests" ? "is-active" : ""}`}
              onClick={() => setActiveNav("interests")}
            >
              Reading Preferences
            </button>
          </aside>

          {/* Center */}
          <main className="st-main" aria-label="Settings content">

            {/* Account */}
            {activeNav === "account" && (
              <>
                <h1 className="st-title">ACCOUNT</h1>
                <p className="st-subtitle">
                  Manage core account settings and security.
                </p>

                <section className="st-sectionCard" aria-label="Account actions">
                  <div className="st-cardTitleRow">
                    <div className="st-cardTitle">Account Actions</div>
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
                      Change your password
                    </button>

                    <button type="button" className="st-pillBtn" onClick={() => openModal("email")}>
                      Change Email Address
                    </button>

                    <button type="button" className="st-pillBtn" onClick={() => openModal("linked")}>
                      Linked Accounts
                    </button>

                    <button type="button" className="st-pillBtn" onClick={() => openModal("2fa")}>
                      Two-Factor Authentication
                    </button>

                    <button type="button" className="st-pillBtn" onClick={() => openModal("sessions")}>
                      Active Sessions
                    </button>
                  </div>
                </section>

                <section className="st-sectionCard st-sectionCard--tight" aria-label="Data and account">
                  <div className="st-cardTitleRow">
                    <div className="st-cardTitle">Data &amp; Account</div>
                  </div>

                  <div className="st-ctaRow">
                    <button type="button" className="st-actionBtn" onClick={() => openModal("download")}>
                      Download Your Data
                    </button>

                    <button
                      type="button"
                      className="st-actionBtn"
                      onClick={async () => {
                        try {
                          await authApi.logout();
                        } catch {
                          // Ignore errors
                        }
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
                  These details help personalize your account experience.
                </p>

                <section className="st-sectionCard" aria-label="Personal info form">
                  <div className="st-formGrid">
                    <div className="st-field">
                      <div className="st-fieldLabel">Display Name</div>
                      <input
                        className="st-input"
                        placeholder="e.g., John Smith"
                        value={personalInfo.displayName}
                        onChange={(e) => setPersonalInfo((p) => ({ ...p, displayName: e.target.value }))}
                      />
                    </div>

                    <div className="st-field">
                      <div className="st-fieldLabel">Time Zone</div>
                      <select
                        className="st-input"
                        value={personalInfo.timezone}
                        onChange={(e) => setPersonalInfo((p) => ({ ...p, timezone: e.target.value }))}
                      >
                        <option value="America/New_York">America/New_York</option>
                        <option value="America/Chicago">America/Chicago</option>
                        <option value="America/Denver">America/Denver</option>
                        <option value="America/Los_Angeles">America/Los_Angeles</option>
                        <option value="Europe/London">Europe/London</option>
                        <option value="Europe/Paris">Europe/Paris</option>
                        <option value="Asia/Tokyo">Asia/Tokyo</option>
                      </select>
                    </div>

                    <div className="st-field">
                      <div className="st-fieldLabel">Country</div>
                      <input
                        className="st-input"
                        value={personalInfo.country}
                        onChange={(e) => setPersonalInfo((p) => ({ ...p, country: e.target.value }))}
                      />
                    </div>

                    <div className="st-field">
                      <div className="st-fieldLabel">Region / State</div>
                      <input
                        className="st-input"
                        placeholder="Region"
                        value={personalInfo.region}
                        onChange={(e) => setPersonalInfo((p) => ({ ...p, region: e.target.value }))}
                      />
                    </div>

                    <div className="st-field">
                      <div className="st-fieldLabel">Pronouns</div>
                      <input
                        className="st-input"
                        placeholder="e.g., she/her, they/them"
                        value={personalInfo.pronouns}
                        onChange={(e) => setPersonalInfo((p) => ({ ...p, pronouns: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="st-formFooter">
                    {modalStatus && <div className="st-mutedNote">{modalStatus}</div>}
                    <button type="button" className="st-saveBtn" onClick={handleSavePersonalInfo}>
                      Save Changes
                    </button>
                  </div>
                </section>
              </>
            )}

            {/* Privacy */}
            {activeNav === "privacy" && (
              <>
                <h1 className="st-title">Privacy</h1>
                <p className="st-subtitle">Control how others can interact with you.</p>

                <div className="st-pillStack" aria-label="Privacy options">
                  <button type="button" className="st-pillBtn" onClick={() => openModal("blocked")}>
                    Blocked Users ({blockedUsers.length})
                  </button>
                  <button type="button" className="st-pillBtn" onClick={() => openModal("mutedusers")}>
                    Muted Users ({mutedUsers.length})
                  </button>
                  <button type="button" className="st-pillBtn" onClick={() => openModal("muted")}>
                    Muted Words ({mutedWords.length})
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
                    <span className="st-newSkinIcon">+</span>
                    New Skin
                  </button>
                </div>

                <p className="st-subtitle">
                  Choose reading skins for works. When you select a skin in the editor, readers will see that theme when viewing.
                </p>

                <div className="st-skinsBlock">
                  <h2 className="st-skinsHeader">Built-in Work Skins</h2>
                  <p className="st-mutedNote" style={{ marginBottom: 12 }}>
                    These skins are available in the work editor under the "Skin" option.
                  </p>

                  <div className="st-skinTray" aria-label="Work skins">
                    <div className="st-skinTile st-skinTile--builtin">
                      <div className="st-skinPreview st-skinPreview--default">
                        <div className="st-skinPreviewText">Aa</div>
                      </div>
                      <div className="st-skinName">Default</div>
                      <div className="st-skinDesc">Classic Sable - warm, forest-inspired reading</div>
                    </div>

                    <div className="st-skinTile st-skinTile--builtin">
                      <div className="st-skinPreview st-skinPreview--parchment">
                        <div className="st-skinPreviewText">Aa</div>
                      </div>
                      <div className="st-skinName">Parchment</div>
                      <div className="st-skinDesc">Warm cream tones with sepia accents</div>
                    </div>

                    <div className="st-skinTile st-skinTile--empty" aria-hidden="true" />
                    <div className="st-skinTile st-skinTile--empty" aria-hidden="true" />
                  </div>
                </div>

                <div className="st-skinsBlock" style={{ marginTop: 24 }}>
                  <h2 className="st-skinsHeader">Custom Skins</h2>
                  <p className="st-mutedNote" style={{ marginBottom: 12 }}>
                    Create your own CSS skins. See the <a href="/faq#skins" style={{ color: "#244b2b" }}>FAQ</a> for a tutorial.
                  </p>

                  <div className="st-skinTray" aria-label="Custom skins">
                    {customSkins.length === 0 ? (
                      <>
                        <div className="st-skinTile st-skinTile--empty">
                          <div className="st-skinEmptyText">No custom skins yet</div>
                        </div>
                        <div className="st-skinTile st-skinTile--empty" aria-hidden="true" />
                        <div className="st-skinTile st-skinTile--empty" aria-hidden="true" />
                        <div className="st-skinTile st-skinTile--empty" aria-hidden="true" />
                      </>
                    ) : (
                      <>
                        {customSkins.map((skin) => (
                          <div key={skin._id} className="st-skinTile st-skinTile--custom">
                            <div className="st-skinPreview st-skinPreview--custom">
                              <div className="st-skinPreviewText">Aa</div>
                            </div>
                            <div className="st-skinName">{skin.name}</div>
                            <div className="st-skinDesc">
                              {skin.appliesTo === "work" ? "Works" : "Community Page"}
                            </div>
                            <div className="st-skinActions">
                              <button
                                type="button"
                                className="st-skinEditBtn"
                                onClick={() => handleSkinEdit(skin)}
                                aria-label={`Edit ${skin.name}`}
                                title="Edit skin"
                              >
                                ✎
                              </button>
                              <button
                                type="button"
                                className="st-skinDeleteBtn"
                                onClick={() => handleSkinDelete(skin._id)}
                                aria-label={`Delete ${skin.name}`}
                                title="Delete skin"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                        {/* Fill remaining slots */}
                        {customSkins.length < 4 && Array(4 - customSkins.length).fill(null).map((_, i) => (
                          <div key={`empty-${i}`} className="st-skinTile st-skinTile--empty" aria-hidden="true" />
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Audio */}
            {activeNav === "audio" && (
              <>
                <h1 className="st-title">Audio</h1>
                <p className="st-subtitle">Audio preferences and privacy settings.</p>

                <div className="st-pillStack" aria-label="Audio options">
                  <button type="button" className="st-pillBtn" onClick={() => openModal("playback")}>
                    Playback Preferences
                  </button>
                  <button type="button" className="st-pillBtn" onClick={() => openModal("audioPrivacy")}>
                    Audio Privacy
                  </button>
                </div>
              </>
            )}

            {/* Reading Preferences / Interests */}
            {activeNav === "interests" && (
              <>
                <h1 className="st-title">Reading Preferences</h1>
                <p className="st-subtitle">
                  Select your favorite genres and fandoms to get personalized recommendations on your home page.
                </p>

                <section className="st-sectionCard" aria-label="Genre preferences">
                  <div className="st-cardTitleRow">
                    <div className="st-cardTitle">Genres</div>
                    <span className="st-cardCount">{selectedGenres.length}/5</span>
                  </div>

                  <div className="st-interestGrid">
                    {interestOptions.genres.map((genre) => (
                      <button
                        key={genre.slug}
                        type="button"
                        className={`st-interestChip ${selectedGenres.includes(genre.slug) ? "st-interestChip--selected" : ""}`}
                        onClick={() => {
                          setSelectedGenres((prev) => {
                            if (prev.includes(genre.slug)) {
                              return prev.filter((g) => g !== genre.slug);
                            }
                            if (prev.length >= 5) return prev;
                            return [...prev, genre.slug];
                          });
                        }}
                        disabled={interestsSaving}
                      >
                        <span className="st-interestIcon">{genre.icon}</span>
                        <span>{genre.name}</span>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="st-sectionCard" aria-label="Fandom preferences">
                  <div className="st-cardTitleRow">
                    <div className="st-cardTitle">Fandoms</div>
                    <span className="st-cardCount">{selectedFandoms.length}/10</span>
                  </div>

                  <div className="st-interestGrid">
                    {interestOptions.fandoms.map((fandom) => (
                      <button
                        key={fandom.slug}
                        type="button"
                        className={`st-interestChip st-interestChip--fandom ${selectedFandoms.includes(fandom.slug) ? "st-interestChip--selected" : ""}`}
                        onClick={() => {
                          setSelectedFandoms((prev) => {
                            if (prev.includes(fandom.slug)) {
                              return prev.filter((f) => f !== fandom.slug);
                            }
                            if (prev.length >= 10) return prev;
                            return [...prev, fandom.slug];
                          });
                        }}
                        disabled={interestsSaving}
                      >
                        <span>{fandom.name}</span>
                        <span className="st-interestCategory">{fandom.category}</span>
                      </button>
                    ))}
                  </div>
                </section>

                <div className="st-formFooter">
                  {modalStatus && <div className="st-mutedNote">{modalStatus}</div>}
                  <button
                    type="button"
                    className="st-saveBtn"
                    disabled={interestsSaving}
                    onClick={async () => {
                      setInterestsSaving(true);
                      setModalStatus("");
                      try {
                        const data = await authApi.saveInterests({
                          genres: selectedGenres,
                          fandoms: selectedFandoms,
                        });
                        setUser(data.user);
                        setModalStatus("Preferences saved!");
                      } catch (err) {
                        setModalStatus(err.message || "Failed to save preferences");
                      } finally {
                        setInterestsSaving(false);
                      }
                    }}
                  >
                    {interestsSaving ? "Saving..." : "Save Preferences"}
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
                  <img className="st-avatar" src={user?.avatarUrl || profileImg} alt="Profile" />
                </div>

                <div className="st-profileNames">
                  <div className="st-screenName">{displayName.toUpperCase()}</div>
                  <div className="st-username">{effectiveUsername}</div>
                </div>
              </div>
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
                    onChange={() => handleVisibilityChange("public")}
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
                    onChange={() => handleVisibilityChange("private")}
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
                    onChange={() => handleVisibilityChange("invisible")}
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
              x
            </button>

            <div className="st-goodbye">
              <div className="st-goodbyeTitle">Sad To See You Go!</div>
              <div className="st-goodbyeMsg">
                Are you sure you want to {goodbyeActionLabel()} your account?
                {activeModal === "delete" && " This action cannot be undone."}
              </div>

              {activeModal === "delete" && (
                <div className="st-field st-field--modal" style={{ marginTop: 16 }}>
                  <div className="st-fieldLabel">Enter your password to confirm</div>
                  <div className="st-inputWrap">
                    <input
                      className="st-input"
                      type={showPassword ? "text" : "password"}
                      value={modalValue}
                      onChange={(e) => setModalValue(e.target.value)}
                      placeholder="Your password"
                    />
                    <button
                      type="button"
                      className="st-passwordToggle"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      <img src={showPassword ? visibleIcon : visibleOffIcon} alt="" style={{ width: 18, height: 18 }} />
                    </button>
                  </div>
                </div>
              )}

              {modalStatus && <div className="st-mutedNote" style={{ marginTop: 10, color: "red" }}>{modalStatus}</div>}

              <div className="st-goodbyeActions">
                <button
                  type="button"
                  className="st-goodbyeBtn"
                  onClick={handleConfirmGoodbye}
                  disabled={modalLoading || (activeModal === "delete" && !modalValue)}
                >
                  {modalLoading ? "Processing..." : "Yes"}
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
        <div className="st-modalOverlay" role="dialog" aria-modal="true" onClick={skinSaving ? undefined : closeModal}>
          <div className="st-modal st-modal--wide" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="st-modalClose" onClick={closeModal} disabled={skinSaving} aria-label="Close">
              x
            </button>

            <div className="st-skinModalHead">
              <div className="st-skinModalTitle">{editingSkin ? "Edit Skin" : "Create A New Skin"}</div>
              <div className="st-skinModalSub">Write CSS below to customize how your works look. Your skins will be available in the work editor.</div>
            </div>

            <div className="st-skinForm">
              <div className="st-field">
                <div className="st-fieldLabel">Skin Name</div>
                <input
                  className="st-input"
                  value={skinName}
                  onChange={(e) => setSkinName(e.target.value)}
                  placeholder="e.g., Medieval Manuscript"
                  disabled={skinSaving}
                />
              </div>

              <div className="st-field">
                <div className="st-fieldLabel">Applies To</div>
                <select
                  className="st-input"
                  value={skinAppliesTo}
                  onChange={(e) => setSkinAppliesTo(e.target.value)}
                  disabled={skinSaving}
                >
                  <option value="work">Works</option>
                  <option value="community">Community Page</option>
                </select>
              </div>

              <div className="st-field">
                <div className="st-fieldLabel">CSS</div>
                <textarea
                  className="st-textarea"
                  value={skinCss}
                  onChange={(e) => setSkinCss(e.target.value)}
                  placeholder="/* Your custom CSS here */"
                  disabled={skinSaving}
                  style={{ minHeight: 300, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace" }}
                />
              </div>

              {skinError && (
                <div className="st-mutedNote" style={{ color: "red", marginTop: 8 }}>{skinError}</div>
              )}
            </div>

            <div className="st-modalActions">
              <button type="button" className="st-actionBtn" onClick={() => { closeModal(); setEditingSkin(null); }} disabled={skinSaving}>
                Cancel
              </button>
              <button
                type="button"
                className="st-actionBtn st-actionBtn--primary"
                onClick={editingSkin ? handleSkinUpdate : handleSkinSave}
                disabled={skinSaving}
              >
                {skinSaving ? "Saving..." : editingSkin ? "Update Skin" : "Save Skin"}
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
              x
            </button>

            <div className="st-miniModalHead">
              <div className="st-miniTitle">{modalTitle()}</div>
            </div>

            <div className="st-miniBody">{renderMiniModalBody()}</div>

            {renderMiniModalActions()}
          </div>
        </div>
      )}
    </div>
  );
}
