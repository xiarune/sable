import React from "react";
import { useNavigate } from "react-router-dom";
import "./About.css";

export default function About() {
  const navigate = useNavigate();

  return (
    <section className="aboutPage" aria-label="About Sable">
      <div className="aboutInner">
        <div className="aboutGrid">
          <div className="aboutMain">
            <h1 className="aboutTitle">ABOUT SABLE</h1>

            <p className="aboutBody">
              Sable is a community-driven writing platform built for people who care about craft, atmosphere, and discovering stories the
              same way you’d find a book you can’t put down. Browse by genre, fandom, or tags, publish works, and keep drafts in
              progress—configured around a clean reading experience.
            </p>

            <p className="aboutBody">
              The goal is simple: make it easy to write, easy to share, and easy to find the kind of stories you actually want to read—without
              drowning in noise. Communities help you connect around themes and niches, and bookmarks let you save what you want to come back to.
            </p>

            <p className="aboutBody">
              Sable is currently a front-end demo using mock data and prototype interactions. We’re building toward a full release with real
              accounts, publishing workflows, and richer discovery.
            </p>
          </div>

          <aside className="aboutSupport" aria-label="Support Sable">
            <h2 className="aboutSupportTitle">
              LIKE WHAT WE DO?
              <br />
              SUPPORT US!
            </h2>

            <p className="aboutSupportBody">
              This is a student-built prototype—support helps keep the project moving, improves accessibility, and funds better assets,
              testing, and polish.
            </p>

            <button type="button" className="aboutSupportBtn" onClick={() => navigate("/support")}>
              Support Sable
            </button>
          </aside>
        </div>
      </div>
    </section>
  );
}

