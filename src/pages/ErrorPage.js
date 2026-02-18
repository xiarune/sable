import React from "react";
import { useNavigate } from "react-router-dom";
import "./ErrorPage.css";

import errorImg from "../assets/images/error.png";

export default function ErrorPage() {
  const navigate = useNavigate();

  function goHome() {
    navigate("/");
  }

  return (
    <div className="error-page">
      <div className="error-container">
        <div className="error-left">
          <img className="error-image" src={errorImg} alt="Error" />
        </div>

        <div className="error-right">
          <h1 className="error-title">Oops!</h1>
          <p className="error-message">
            The page you're looking for has been deleted or moved.
          </p>
          <button type="button" className="error-btn" onClick={goHome}>
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
}
