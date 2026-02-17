import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./ErrorPage.css";

import errorImg from "../assets/images/error.png";

export default function ErrorPage({ code = "404", title, message }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine error details based on code
  const errorDetails = React.useMemo(() => {
    switch (code) {
      case "404":
        return {
          title: title || "Page Not Found",
          message: message || "The page you're looking for doesn't exist or has been moved.",
        };
      case "403":
        return {
          title: title || "Access Denied",
          message: message || "You don't have permission to view this page.",
        };
      case "500":
        return {
          title: title || "Server Error",
          message: message || "Something went wrong on our end. Please try again later.",
        };
      default:
        return {
          title: title || "Oops!",
          message: message || "Something unexpected happened.",
        };
    }
  }, [code, title, message]);

  function goHome() {
    navigate("/");
  }

  function goBack() {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  }

  return (
    <div className="error-page">
      <div className="error-container">
        <img className="error-image" src={errorImg} alt="Error" />

        <div className="error-code">{code}</div>

        <h1 className="error-title">{errorDetails.title}</h1>

        <p className="error-message">{errorDetails.message}</p>

        <p className="error-path">
          Requested: <code>{location.pathname}</code>
        </p>

        <div className="error-actions">
          <button type="button" className="error-btn error-btn--primary" onClick={goHome}>
            Go Home
          </button>
          <button type="button" className="error-btn error-btn--secondary" onClick={goBack}>
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
