import React from "react";
import browseGraphic from "../assets/images/Browse_Graphic.png";
import "./BrowseOrnament.css";

/**
 * BrowseOrnament - Decorative ornament to display above browse page titles
 */
export default function BrowseOrnament({ className = "" }) {
  return (
    <div className={`browseOrnament ${className}`}>
      <img
        src={browseGraphic}
        alt=""
        className="browseOrnamentImg"
        aria-hidden="true"
      />
    </div>
  );
}
