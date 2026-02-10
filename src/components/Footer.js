import React from "react";
import { Link } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-brand">
          <div className="footer-logo">Sable</div>
          <p className="footer-tagline">Stories Worth Hearing</p>
        </div>

        <div className="footer-links">
          <div className="footer-column">
            <h4 className="footer-heading">Explore</h4>
            <Link to="/browse" className="footer-link">Browse</Link>
            <Link to="/genres" className="footer-link">Genres</Link>
            <Link to="/fandoms" className="footer-link">Fandoms</Link>
            <Link to="/tags" className="footer-link">Tags</Link>
          </div>

          <div className="footer-column">
            <h4 className="footer-heading">Community</h4>
            <Link to="/communities" className="footer-link">Communities</Link>
            <Link to="/search" className="footer-link">Search</Link>
          </div>

          <div className="footer-column">
            <h4 className="footer-heading">About</h4>
            <Link to="/about" className="footer-link">About Sable</Link>
            <Link to="/faq" className="footer-link">FAQ</Link>
            <Link to="/support" className="footer-link">Support Us</Link>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p className="footer-copyright">
          &copy; {currentYear} Sable. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
