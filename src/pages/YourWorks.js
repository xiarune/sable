import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./YourWorks.css";

const WORKS_KEY = "sable_published_v1";

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

function saveArray(key, arr) {
  try {
    localStorage.setItem(key, JSON.stringify(arr));
  } catch {
    // front end only
  }
}

function seedPublishedIfEmpty() {
  const existing = loadArray(WORKS_KEY);
  if (existing.length >= 5) return existing;

  const seeded = Array.from({ length: 5 }).map((_, i) => ({
    id: `w-seed-${i + 1}`,
    title: `Work ${i + 1}`,
    body: "",
    updatedAt: new Date().toISOString(),
  }));

  saveArray(WORKS_KEY, seeded);
  return seeded;
}

export default function YourWorks() {
  const navigate = useNavigate();
  const [works, setWorks] = React.useState([]);

  React.useEffect(() => {
    const seeded = seedPublishedIfEmpty();
    setWorks(seeded);
  }, []);

  function handleEdit(workId) {
    navigate(`/works/edit/${encodeURIComponent(workId)}`);
  }

  return (
    <div className="yw-page">
      <div className="yw-shell">
        <header className="yw-head">
          <div className="yw-headLeft">
            <h1 className="yw-title">Your Works</h1>
            <p className="yw-subtitle">Published works you can edit individually.</p>
          </div>

          <div className="yw-headRight">
            <button type="button" className="yw-topBtn" onClick={() => navigate("/profile")}>
              Back to Profile
            </button>
          </div>
        </header>

        <section className="yw-gridWrap" aria-label="Published works list">
          <div className="yw-grid">
            {works.slice(0, 5).map((w) => (
              <article key={String(w.id)} className="yw-card">
                <div className="yw-poster" aria-hidden="true" />

                <h2 className="yw-cardTitle">
                  <Link
                    to={`/works/${encodeURIComponent(w.id)}`}
                    style={{ color: "inherit", textDecoration: "none" }}
                    aria-label={`Open work: ${w.title || "Untitled"}`}
                  >
                    {w.title || "Untitled"}
                  </Link>
                </h2>

                <div className="yw-cardMeta">published</div>

                <button type="button" className="yw-cardBtn" onClick={() => handleEdit(w.id)}>
                  Edit
                </button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}







