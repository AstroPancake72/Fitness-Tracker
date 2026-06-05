import { useState } from "react";

const API = "http://localhost:5000";

function isObjectId(v) {
  return typeof v === "string" && /^[a-f\d]{24}$/i.test(v);
}

export function profileImageUrl(imageId) {
  return isObjectId(imageId) ? `${API}/api/profile/image/${imageId}` : null;
}

export default function Avatar({ imageId, size = 44, alt = "Profile" }) {
  const [failed, setFailed] = useState(false);
  const url = profileImageUrl(imageId);
  const showImg = url && !failed;

  const baseStyle = {
    width: size,
    height: size,
    borderRadius: "50%",
    flexShrink: 0,
    objectFit: "cover",
    border: "2px solid #38422B",
    background: "#CCD5C0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  };

  if (showImg) {
    return (
      <img
        src={url}
        alt={alt}
        style={baseStyle}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div style={baseStyle} aria-label={alt}>
      <span style={{ fontSize: size * 0.55, lineHeight: 1 }}>👤</span>
    </div>
  );
}
