import React from "react";
import "./DropCapTitle.css";

// Import all drop cap images
import DropCapA from "../assets/images/Drop Caps/A.png";
import DropCapB from "../assets/images/Drop Caps/B.png";
import DropCapC from "../assets/images/Drop Caps/C.png";
import DropCapD from "../assets/images/Drop Caps/D.png";
import DropCapE from "../assets/images/Drop Caps/E.png";
import DropCapF from "../assets/images/Drop Caps/F.png";
import DropCapG from "../assets/images/Drop Caps/G.png";
import DropCapH from "../assets/images/Drop Caps/H.png";
import DropCapI from "../assets/images/Drop Caps/I.png";
import DropCapK from "../assets/images/Drop Caps/K.png";
import DropCapL from "../assets/images/Drop Caps/L.png";
import DropCapM from "../assets/images/Drop Caps/M.png";
import DropCapN from "../assets/images/Drop Caps/N.png";
import DropCapO from "../assets/images/Drop Caps/O.png";
import DropCapP from "../assets/images/Drop Caps/P.png";
import DropCapQ from "../assets/images/Drop Caps/Q.png";
import DropCapR from "../assets/images/Drop Caps/R.png";
import DropCapS from "../assets/images/Drop Caps/S.png";
import DropCapT from "../assets/images/Drop Caps/T.png";
import DropCapU from "../assets/images/Drop Caps/U.png";
import DropCapV from "../assets/images/Drop Caps/V.png";
import DropCapX from "../assets/images/Drop Caps/X.png";
import DropCapY from "../assets/images/Drop Caps/Y.png";
import DropCapZ from "../assets/images/Drop Caps/Z.png";

const dropCapMap = {
  A: DropCapA,
  B: DropCapB,
  C: DropCapC,
  D: DropCapD,
  E: DropCapE,
  F: DropCapF,
  G: DropCapG,
  H: DropCapH,
  I: DropCapI,
  J: DropCapI, // Use I as fallback for J
  K: DropCapK,
  L: DropCapL,
  M: DropCapM,
  N: DropCapN,
  O: DropCapO,
  P: DropCapP,
  Q: DropCapQ,
  R: DropCapR,
  S: DropCapS,
  T: DropCapT,
  U: DropCapU,
  V: DropCapV,
  W: DropCapV, // Use V as fallback for W (similar shape)
  X: DropCapX,
  Y: DropCapY,
  Z: DropCapZ,
};

/**
 * DropCapTitle - Renders a title with the first letter as a decorative drop cap
 *
 * @param {string} title - The title text
 * @param {string} className - Additional CSS classes for the container
 * @param {string} as - HTML element to use (h1, h2, etc.) - default h1
 * @param {string} variant - Style variant: "banner" (gold on dark) or "page" (dark on light)
 */
export default function DropCapTitle({
  title,
  className = "",
  as: Component = "h1",
  variant = "banner"
}) {
  if (!title || typeof title !== "string") {
    return null;
  }

  const firstChar = title.charAt(0).toUpperCase();
  const restOfTitle = title.slice(1);
  const dropCapSrc = dropCapMap[firstChar];

  // If no drop cap image exists for this letter, render normally
  if (!dropCapSrc) {
    return (
      <Component className={`dropCapTitle ${className}`}>
        {title}
      </Component>
    );
  }

  return (
    <Component className={`dropCapTitle dropCapTitle--${variant} ${className}`}>
      <span className="dropCapWrap">
        <img
          src={dropCapSrc}
          alt={firstChar}
          className="dropCapImg"
          aria-hidden="true"
        />
      </span>
      <span className="dropCapRest">{restOfTitle}</span>
    </Component>
  );
}
