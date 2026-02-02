import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./ReadWork.css";

const WORKS_KEY = "sable_published_v1";

function loadWorks() {
  try {
    const raw = localStorage.getItem(WORKS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function ReadWork({ isAuthed, username }) {
  const { workId } = useParams();
  const navigate = useNavigate();

  const works = React.useMemo(loadWorks, []);
  const work = works.find(w => String(w.id) === String(workId));

  if (!work) {
    return (
      <div className="rw-page">
        <div className="rw-shell">
          <p>Work not found.</p>
        </div>
      </div>
    );
  }

  const isOwner = isAuthed && work.author === username;

  return (
    <div className="rw-page">
      <div className="rw-shell">
        <header className="rw-header">
          <div>
            <h1 className="rw-title">{work.title}</h1>
            <button
              className="rw-author"
              onClick={() => navigate(`/communities/${work.author}`)}
            >
              @{work.author}
            </button>
          </div>

          {isOwner && (
            <button
              className="rw-editBtn"
              onClick={() => navigate(`/works/edit/${encodeURIComponent(work.id)}`)}
            >
              Edit Work
            </button>
          )}
        </header>

        <main className="rw-body">
          {work.body || "This work has no content yet."}
        </main>

        <aside className="rw-side">
          <button title="Comments">💬</button>
          <button title="Chapters">📑</button>
          <button title="Music">🎵</button>
          <button title="Audio">🎧</button>
        </aside>

        <section className="rw-comments">
          <h2>Comments</h2>
          <p className="rw-placeholder">Comments coming soon.</p>
        </section>
      </div>
    </div>
  );
}
