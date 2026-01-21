import React from "react";
import "./YourCommunityPage.css";

import bannerImg from "../assets/images/community_banner.png";
import profileImg from "../assets/images/profile_picture.png";

import editBannerIcon from "../assets/images/edit_banner.png";
import editProfileIcon from "../assets/images/edit_profile_picture.png";
import subtractWidgetIcon from "../assets/images/subtract_widget.png";

export default function YourCommunityPage({ username }) {
  const initialDisplayName = (username || "john.doe").toUpperCase();

  const [isEditing, setIsEditing] = React.useState(false);

  // Front-end "saved" profile fields
  const [displayName, setDisplayName] = React.useState(initialDisplayName);
  const [handle] = React.useState("@User4658");
  const [bio, setBio] = React.useState(
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus."
  );
  const [link, setLink] = React.useState("x.com/user4658");
  const [visibility, setVisibility] = React.useState("public"); // public | private | following

  // Draft fields used only in edit mode
  const [draftName, setDraftName] = React.useState(displayName);
  const [draftBio, setDraftBio] = React.useState(bio);
  const [draftLink, setDraftLink] = React.useState(link);
  const [draftVisibility, setDraftVisibility] = React.useState(visibility);

  function openEdit() {
    setDraftName(displayName);
    setDraftBio(bio);
    setDraftLink(link);
    setDraftVisibility(visibility);
    setIsEditing(true);
  }

  function saveAndClose() {
    setDisplayName((draftName || "").trim() || initialDisplayName);
    setBio(draftBio || "");
    setLink((draftLink || "").trim());
    setVisibility(draftVisibility);
    setIsEditing(false);
  }

  return (
    <div className="ycp">
      {/* Banner */}
      <section
        className="ycp-banner"
        style={{ backgroundImage: `url(${bannerImg})` }}
        aria-label="Community banner"
      >
        <button
          type="button"
          className="ycp-bannerEditBtn"
          onClick={openEdit}
          aria-label="Edit community page"
          title="Edit"
        >
          <img className="ycp-bannerEditIcon" src={editBannerIcon} alt="" aria-hidden="true" />
        </button>
      </section>

      <section className="ycp-card" aria-label="Community profile">
        {/* Avatar */}
        <div className="ycp-avatarWrap">
          <img className="ycp-avatar" src={profileImg} alt="Profile" />

          {isEditing ? (
            <button
              type="button"
              className="ycp-avatarEditBtn"
              aria-label="Edit profile picture"
              title="Edit profile picture"
              onClick={() => {
                // front-end only for now
                // later: open upload dialog / cropper etc.
              }}
            >
              <img className="ycp-avatarEditIcon" src={editProfileIcon} alt="" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        {/* VIEW MODE */}
        {!isEditing ? (
          <div className="ycp-grid">
            <div className="ycp-left">
              <div className="ycp-nameRow">
                <h1 className="ycp-name">{displayName}</h1>

                <div className="ycp-actions" aria-label="Profile actions">
                  <button type="button" className="ycp-actionBtn" aria-label="Edit">
                    ✎
                  </button>
                  <button type="button" className="ycp-actionBtn" aria-label="Search">
                    🔍
                  </button>
                  <button type="button" className="ycp-actionBtn" aria-label="Share">
                    ⤴︎
                  </button>
                </div>
              </div>

              <div className="ycp-handle">{handle}</div>

              <p className="ycp-bio">{bio}</p>

              <div className="ycp-linkRow">
                <span className="ycp-linkIcon" aria-hidden="true">
                  🔗
                </span>
                <span className="ycp-linkText">{link}</span>
              </div>

              <div className="ycp-tabs" role="tablist" aria-label="Community tabs">
                <button type="button" className="ycp-tab ycp-tab--active" role="tab">
                  Works
                </button>
                <button type="button" className="ycp-tab" role="tab">
                  Reading List
                </button>
                <button type="button" className="ycp-tab" role="tab">
                  Skins
                </button>
                <button type="button" className="ycp-tab" role="tab">
                  Audios
                </button>
              </div>

              <div className="ycp-worksRow" aria-label="Works">
                <div className="ycp-workCard" role="button" tabIndex={0} aria-label="Work 1 (placeholder)">
                  <div className="ycp-workCover ycp-workCover--placeholder" />
                </div>
                <div className="ycp-workCard" role="button" tabIndex={0} aria-label="Work 2 (placeholder)">
                  <div className="ycp-workCover ycp-workCover--placeholder" />
                </div>
                <div className="ycp-workCard" role="button" tabIndex={0} aria-label="Work 3 (placeholder)">
                  <div className="ycp-workCover ycp-workCover--placeholder" />
                </div>
              </div>
            </div>

            <aside className="ycp-right" aria-label="Community panels">
              <div className="ycp-panels">
                <div className="ycp-panel">
                  <div className="ycp-panelTitle">Announcements</div>
                  <div className="ycp-panelBox" />
                </div>

                <div className="ycp-panel">
                  <div className="ycp-panelTitle">Donations</div>
                  <div className="ycp-panelBox" />
                </div>

                <div className="ycp-panel">
                  <div className="ycp-panelTitle">Recent Works</div>
                  <div className="ycp-panelBox" />
                </div>

                <div className="ycp-panel">
                  <div className="ycp-panelTitle">Chatroom</div>
                  <div className="ycp-panelBox" />
                </div>
              </div>
            </aside>
          </div>
        ) : null}

        {/* EDIT MODE */}
        {isEditing ? (
          <div className="ycp-editGrid" aria-label="Edit community page">
            {/* Left form */}
            <div className="ycp-editLeft">
              <div className="ycp-editRow">
                <div className="ycp-editLabel">Name</div>
                <input
                  className="ycp-editInput"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  aria-label="Name"
                />
              </div>

              <div className="ycp-editRow ycp-editRow--bio">
                <div className="ycp-editLabel">Bio</div>
                <textarea
                  className="ycp-editTextarea"
                  value={draftBio}
                  onChange={(e) => setDraftBio(e.target.value)}
                  aria-label="Bio"
                />
              </div>

              <div className="ycp-editRow">
                <div className="ycp-editLabel">Links</div>
                <input
                  className="ycp-editInput"
                  value={draftLink}
                  onChange={(e) => setDraftLink(e.target.value)}
                  aria-label="Links"
                />
              </div>

              <div className="ycp-editRow ycp-editRow--visibility">
                <div className="ycp-editLabel">Visibility</div>

                <div className="ycp-visibilityGroup" role="radiogroup" aria-label="Visibility">
                  <label className="ycp-radio">
                    <input
                      type="radio"
                      name="visibility"
                      value="public"
                      checked={draftVisibility === "public"}
                      onChange={() => setDraftVisibility("public")}
                    />
                    <div className="ycp-radioText">
                      <div className="ycp-radioTitle">Public</div>
                      <div className="ycp-radioSub">Visible to Everyone</div>
                    </div>
                  </label>

                  <label className="ycp-radio">
                    <input
                      type="radio"
                      name="visibility"
                      value="private"
                      checked={draftVisibility === "private"}
                      onChange={() => setDraftVisibility("private")}
                    />
                    <div className="ycp-radioText">
                      <div className="ycp-radioTitle">Private</div>
                      <div className="ycp-radioSub">Visible only to you</div>
                    </div>
                  </label>

                  <label className="ycp-radio">
                    <input
                      type="radio"
                      name="visibility"
                      value="following"
                      checked={draftVisibility === "following"}
                      onChange={() => setDraftVisibility("following")}
                    />
                    <div className="ycp-radioText">
                      <div className="ycp-radioTitle">Following</div>
                      <div className="ycp-radioSub">Visible only to those who follow you</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="ycp-editActions">
                <button type="button" className="ycp-doneBtn" onClick={saveAndClose}>
                  Done
                </button>
              </div>
            </div>

            {/* Right widgets */}
            <aside className="ycp-editRight" aria-label="Widgets">
              <div className="ycp-widgetsTitle">Widgets</div>

              <div className="ycp-panels ycp-panels--edit">
                <div className="ycp-panel ycp-panel--edit">
                  <div className="ycp-panelTitle">Announcements</div>
                  <div className="ycp-panelBox ycp-panelBox--edit">
                    <button
                      type="button"
                      className="ycp-subtractBtn"
                      aria-label="Remove Announcements widget"
                      title="Remove"
                      onClick={() => {
                        // front-end only for now
                      }}
                    >
                      <img src={subtractWidgetIcon} alt="" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="ycp-panel ycp-panel--edit">
                  <div className="ycp-panelTitle">Donations</div>
                  <div className="ycp-panelBox ycp-panelBox--edit">
                    <button
                      type="button"
                      className="ycp-subtractBtn"
                      aria-label="Remove Donations widget"
                      title="Remove"
                      onClick={() => {}}
                    >
                      <img src={subtractWidgetIcon} alt="" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="ycp-panel ycp-panel--edit">
                  <div className="ycp-panelTitle">Recent Works</div>
                  <div className="ycp-panelBox ycp-panelBox--edit">
                    <button
                      type="button"
                      className="ycp-subtractBtn"
                      aria-label="Remove Recent Works widget"
                      title="Remove"
                      onClick={() => {}}
                    >
                      <img src={subtractWidgetIcon} alt="" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="ycp-panel ycp-panel--edit">
                  <div className="ycp-panelTitle">Chatroom</div>
                  <div className="ycp-panelBox ycp-panelBox--edit">
                    <button
                      type="button"
                      className="ycp-subtractBtn"
                      aria-label="Remove Chatroom widget"
                      title="Remove"
                      onClick={() => {}}
                    >
                      <img src={subtractWidgetIcon} alt="" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        ) : null}
      </section>
    </div>
  );
}

