import React from "react";
import { useNavigate } from "react-router-dom";
import "./YourWorks.css";

const MOCK_WORKS = [
  { id: "w1", title: "Title" },
  { id: "w2", title: "Title" },
  { id: "w3", title: "Title" },
  { id: "w4", title: "Title" },
  { id: "w5", title: "Title" },
  { id: "w6", title: "Title" },
];

export default function YourWorks() {
  const navigate = useNavigate();

  return (
    <div className="yw-page">
      <div className="yw-shell">
        <h1 className="yw-title">Your Works</h1>

        <div className="yw-layout">
          <section className="yw-gridWrap" aria-label="Your works list">
            <div className="yw-grid">
              {MOCK_WORKS.map((w) => (
                <div key={w.id} className="yw-work">
                  <div className="yw-cover" />
                  <div className="yw-workTitle">{w.title}</div>
                  <button
                    type="button"
                    className="yw-editLink"
                    onClick={() => navigate("/drafts")}
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          </section>

          <aside className="yw-side" aria-label="Work actions">
            <button type="button" className="yw-ornateBtn yw-ornateBtn--primary" onClick={() => navigate("/new-draft")}>
              New Draft
            </button>

            <button type="button" className="yw-ornateBtn" onClick={() => navigate("/drafts")}>
              Edit Existing Drafts
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}
