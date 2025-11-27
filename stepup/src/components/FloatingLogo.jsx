// src/components/FloatingLogo.jsx
import { useNavigate } from "react-router-dom";

export default function FloatingLogo() {
  const nav = useNavigate();

  const goHome = () => {
    nav("/home"); // 로고 누르면 홈으로 이동
  };

  // 인라인 스타일 (CSS 파일 필요 없음)
  const btnStyle = {
    position: "fixed",
    top: "16px",
    left: "16px",
    zIndex: 9999,
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 10px",
    borderRadius: "9999px",
    border: "none",
    background: "rgba(0,0,0,0.6)",
    color: "#fff",
    cursor: "pointer",
  };

  const imgStyle = {
    width: "24px",
    height: "24px",
    objectFit: "contain",
  };

  const textStyle = {
    fontWeight: 700,
    fontSize: "14px",
  };

  return (
    <button
      style={btnStyle}
      onClick={goHome}
      aria-label="StepUp 홈으로"
      title="StepUp 홈으로"
    >
      <img src="/logo.png" alt="" style={imgStyle} />
      <span style={textStyle}>StepUp</span>
    </button>
  );
}
