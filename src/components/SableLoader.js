import React from "react";
import Lottie from "lottie-react";
import loadingAnimation from "../assets/Loading_Screen_1_Gold_Version.json";
import "./SableLoader.css";

/**
 * Sable Loading Animation
 * Centered Lottie animation that loops until content loads
 */
export default function SableLoader({ size = "large", fullPage = true }) {
  const sizeMap = {
    small: 120,
    medium: 200,
    large: 300,
  };

  const dimensions = sizeMap[size] || sizeMap.medium;

  if (fullPage) {
    return (
      <div className="sableLoader sableLoader--fullPage">
        <div className="sableLoaderInner">
          <Lottie
            animationData={loadingAnimation}
            loop={true}
            style={{ width: dimensions, height: dimensions }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="sableLoader">
      <Lottie
        animationData={loadingAnimation}
        loop={true}
        style={{ width: dimensions, height: dimensions }}
      />
    </div>
  );
}
