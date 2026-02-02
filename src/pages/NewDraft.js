import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function NewDraft() {
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const draftId = params.get("draft");

    // If someone links to /new-draft?draft=ID, treat it as "edit that draft"
    if (draftId) {
      navigate(`/drafts/edit/${encodeURIComponent(draftId)}`, { replace: true });
      return;
    }

    // Otherwise, create a new draft
    navigate("/drafts/edit/new", { replace: true });
  }, [location.search, navigate]);

  // Keep this visually inert; routing happens immediately.
  return null;
}









