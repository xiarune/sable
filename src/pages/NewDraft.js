import React from "react";
import "./NewDraft.css";

function ActionPill({ icon, label, onClick }) {
  return (
    <button type="button" className="nd-pill" onClick={onClick} aria-label={label} title={label}>
      <span className="nd-pillIcon" aria-hidden="true">
        {icon}
      </span>
      <span className="nd-pillLabel">{label}</span>
    </button>
  );
}

export default function NewDraft() {
  const [body, setBody] = React.useState("");

  return (
    <div className="nd-page">
      <h1 className="nd-title">New Draft</h1>

      <section className="nd-card" aria-label="New Draft Editor">
        <div className="nd-pillRow" aria-label="Draft tools">
          <ActionPill
            label="Import Work"
            icon="☁︎"
            onClick={() => {
              // front-end placeholder
            }}
          />
          <ActionPill
            label="Tags"
            icon="🏷"
            onClick={() => {
              // front-end placeholder
            }}
          />
          <ActionPill
            label="Skin"
            icon="★"
            onClick={() => {
              // front-end placeholder
            }}
          />
          <ActionPill
            label="Privacy"
            icon="🌐"
            onClick={() => {
              // front-end placeholder
            }}
          />
          <ActionPill
            label="Language"
            icon="🗨"
            onClick={() => {
              // front-end placeholder
            }}
          />
          <ActionPill
            label="Audio"
            icon="🎧"
            onClick={() => {
              // front-end placeholder
            }}
          />
        </div>

        <div className="nd-bodyLabel">Work Body</div>

        <textarea
          className="nd-textarea"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder=""
          aria-label="Work body"
        />

        <div className="nd-actions" aria-label="Draft actions">
          <button
            type="button"
            className="nd-ornateBtn"
            onClick={() => {
              // front-end placeholder
              // later: post flow
              console.log("Post clicked:", body);
            }}
          >
            Post
          </button>

          <button
            type="button"
            className="nd-ornateBtn"
            onClick={() => {
              // front-end placeholder
              // later: save flow
              console.log("Save Draft clicked:", body);
            }}
          >
            Save Draft
          </button>
        </div>
      </section>
    </div>
  );
}
